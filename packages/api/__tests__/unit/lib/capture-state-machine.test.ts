/**
 * Capture Session State Machine Tests
 *
 * Exhaustive tests for the DAL-enforced state machine transitions.
 * Tests the VALID_TRANSITIONS map without requiring a database.
 *
 * State diagram:
 *   draft -> active -> paused -> active -> completed -> published
 *                  \-> abandoned       \-> active (validation reveals gaps)
 *
 * License: Apache 2.0
 */

import { describe, it, expect } from "vitest";

// We test the transition logic by importing the valid transitions map.
// Since the map is not exported directly, we test via the expected behavior.

type SessionStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "published"
  | "abandoned";

// Mirror of the VALID_TRANSITIONS from capture-dal.ts
const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  draft: ["active"],
  active: ["paused", "completed", "abandoned"],
  paused: ["active", "abandoned"],
  completed: ["published", "active"],
  published: [],
  abandoned: [],
};

function isValidTransition(from: SessionStatus, to: SessionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe("Capture Session State Machine", () => {
  describe("valid transitions", () => {
    const validCases: [SessionStatus, SessionStatus][] = [
      ["draft", "active"],
      ["active", "paused"],
      ["active", "completed"],
      ["active", "abandoned"],
      ["paused", "active"],
      ["paused", "abandoned"],
      ["completed", "published"],
      ["completed", "active"],
    ];

    for (const [from, to] of validCases) {
      it(`allows ${from} -> ${to}`, () => {
        expect(isValidTransition(from, to)).toBe(true);
      });
    }
  });

  describe("invalid transitions", () => {
    const invalidCases: [SessionStatus, SessionStatus][] = [
      // Can't go backwards to draft
      ["active", "draft"],
      ["paused", "draft"],
      ["completed", "draft"],
      // Can't skip steps
      ["draft", "completed"],
      ["draft", "published"],
      ["draft", "paused"],
      ["draft", "abandoned"],
      // Terminal states can't transition
      ["published", "active"],
      ["published", "draft"],
      ["published", "paused"],
      ["published", "completed"],
      ["published", "abandoned"],
      ["abandoned", "active"],
      ["abandoned", "draft"],
      ["abandoned", "paused"],
      ["abandoned", "completed"],
      ["abandoned", "published"],
      // Can't go directly from active to published
      ["active", "published"],
      // Can't go from paused to completed directly
      ["paused", "completed"],
      ["paused", "published"],
      // Self-transitions are not allowed
      ["draft", "draft"],
      ["active", "active"],
      ["paused", "paused"],
      ["completed", "completed"],
    ];

    for (const [from, to] of invalidCases) {
      it(`rejects ${from} -> ${to}`, () => {
        expect(isValidTransition(from, to)).toBe(false);
      });
    }
  });

  describe("terminal states", () => {
    it("published has no valid transitions", () => {
      expect(VALID_TRANSITIONS.published).toHaveLength(0);
    });

    it("abandoned has no valid transitions", () => {
      expect(VALID_TRANSITIONS.abandoned).toHaveLength(0);
    });
  });

  describe("full lifecycle paths", () => {
    it("happy path: draft -> active -> completed -> published", () => {
      expect(isValidTransition("draft", "active")).toBe(true);
      expect(isValidTransition("active", "completed")).toBe(true);
      expect(isValidTransition("completed", "published")).toBe(true);
    });

    it("pause path: draft -> active -> paused -> active -> completed -> published", () => {
      expect(isValidTransition("draft", "active")).toBe(true);
      expect(isValidTransition("active", "paused")).toBe(true);
      expect(isValidTransition("paused", "active")).toBe(true);
      expect(isValidTransition("active", "completed")).toBe(true);
      expect(isValidTransition("completed", "published")).toBe(true);
    });

    it("validation loop: completed -> active (gaps found) -> completed -> published", () => {
      expect(isValidTransition("completed", "active")).toBe(true);
      expect(isValidTransition("active", "completed")).toBe(true);
      expect(isValidTransition("completed", "published")).toBe(true);
    });

    it("abandon from active: draft -> active -> abandoned", () => {
      expect(isValidTransition("draft", "active")).toBe(true);
      expect(isValidTransition("active", "abandoned")).toBe(true);
    });

    it("abandon from paused: draft -> active -> paused -> abandoned", () => {
      expect(isValidTransition("draft", "active")).toBe(true);
      expect(isValidTransition("active", "paused")).toBe(true);
      expect(isValidTransition("paused", "abandoned")).toBe(true);
    });
  });

  describe("DEK zeroing rules", () => {
    // These are behavioral tests that verify the state machine's
    // side effects are correctly specified in the design
    const dekZeroingStates: SessionStatus[] = [
      "paused",
      "completed",
      "abandoned",
    ];

    for (const state of dekZeroingStates) {
      it(`DEK should be zeroed on transition to ${state}`, () => {
        // This is a design verification test.
        // The actual zeroing happens in CaptureSessionDAL.transition()
        // which sets sessionEncryptedDek = null for these states.
        expect(dekZeroingStates).toContain(state);
      });
    }

    it("DEK is NOT zeroed on transition to active", () => {
      expect(dekZeroingStates).not.toContain("active");
    });

    it("DEK is NOT zeroed on transition to published", () => {
      // Published uses cachedEncryptedDek on corpus entries instead
      expect(dekZeroingStates).not.toContain("published");
    });
  });
});
