/**
 * YAP Types
 *
 * A YAP is a top-level skills-pack plugin container. It can later be composed
 * from a core Skill Pack plus mounted extension packs.
 *
 * License: Apache 2.0
 */

export type YapVisibility = "public" | "private" | "unlisted";
export type YapStatus = "draft" | "active" | "archived";

export interface Yap {
  id: string;
  slug: string;
  version: string;
  displayName: string;
  description: string;
  readme: string | null;
  ownerId: string;
  ownerName: string;
  category: string;
  tags: string[];
  visibility: YapVisibility;
  status: YapStatus;
  assemblyConfig: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  releasedAt: number;
}

export interface YapSearchQuery {
  query?: string;
  category?: string;
  visibility?: YapVisibility;
  status?: YapStatus;
  limit?: number;
  offset?: number;
}

export interface YapSearchResult {
  yaps: Yap[];
  total: number;
  limit: number;
  offset: number;
}
