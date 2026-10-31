import type { Profession } from "@/lib/professions";

/**
 * DIRECT is not live yet. Prices are display-only until the subscription,
 * booking and billing flows have been migrated and verified.
 *
 * The server must determine the verified profession from approved documents;
 * never trust a profession or price submitted by a browser for billing.
 */
export const DIRECT_PLAN = {
  code: "DIRECT",
  healthcareMonthlyCents: 2990,
  doctorMonthlyCents: 4990,
  patientPlatformPayment: false,
  platformCommissionPercent: 0,
  availableForPurchase: false,
} as const;

const DOCTOR_PROFESSIONS: ReadonlySet<Profession> = new Set([
  "Medico chirurgo",
  "Medico di medicina generale / Medico di base",
  "Medico specialista",
]);

export function isDoctorProfession(profession: Profession): boolean {
  return DOCTOR_PROFESSIONS.has(profession);
}

export function getDirectMonthlyPriceCents(
  verifiedProfession: Profession
): number {
  return isDoctorProfession(verifiedProfession)
    ? DIRECT_PLAN.doctorMonthlyCents
    : DIRECT_PLAN.healthcareMonthlyCents;
}
