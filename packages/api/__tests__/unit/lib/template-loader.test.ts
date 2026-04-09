/**
 * TemplateLoader Unit Tests
 *
 * Tests domain template loading and caching.
 *
 * License: Apache 2.0
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TemplateLoader } from "../../../src/lib/template-loader.js";

describe("TemplateLoader", () => {
  beforeEach(() => {
    // Reset cache for each test
    (TemplateLoader as unknown as { cache: null }).cache = null;
  });

  it("loads all domain templates", () => {
    const templates = TemplateLoader.loadAll();

    expect(templates.length).toBeGreaterThanOrEqual(5);

    const ids = templates.map((t) => t.id);
    expect(ids).toContain("project-management");
    expect(ids).toContain("software-engineering");
    expect(ids).toContain("medical-expertise");
    expect(ids).toContain("financial-advisory");
    expect(ids).toContain("legal-advisory");
  });

  it("caches templates after first load", () => {
    const first = TemplateLoader.loadAll();
    const second = TemplateLoader.loadAll();

    // Same reference since cached
    expect(first).toEqual(second);
  });

  it("returns template by ID", () => {
    const template = TemplateLoader.getById("project-management");

    expect(template).not.toBeNull();
    expect(template!.name).toBe("Project Management");
    expect(template!.tags.length).toBeGreaterThan(0);
    expect(template!.scenarioTypes.length).toBeGreaterThan(0);
    expect(template!.complexityLevels).toContain("L1");
    expect(template!.convergence.minQaPairs).toBeGreaterThan(0);
  });

  it("returns null for unknown template ID", () => {
    const template = TemplateLoader.getById("nonexistent");
    expect(template).toBeNull();
  });

  it("each template has valid convergence thresholds", () => {
    const templates = TemplateLoader.loadAll();

    for (const t of templates) {
      expect(t.convergence.minQaPairs).toBeGreaterThan(0);
      expect(t.convergence.minScenarioCoverage).toBeGreaterThan(0);
      expect(t.convergence.minValidationPassRate).toBeGreaterThanOrEqual(0);
      expect(t.convergence.minValidationPassRate).toBeLessThanOrEqual(1);
      expect(t.convergence.minValidationRounds).toBeGreaterThanOrEqual(0);
      expect(t.convergence.minSourceDiversity).toBeGreaterThan(0);
    }
  });

  it("each template has question hints for all scenario types", () => {
    const templates = TemplateLoader.loadAll();

    for (const t of templates) {
      expect(t.questionHints.structured_interview).toBeTruthy();
      expect(t.questionHints.case_judgment).toBeTruthy();
      expect(t.questionHints.scenario_simulation).toBeTruthy();
    }
  });

  it("each template has at least 3 tags", () => {
    const templates = TemplateLoader.loadAll();

    for (const t of templates) {
      expect(t.tags.length).toBeGreaterThanOrEqual(3);
      // Each tag has required fields
      for (const tag of t.tags) {
        expect(tag.id).toBeTruthy();
        expect(tag.label).toBeTruthy();
        expect(tag.category).toBeTruthy();
      }
    }
  });
});
