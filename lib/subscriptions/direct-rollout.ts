/** Server-controlled rollout. No account-specific exemptions. */
type RolloutEnvironment = Record<string, string | undefined>;

export function isDirectEnabledFor(_professionalId: string, env: RolloutEnvironment = process.env) {
  return env.FG_DIRECT_PLAN_ENABLED === "true";
}

export function canRequestAppointment(_patientId: string, _professionalId: string, env: RolloutEnvironment = process.env) {
  return env.NEXT_PUBLIC_TRANSACTIONS_ENABLED === "true";
}

/** The plan must come from the database, never from the booking request. */
export function canRequestAppointmentForPlan(
  patientId: string,
  professionalId: string,
  plan: { subscription_plan: string | null; subscription_status: string | null },
  env: RolloutEnvironment = process.env,
) {
  return canRequestAppointment(patientId, professionalId, env) ||
    (plan.subscription_plan === "DIRECT" && plan.subscription_status === "active" &&
      isDirectEnabledFor(professionalId, env));
}
