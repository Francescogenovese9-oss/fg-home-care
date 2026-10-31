import assert from "node:assert/strict";
import test from "node:test";
import { canRequestAppointment, canViewRolloutProfessional, isDirectEnabledFor, isDirectTestPair } from "../lib/subscriptions/direct-rollout.ts";

const patient = "00000000-0000-4000-8000-000000000001";
const professional = "00000000-0000-4000-8000-000000000002";
const outsider = "00000000-0000-4000-8000-000000000003";
const now = Date.parse("2026-10-31T12:00:00Z");
const env = {
  FG_DIRECT_TEST_PATIENT_ID: patient,
  FG_DIRECT_TEST_PROFESSIONAL_ID: professional,
  FG_DIRECT_TEST_UNTIL: "2026-11-01T12:00:00Z",
  FG_DIRECT_PLAN_ENABLED: "false",
  NEXT_PUBLIC_TRANSACTIONS_ENABLED: "false",
};

test("closed rollout allows only the exact test pair, with no public transactions", () => {
  assert.equal(canRequestAppointment(patient, professional, env, now), true);
  assert.equal(isDirectEnabledFor(professional, env, now), true);
  for (const [p, d] of [[outsider, professional], [patient, outsider], [outsider, outsider], [professional, patient]]) {
    assert.equal(canRequestAppointment(p, d, env, now), false);
    assert.equal(isDirectTestPair(p, d, env, now), false);
  }
  assert.equal(isDirectEnabledFor(outsider, env, now), false);
});

test("test profile is hidden from anonymous visitors and unrelated users", () => {
  assert.equal(canViewRolloutProfessional(null, professional, env, now), false);
  assert.equal(canViewRolloutProfessional(outsider, professional, env, now), false);
  assert.equal(canViewRolloutProfessional(patient, professional, env, now), true);
  assert.equal(canViewRolloutProfessional(professional, professional, env, now), true);
});

test("missing, invalid, duplicate or expired configuration fails closed", () => {
  for (const config of [{}, {...env, FG_DIRECT_TEST_UNTIL: "invalid"}, {...env, FG_DIRECT_TEST_UNTIL: new Date(now).toISOString()}, {...env, FG_DIRECT_TEST_PATIENT_ID: professional}, {...env, FG_DIRECT_TEST_PATIENT_ID: "*"}]) {
    assert.equal(isDirectTestPair(patient, professional, config, now), false);
    assert.equal(canRequestAppointment(patient, professional, config, now), false);
  }
});

test("public rollout preserves ordinary booking but never mixes test and real accounts", () => {
  const live = {...env, NEXT_PUBLIC_TRANSACTIONS_ENABLED: "true", FG_DIRECT_PLAN_ENABLED: "true"};
  assert.equal(canRequestAppointment(outsider, outsider, live, now), true);
  assert.equal(isDirectEnabledFor(outsider, live, now), true);
  assert.equal(canRequestAppointment(outsider, professional, live, now), false);
  assert.equal(canRequestAppointment(patient, outsider, live, now), false);
  assert.equal(isDirectEnabledFor(professional, live, Date.parse(env.FG_DIRECT_TEST_UNTIL)), false);
});
