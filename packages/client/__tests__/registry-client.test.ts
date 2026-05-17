import { beforeEach, describe, expect, it, vi } from "vitest";
import { YigYapsRegistryClient } from "../src/registry-client.js";

const fetchMock = vi.fn();

describe("YigYapsRegistryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ rules: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("fetches rules by public hyphenated packageId", async () => {
    const client = new YigYapsRegistryClient({ baseUrl: "https://api.test" });

    await client.getRules("legal-contract-reviewer");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/v1/packages/by-pkg/legal-contract-reviewer/rules",
      expect.anything(),
    );
  });

  it("fetches rules by internal spkg id", async () => {
    const client = new YigYapsRegistryClient({ baseUrl: "https://api.test" });

    await client.getRules("spkg_123_abcdef");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/v1/packages/spkg_123_abcdef/rules",
      expect.anything(),
    );
  });
});
