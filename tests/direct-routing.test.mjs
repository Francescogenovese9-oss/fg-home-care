import assert from "node:assert/strict";
import test from "node:test";
import {
  canCreatePlatformPaymentIntent,
  getServicePaymentRoute,
  getDecisionPaymentStatus,
} from "../lib/payments/service-payment-route.ts";

test("DIRECT active routes payment to the professional", () => {
  assert.equal(getServicePaymentRoute("DIRECT", "active", true), "PAY_PROFESSIONAL_DIRECTLY");
});
test("DIRECT cannot fall back to Stripe when disabled or inactive", () => {
  for (const status of ["active", "past_due", "canceled", "INACTIVE", null]) {
    const route = getServicePaymentRoute("DIRECT", status, false);
    assert.equal(route, "UNAVAILABLE");
    assert.equal(canCreatePlatformPaymentIntent(route), false);
  }
  for (const status of ["past_due", "canceled", "INACTIVE", null]) {
    const route = getServicePaymentRoute("DIRECT", status, true);
    assert.equal(route, "UNAVAILABLE");
    assert.equal(canCreatePlatformPaymentIntent(route), false);
  }
});
test("BASIC and PREMIUM continue using platform Stripe payments", () => {
  for (const plan of ["BASIC", "PREMIUM"]) {
    const route = getServicePaymentRoute(plan, "active", true);
    assert.equal(route, "STRIPE_PLATFORM");
    assert.equal(canCreatePlatformPaymentIntent(route), true);
  }
});
test("DIRECT never permits a patient platform PaymentIntent", () => {
  assert.equal(canCreatePlatformPaymentIntent(getServicePaymentRoute("DIRECT", "active", true)), false);
});

test("rejecting DIRECT preserves NOT_REQUIRED, as required by the database constraint", () => {
  for (const action of ["ACCEPT", "REJECT"]) {
    assert.equal(getDecisionPaymentStatus(action, "PAY_PROFESSIONAL_DIRECTLY"), "NOT_REQUIRED");
  }
  assert.equal(getDecisionPaymentStatus("COMPLETE", "PAY_PROFESSIONAL_DIRECTLY"), undefined);
});

test("platform and legacy booking decisions preserve existing payment states", () => {
  for (const route of ["STRIPE_PLATFORM", null, undefined]) {
    assert.equal(getDecisionPaymentStatus("ACCEPT", route), "REQUIRES_PAYMENT");
    assert.equal(getDecisionPaymentStatus("REJECT", route), "CANCELLED");
    assert.equal(getDecisionPaymentStatus("COMPLETE", route), undefined);
  }
});
