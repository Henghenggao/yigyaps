/**
 * YigYaps Registry Types — MCP Registry Standard
 *
 * Types for the MCP Registry discovery protocol.
 * YigYaps implements the .well-known/mcp.json discovery endpoint,
 * making it auto-discoverable by any MCP-compatible client.
 *
 * @see https://spec.modelcontextprotocol.io/specification/server/registry/
 *
 * License: Apache 2.0
 */

/**
 * MCP Registry discovery entry (/.well-known/mcp.json shape).
 */
export interface McpRegistryEntry {
  name: string;
  description: string;
  url: string;
  version: string;
}

/**
 * MCP Registry discovery document.
 * Returned by GET /.well-known/mcp.json
 */
export interface McpRegistryDiscovery {
  registries: McpRegistryEntry[];
}

/**
 * API response wrapper for paginated list endpoints.
 */
export interface ApiListResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * API error response shape.
 */
export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Published skill package creation request.
 * Used for POST /v1/packages
 */
export interface PublishSkillRequest {
  packageId: string;
  version: string;
  displayName: string;
  description: string;
  readme?: string;
  authorName: string;
  authorUrl?: string;
  license: "open-source" | "free" | "premium" | "enterprise";
  priceUsd?: number;
  requiresApiKey?: boolean;
  apiKeyInstructions?: string;
  category: string;
  maturity?: "experimental" | "beta" | "stable" | "deprecated";
  tags?: string[];
  minYigcoreVersion?: string;
  requiredTier?: number;
  mcpTransport?: "stdio" | "http" | "sse";
  mcpCommand?: string;
  mcpUrl?: string;
  icon?: string;
  repositoryUrl?: string;
  homepageUrl?: string;
}
