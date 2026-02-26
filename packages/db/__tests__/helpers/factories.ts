import { faker } from "@faker-js/faker";
import type {
  SkillPackageInsert,
  SkillPackageInstallationInsert,
  SkillMintInsert,
  UserInsert,
} from "../../src/schema/skill-packages.js";

export class SkillPackageFactory {
  static create(
    overrides: Partial<SkillPackageInsert> = {},
  ): SkillPackageInsert {
    const now = Date.now();
    const packageId = faker.string.alphanumeric(10);

    return {
      id: `spkg_${now}_${faker.string.alphanumeric(6)}`,
      packageId,
      version: faker.system.semver(),
      displayName: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      readme: faker.lorem.paragraphs(3),
      author: `usr_${faker.string.alphanumeric(8)}`,
      authorName: faker.person.fullName(),
      authorUrl: faker.internet.url(),
      license: faker.helpers.arrayElement([
        "open-source",
        "free",
        "premium",
        "enterprise",
      ]),
      priceUsd: String(
        faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
      ),
      requiresApiKey: faker.datatype.boolean(),
      apiKeyInstructions: null,
      category: faker.helpers.arrayElement([
        "development",
        "communication",
        "productivity",
        "research",
        "integration",
        "data",
        "automation",
        "security",
        "ai-ml",
        "personality",
        "wisdom",
        "voice",
        "likeness",
        "other",
      ]),
      maturity: faker.helpers.arrayElement([
        "experimental",
        "beta",
        "stable",
        "deprecated",
      ]),
      tags: faker.helpers.arrayElements(
        ["ai", "productivity", "api", "tool"],
        3,
      ),
      minRuntimeVersion: "0.1.0",
      requiredTier: faker.number.int({ min: 0, max: 3 }),
      mcpTransport: faker.helpers.arrayElement(["stdio", "http", "sse"]),
      mcpCommand: "npx @example/mcp-server",
      mcpUrl: null,
      systemDependencies: null,
      packageDependencies: null,
      installCount: 0,
      rating: "0",
      ratingCount: 0,
      reviewCount: 0,
      origin: "manual",
      icon: null,
      repositoryUrl: faker.internet.url(),
      homepageUrl: faker.internet.url(),
      createdAt: now,
      updatedAt: now,
      releasedAt: now,
      ...overrides,
    };
  }
}

export class SkillInstallationFactory {
  static create(
    packageId: string,
    overrides: Partial<SkillPackageInstallationInsert> = {},
  ): SkillPackageInstallationInsert {
    const now = Date.now();
    return {
      id: `sinst_${now}_${faker.string.alphanumeric(6)}`,
      packageId,
      packageVersion: faker.system.semver(),
      agentId: `agt_${faker.string.alphanumeric(8)}`,
      userId: `usr_${faker.string.alphanumeric(8)}`,
      status: "active",
      enabled: true,
      configuration: null,
      errorMessage: null,
      installedAt: now,
      uninstalledAt: null,
      ...overrides,
    };
  }
}

export class SkillMintFactory {
  static create(
    skillPackageId: string,
    overrides: Partial<SkillMintInsert> = {},
  ): SkillMintInsert {
    const now = Date.now();
    const rarity = overrides.rarity || "common";
    return {
      id: `smint_${now}_${faker.string.alphanumeric(6)}`,
      skillPackageId,
      rarity,
      maxEditions:
        rarity === "common" ? null : faker.number.int({ min: 10, max: 1000 }),
      mintedCount: 0,
      creatorId: `usr_${faker.string.alphanumeric(8)}`,
      creatorRoyaltyPercent: "70.00",
      graduationCertificate: null,
      origin: "manual",
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }
}

export class UserFactory {
  static create(overrides: Partial<UserInsert> = {}): UserInsert {
    const now = Date.now();
    const githubUsername = faker.internet.userName();
    return {
      id: `usr_${now}_${faker.string.alphanumeric(6)}`,
      githubId: String(faker.number.int({ min: 10000, max: 99999999 })),
      githubUsername,
      displayName: faker.person.fullName(),
      avatarUrl: faker.image.avatar(),
      bio: faker.lorem.sentence(),
      tier: faker.helpers.arrayElement(["free", "pro", "epic", "legendary"]),
      role: "user",
      totalPackages: 0,
      totalInstalls: 0,
      totalRoyaltiesUsd: "0",
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      ...overrides,
    };
  }
}
