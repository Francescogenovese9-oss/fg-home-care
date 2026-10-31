export const LEGAL_UPDATED_LABEL = "31 ottobre 2026";
export const TERMS_VERSION = "termini-2026-10-31-direct-v1";
export const PRIVACY_VERSION = "privacy-2026-10-31-direct-v1";
export const DIRECT_TERMS_VERSION = "direct-2026-10-31-v1";

export function hasAcceptedDirectTerms(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return body.directTermsAccepted === true && body.directTermsVersion === DIRECT_TERMS_VERSION;
}
