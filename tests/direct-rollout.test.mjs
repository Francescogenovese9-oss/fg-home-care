import assert from "node:assert/strict";
import test from "node:test";
import { canRequestAppointment, canRequestAppointmentForPlan, isDirectEnabledFor } from "../lib/subscriptions/direct-rollout.ts";
const env = { FG_DIRECT_PLAN_ENABLED: "true", NEXT_PUBLIC_TRANSACTIONS_ENABLED: "false" };
test("closed platform booking grants no individual account exemption", () => {
  for (const [patient, professional] of [["patient-A", "professional-A"], ["patient-B", "professional-B"]]) {
    assert.equal(canRequestAppointment(patient, professional, env), false);
    for (const plan of ["BASIC", "PREMIUM"]) {
      assert.equal(canRequestAppointmentForPlan(patient, professional, {subscription_plan: plan, subscription_status: "active"}, env), false);
    }
  }
});
test("DIRECT bookings require an active plan and public rollout", () => {
  const active = {subscription_plan: "DIRECT", subscription_status: "active"};
  assert.equal(canRequestAppointmentForPlan("patient", "professional", active, env), true);
  for (const status of ["INACTIVE", "past_due", "canceled", null]) {
    assert.equal(canRequestAppointmentForPlan("patient", "professional", {...active, subscription_status: status}, env), false);
  }
  assert.equal(isDirectEnabledFor("professional", {...env, FG_DIRECT_PLAN_ENABLED: "false"}), false);
  assert.equal(canRequestAppointmentForPlan("patient", "professional", active, {...env, FG_DIRECT_PLAN_ENABLED: "false"}), false);
});
test("ordinary public bookings follow the global transactions switch", () => {
  assert.equal(canRequestAppointment("patient", "professional", {...env, NEXT_PUBLIC_TRANSACTIONS_ENABLED: "true"}), true);
});
