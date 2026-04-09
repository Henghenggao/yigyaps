/**
 * YigYaps Coverage Tracker
 *
 * Evaluates whether a skill's captured knowledge meets the convergence
 * thresholds defined in its domain template. Used as the publish gate:
 * a skill cannot be published until coverage requirements are met.
 *
 * License: Apache 2.0
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@yigyaps/db";
import { SkillCorpusDAL, SkillTestDAL } from "@yigyaps/db";
import type { DomainTemplate } from "./template-loader.js";

// ── Types ────────────────────────────────────────────────────────────────

export interface CoverageGap {
  dimension: string;
  required: number;
  actual: number;
  label: string;
}

export interface CoverageReport {
  ready: boolean;
  totalQaPairs: number;
  gaps: CoverageGap[];
  scenarioCoverage: number;
  validationPassRate: number;
  validationRounds: number;
  sourceDiversity: number;
}

// ── Coverage Tracker ────────────────────────────────────────────────────

export class CoverageTracker {
  /**
   * Check whether a skill meets its domain template's convergence thresholds.
   * Returns a detailed report with specific gaps if not ready.
   */
  static async checkConvergence(
    db: NodePgDatabase<typeof schema>,
    skillPackageId: string,
    template: DomainTemplate,
  ): Promise<CoverageReport> {
    const corpusDAL = new SkillCorpusDAL(db);
    const testDAL = new SkillTestDAL(db);

    const [stats, passRateData] = await Promise.all([
      corpusDAL.getCoverageStats(skillPackageId),
      testDAL.getPassRate(skillPackageId),
    ]);

    const gaps: CoverageGap[] = [];
    const thresholds = template.convergence;

    // 1. Minimum QA pairs
    if (stats.totalQaPairs < thresholds.minQaPairs) {
      gaps.push({
        dimension: "qa_pairs",
        required: thresholds.minQaPairs,
        actual: stats.totalQaPairs,
        label: `Need ${thresholds.minQaPairs - stats.totalQaPairs} more QA pairs`,
      });
    }

    // 2. Scenario coverage: count how many distinct scenario types have at least 1 entry
    const coveredScenarios = Object.keys(stats.scenarioTypeCounts).length;
    if (coveredScenarios < thresholds.minScenarioCoverage) {
      const missingScenarios = template.scenarioTypes
        .filter((s) => !stats.scenarioTypeCounts[s.id])
        .map((s) => s.label);
      gaps.push({
        dimension: "scenario_coverage",
        required: thresholds.minScenarioCoverage,
        actual: coveredScenarios,
        label: `Missing scenarios: ${missingScenarios.join(", ")}`,
      });
    }

    // 3. Validation pass rate
    const passRate = passRateData.passRate;
    if (passRateData.total > 0 && passRate < thresholds.minValidationPassRate) {
      gaps.push({
        dimension: "validation_pass_rate",
        required: thresholds.minValidationPassRate,
        actual: passRate,
        label: `Pass rate ${(passRate * 100).toFixed(0)}% below threshold ${(thresholds.minValidationPassRate * 100).toFixed(0)}%`,
      });
    }

    // 4. Minimum validation rounds (at least N test records exist)
    const validationRounds = passRateData.total;
    if (validationRounds < thresholds.minValidationRounds) {
      gaps.push({
        dimension: "validation_rounds",
        required: thresholds.minValidationRounds,
        actual: validationRounds,
        label: `Need ${thresholds.minValidationRounds - validationRounds} more validation tests`,
      });
    }

    // 5. Source diversity: number of distinct sources
    const sourceDiversity = Object.keys(stats.sourceCounts).length;
    if (sourceDiversity < thresholds.minSourceDiversity) {
      gaps.push({
        dimension: "source_diversity",
        required: thresholds.minSourceDiversity,
        actual: sourceDiversity,
        label: `Need ${thresholds.minSourceDiversity - sourceDiversity} more source types`,
      });
    }

    return {
      ready: gaps.length === 0,
      totalQaPairs: stats.totalQaPairs,
      gaps,
      scenarioCoverage: coveredScenarios,
      validationPassRate: passRate,
      validationRounds,
      sourceDiversity,
    };
  }
}
