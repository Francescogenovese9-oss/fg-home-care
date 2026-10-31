/** Server-side rollout policy. Never use user metadata, email or request data as an allowlist. */
type RolloutEnvironment = Record<string, string | undefined>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function testIds(env: RolloutEnvironment) {
  const patient = env.FG_DIRECT_TEST_PATIENT_ID?.trim().toLowerCase();
  const professional = env.FG_DIRECT_TEST_PROFESSIONAL_ID?.trim().toLowerCase();
  if (!patient || !professional || !uuid.test(patient) || !uuid.test(professional) || patient === professional) return null;
  return { patient, professional };
}

export function isDirectTestPair(patientId: string, professionalId: string, env: RolloutEnvironment = process.env, now = Date.now()) {
  const ids = testIds(env);
  const until = Date.parse(env.FG_DIRECT_TEST_UNTIL ?? "");
  return Boolean(ids && Number.isFinite(until) && now < until &&
    patientId.toLowerCase() === ids.patient && professionalId.toLowerCase() === ids.professional);
}

export function isDirectEnabledFor(professionalId: string, env: RolloutEnvironment = process.env, now = Date.now()) {
  const ids = testIds(env);
  // Test accounts expire even after the public rollout is enabled.
  if (ids && professionalId.toLowerCase() === ids.professional) {
    return isDirectTestPair(ids.patient, professionalId, env, now);
  }
  return env.FG_DIRECT_PLAN_ENABLED === "true";
}

export function canViewRolloutProfessional(viewerId: string | null | undefined, professionalId: string, env: RolloutEnvironment = process.env, now = Date.now()) {
  const ids = testIds(env);
  if (!ids || professionalId.toLowerCase() !== ids.professional) return true;
  return Boolean(viewerId && (viewerId.toLowerCase() === ids.professional ||
    isDirectTestPair(viewerId, professionalId, env, now)));
}

export function canRequestAppointment(patientId: string, professionalId: string, env: RolloutEnvironment = process.env, now = Date.now()) {
  const ids = testIds(env);
  if (ids && (patientId.toLowerCase() === ids.patient || professionalId.toLowerCase() === ids.professional)) {
    return isDirectTestPair(patientId, professionalId, env, now);
  }
  return env.NEXT_PUBLIC_TRANSACTIONS_ENABLED === "true";
}
