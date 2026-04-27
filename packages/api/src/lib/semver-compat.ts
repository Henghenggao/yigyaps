/**
 * Lightweight semver range checks for compatibility declarations.
 *
 * Supports the range forms used by SkillPack Bridge manifests:
 * exact versions, comparator sets such as ">=0.7.0 <1.0.0", caret, tilde,
 * and wildcard ranges.
 *
 * License: Apache 2.0
 */

interface Semver {
  major: number;
  minor: number;
  patch: number;
}

export function satisfiesVersionRange(version: string, range: string): boolean {
  const parsedVersion = parseSemver(version);
  if (!parsedVersion) return false;

  const trimmedRange = range.trim();
  if (!trimmedRange || isWildcard(trimmedRange)) return true;

  return trimmedRange
    .split("||")
    .some((part) => satisfiesComparatorSet(parsedVersion, part));
}

function satisfiesComparatorSet(version: Semver, range: string): boolean {
  const normalized = range.replace(/,/g, " ").trim();
  if (!normalized || isWildcard(normalized)) return true;

  const comparators = normalized.split(/\s+/).filter(Boolean);
  return comparators.every((comparator) =>
    satisfiesComparator(version, comparator),
  );
}

function satisfiesComparator(version: Semver, comparator: string): boolean {
  if (isWildcard(comparator)) return true;

  if (comparator.startsWith("^")) {
    return satisfiesCaret(version, comparator.slice(1));
  }
  if (comparator.startsWith("~")) {
    return satisfiesTilde(version, comparator.slice(1));
  }

  const match = comparator.match(/^(>=|<=|>|<|=)?(.+)$/);
  if (!match) return false;

  const operator = match[1] ?? "=";
  const target = parseSemver(match[2]);
  if (!target) return false;

  const order = compareSemver(version, target);
  if (operator === ">=") return order >= 0;
  if (operator === "<=") return order <= 0;
  if (operator === ">") return order > 0;
  if (operator === "<") return order < 0;
  return order === 0;
}

function satisfiesCaret(version: Semver, targetText: string): boolean {
  const target = parseSemver(targetText);
  if (!target) return false;

  const upper =
    target.major > 0
      ? { major: target.major + 1, minor: 0, patch: 0 }
      : target.minor > 0
        ? { major: 0, minor: target.minor + 1, patch: 0 }
        : { major: 0, minor: 0, patch: target.patch + 1 };

  return (
    compareSemver(version, target) >= 0 && compareSemver(version, upper) < 0
  );
}

function satisfiesTilde(version: Semver, targetText: string): boolean {
  const target = parseSemver(targetText);
  if (!target) return false;

  const upper = { major: target.major, minor: target.minor + 1, patch: 0 };
  return (
    compareSemver(version, target) >= 0 && compareSemver(version, upper) < 0
  );
}

function parseSemver(value: string): Semver | null {
  const match = value
    .trim()
    .replace(/^v/i, "")
    .match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+].*)?$/);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0),
  };
}

function compareSemver(left: Semver, right: Semver): number {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

function isWildcard(value: string): boolean {
  return value === "*" || value.toLowerCase() === "x";
}
