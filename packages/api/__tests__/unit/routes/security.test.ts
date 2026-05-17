import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { securityRoutes } from "../../../src/routes/security.js";
import {
  EXPERT_SHARE_HEADER,
  SHAMIR_ONLY_ENCRYPTED_DEK,
} from "../../../src/lib/dek-policy.js";
import { KMS } from "../../../src/lib/kms.js";
import { ShamirManager } from "../../../src/lib/shamir.js";

const mocks = vi.hoisted(() => ({
  currentUser: {
    userId: "author-1",
    userName: "Author One",
    tier: "free" as const,
    role: "user" as const,
    authMethod: "jwt" as const,
  },
  getByPackageId: vi.fn(),
  checkQuota: vi.fn(),
  recordInvocation: vi.fn(),
  logEvent: vi.fn(),
  invokeCorpus: vi.fn(),
  AnthropicProvider: vi.fn(function MockAnthropicProvider(
    this: { config?: { apiKey: string } },
    config: { apiKey: string },
  ) {
    this.config = config;
  }),
}));

vi.mock("../../../src/middleware/auth-v2.js", () => ({
  requireAuth: () => async (request: { user?: typeof mocks.currentUser }) => {
    request.user = mocks.currentUser;
  },
}));

vi.mock("../../../src/middleware/metering.js", () => ({
  checkQuota: mocks.checkQuota,
  recordInvocation: mocks.recordInvocation,
}));

vi.mock("../../../src/lib/audit-logger.js", () => ({
  AuditLogger: {
    logEvent: mocks.logEvent,
  },
}));

vi.mock("../../../src/lib/env.js", () => ({
  env: {
    ANTHROPIC_API_KEY: "test-anthropic-key",
  },
}));

vi.mock("../../../src/lib/inference-engine.js", () => ({
  InferenceEngine: {
    invoke: mocks.invokeCorpus,
  },
}));

vi.mock("../../../src/lib/llm-provider.js", () => ({
  AnthropicProvider: mocks.AnthropicProvider,
}));

vi.mock("@yigyaps/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@yigyaps/db")>();

  return {
    ...actual,
    SkillPackageDAL: class {
      getByPackageId = mocks.getByPackageId;
    },
  };
});

describe("security routes", () => {
  beforeEach(() => {
    mocks.getByPackageId.mockResolvedValue({
      id: "pkg-internal-1",
      packageId: "expert-skill",
      author: "author-1",
      displayName: "Expert Skill",
      knowledgeType: "rules",
    });
    mocks.checkQuota.mockResolvedValue({
      allowed: true,
      costUsd: 0.05,
      creatorRoyaltyUsd: 0.035,
      isOverage: true,
    });
    mocks.recordInvocation.mockResolvedValue(undefined);
    mocks.logEvent.mockResolvedValue(undefined);
    mocks.invokeCorpus.mockResolvedValue({
      text: "Corpus answer",
      inferenceMs: 12,
      qaCount: 3,
      leakageBlocked: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requires the expert share header before returning Shamir-protected rules", async () => {
    const fixture = makeEncryptedKnowledgeFixture("private rule notes");
    const fastify = await buildServer([
      [fixture.knowledgeRecord],
      [fixture.platformShare],
    ]);

    const res = await fastify.inject({
      method: "GET",
      url: "/v1/security/knowledge/expert-skill",
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: "Shamir Share Required",
    });
    expect(res.json().message).toContain(EXPERT_SHARE_HEADER);

    await fastify.close();
  });

  it("returns plaintext author rules when a valid expert share header is provided", async () => {
    const fixture = makeEncryptedKnowledgeFixture("private rule notes");
    const fastify = await buildServer([
      [fixture.knowledgeRecord],
      [fixture.platformShare],
    ]);

    const res = await fastify.inject({
      method: "GET",
      url: "/v1/security/knowledge/expert-skill",
      headers: {
        [EXPERT_SHARE_HEADER]: fixture.expertShare,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      plaintextRules: "private rule notes",
      key_mode: "shamir",
    });

    await fastify.close();
  });

  it("requires expert_share in the invoke body before decrypting Shamir rules", async () => {
    const fixture = makeEncryptedKnowledgeFixture("Use practical expert judgment.");
    const fastify = await buildServer([
      [],
      [fixture.knowledgeRecord],
      [fixture.platformShare],
    ]);

    const res = await fastify.inject({
      method: "POST",
      url: "/v1/security/invoke/expert-skill",
      payload: {
        user_query: "Should I use this approach?",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: "Shamir Share Required",
    });
    expect(mocks.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skillPackageId: "pkg-internal-1",
        apiClientId: "author-1",
        conclusionText:
          "blocked:dek-recovery:rules:SHAMIR_SHARE_REQUIRED",
      }),
    );
    expect(mocks.recordInvocation).not.toHaveBeenCalled();

    await fastify.close();
  });

  it("invokes local rules and records durable audit/usage after expert_share recovery", async () => {
    const fixture = makeEncryptedKnowledgeFixture("Use practical expert judgment.");
    const fastify = await buildServer([
      [],
      [fixture.knowledgeRecord],
      [fixture.platformShare],
    ]);

    const res = await fastify.inject({
      method: "POST",
      url: "/v1/security/invoke/expert-skill",
      payload: {
        user_query: "Should I use this approach?",
        expert_share: fixture.expertShare,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      mode: "local",
    });
    expect(res.json().privacy_notice).toContain("LOCAL MODE");
    expect(mocks.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skillPackageId: "pkg-internal-1",
        apiClientId: "author-1",
      }),
      { failClosed: true },
    );
    expect(mocks.recordInvocation).toHaveBeenCalledWith(
      expect.anything(),
      "author-1",
      "pkg-internal-1",
      expect.objectContaining({ allowed: true }),
    );

    await fastify.close();
  });

  it("requires expert_share before corpus inference can decrypt captured knowledge", async () => {
    mocks.getByPackageId.mockResolvedValueOnce({
      id: "pkg-internal-1",
      packageId: "expert-skill",
      author: "author-1",
      displayName: "Expert Skill",
      knowledgeType: "corpus",
    });
    const fixture = makeEncryptedKnowledgeFixture("Corpus secret");
    const fastify = await buildServer([
      [],
      [fixture.platformShare],
      [],
    ]);

    const res = await fastify.inject({
      method: "POST",
      url: "/v1/security/invoke/expert-skill",
      payload: {
        user_query: "What should I do?",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: "Shamir Share Required",
      message: "Provide expert_share to invoke this corpus skill.",
    });
    expect(mocks.invokeCorpus).not.toHaveBeenCalled();
    expect(mocks.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skillPackageId: "pkg-internal-1",
        apiClientId: "author-1",
        conclusionText:
          "blocked:dek-recovery:corpus:SHAMIR_SHARE_REQUIRED",
      }),
    );
    expect(mocks.recordInvocation).not.toHaveBeenCalled();

    await fastify.close();
  });

  it("runs corpus inference only after expert_share recovery and returns leakage status", async () => {
    mocks.getByPackageId.mockResolvedValueOnce({
      id: "pkg-internal-1",
      packageId: "expert-skill",
      author: "author-1",
      displayName: "Expert Skill",
      knowledgeType: "corpus",
    });
    const fixture = makeEncryptedKnowledgeFixture("Corpus secret");
    const fastify = await buildServer([
      [],
      [fixture.platformShare],
      [],
    ]);

    const res = await fastify.inject({
      method: "POST",
      url: "/v1/security/invoke/expert-skill",
      payload: {
        user_query: "What should I do?",
        expert_share: fixture.expertShare,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      conclusion: "Corpus answer",
      mode: "corpus",
      qa_count: 3,
      inference_ms: 12,
      leakage_blocked: false,
    });
    expect(res.json().privacy_notice).toContain("CORPUS MODE");
    expect(mocks.AnthropicProvider).toHaveBeenCalledWith({
      apiKey: "test-anthropic-key",
    });
    expect(mocks.invokeCorpus).toHaveBeenCalledWith(
      expect.objectContaining({
        skillPackageId: "pkg-internal-1",
        userQuery: "What should I do?",
        skillName: "Expert Skill",
        dek: expect.any(Buffer),
      }),
    );
    expect(mocks.logEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skillPackageId: "pkg-internal-1",
        apiClientId: "author-1",
        conclusionText: "Corpus answer",
        inferenceMs: 12,
      }),
      { failClosed: true },
    );
    expect(mocks.recordInvocation).toHaveBeenCalledWith(
      expect.anything(),
      "author-1",
      "pkg-internal-1",
      expect.objectContaining({ allowed: true }),
    );

    await fastify.close();
  });
});

async function buildServer(selectResults: unknown[][]): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });
  fastify.decorate("db", createQueuedDb(selectResults));
  await fastify.register(securityRoutes, { prefix: "/v1/security" });
  return fastify;
}

function makeEncryptedKnowledgeFixture(plaintextRules: string) {
  const dek = KMS.generateDek();
  const { shares } = ShamirManager.split(dek.toString("hex"));

  return {
    expertShare: shares[1],
    platformShare: {
      shareIndex: 1,
      shareData: shares[0],
    },
    knowledgeRecord: {
      encryptedDek: SHAMIR_ONLY_ENCRYPTED_DEK,
      contentCiphertext: KMS.encryptKnowledge(plaintextRules, dek),
    },
  };
}

function createQueuedDb(selectResults: unknown[][]) {
  const queuedSelectResults = [...selectResults];

  return {
    select: vi.fn(() =>
      createSelectBuilder(() => queuedSelectResults.shift() ?? []),
    ),
  };
}

function createSelectBuilder(resolveResult: () => unknown[]) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(async () => resolveResult()),
    then: (
      onFulfilled: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(resolveResult()).then(onFulfilled, onRejected),
  };

  return builder;
}
