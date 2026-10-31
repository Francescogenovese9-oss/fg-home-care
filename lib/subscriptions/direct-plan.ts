import type { Profession } from "@/lib/professions";

/** DIRECT pricing. Signup uses the server-recorded declared profession;
 * publication and entitlement require verification of the professional documents. */
export const DIRECT_PLAN = {
  code: "DIRECT",
  healthcareMonthlyCents: 2990,
  doctorMonthlyCents: 4990,
  patientPlatformPayment: false,
  platformCommissionPercent: 0,
  availableForPurchase: true,
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
