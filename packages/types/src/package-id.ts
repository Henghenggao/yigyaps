/**
 * Public package identifiers are URL-safe slugs.
 *
 * Keep this contract shared between the API, SDK, CLI, and web publisher so
 * packages have one canonical, linkable identifier.
 */
export const PACKAGE_ID_MIN_LENGTH = 3;
export const PACKAGE_ID_MAX_LENGTH = 100;
export const PACKAGE_ID_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{1,98}[a-z0-9])$/;

export const PACKAGE_ID_DESCRIPTION =
  "Package ID must be 3-100 characters, lowercase letters, numbers and hyphens only, and must start and end with a letter or number.";

export function isValidPackageId(packageId: string): boolean {
  return PACKAGE_ID_PATTERN.test(packageId);
}
