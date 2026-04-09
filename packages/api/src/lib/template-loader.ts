/**
 * YigYaps Domain Template Loader
 *
 * Loads and caches domain template JSON files that define interview parameters,
 * convergence thresholds, and question hints for each professional domain.
 *
 * License: Apache 2.0
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// ── Types ────────────────────────────────────────────────────────────────

export interface DomainTemplate {
  id: string;
  name: string;
  description: string;
  tags: Array<{ id: string; label: string; category: string }>;
  scenarioTypes: Array<{ id: string; label: string }>;
  complexityLevels: string[];
  convergence: {
    minQaPairs: number;
    minScenarioCoverage: number;
    minValidationPassRate: number;
    minValidationRounds: number;
    minSourceDiversity: number;
  };
  questionHints: {
    structured_interview: string;
    case_judgment: string;
    scenario_simulation: string;
  };
}

// ── Template Loader ──────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Resolve to package root (works from both src/lib/ and dist/lib/),
// then always read from src/templates/domains/ where the JSON files live.
const PKG_ROOT = join(__dirname, "..", "..");
const TEMPLATES_DIR = join(PKG_ROOT, "src", "templates", "domains");

export class TemplateLoader {
  private static cache: Map<string, DomainTemplate> | null = null;

  /**
   * Loads all domain template JSON files from the templates/domains directory.
   * Results are cached after first load.
   */
  static loadAll(): DomainTemplate[] {
    if (TemplateLoader.cache) {
      return Array.from(TemplateLoader.cache.values());
    }

    const cache = new Map<string, DomainTemplate>();

    if (!existsSync(TEMPLATES_DIR)) {
      TemplateLoader.cache = cache;
      return [];
    }

    const files = readdirSync(TEMPLATES_DIR).filter((f) =>
      f.endsWith(".json"),
    );

    for (const file of files) {
      try {
        const raw = readFileSync(join(TEMPLATES_DIR, file), "utf-8");
        const template = JSON.parse(raw) as DomainTemplate;
        cache.set(template.id, template);
      } catch {
        // Skip malformed files — don't crash the server
        console.warn(`⚠️ Failed to load domain template: ${file}`);
      }
    }

    TemplateLoader.cache = cache;
    return Array.from(cache.values());
  }

  /**
   * Returns a single template by ID, or null if not found.
   */
  static getById(id: string): DomainTemplate | null {
    // Ensure templates are loaded
    if (!TemplateLoader.cache) {
      TemplateLoader.loadAll();
    }
    return TemplateLoader.cache!.get(id) ?? null;
  }
}
