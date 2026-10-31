/**
 * Payment routing is determined from the persisted professional subscription,
 * not from the patient's request payload.
 *
 * DIRECT must never create a Stripe PaymentIntent for a healthcare service.
 * This module does not activate DIRECT or bypass the global transactions gate.
 */
export type ProfessionalPlan = "BASIC" | "PREMIUM" | "DIRECT";
export type ServicePaymentRoute = "STRIPE_PLATFORM" | "PAY_PROFESSIONAL_DIRECTLY" | "UNAVAILABLE";

export function getServicePaymentRoute(
  persistedPlan: ProfessionalPlan,
  subscriptionStatus: string | null | undefined,
  directEnabled: boolean
): ServicePaymentRoute {
  if (persistedPlan === "DIRECT") {
    return subscriptionStatus === "active" && directEnabled
      ? "PAY_PROFESSIONAL_DIRECTLY"
      : "UNAVAILABLE";
  }
  return "STRIPE_PLATFORM";
}

export function canCreatePlatformPaymentIntent(
  paymentRoute: ServicePaymentRoute
): boolean {
  return paymentRoute === "STRIPE_PLATFORM";
}

/** The booking snapshot remains authoritative even when a request is rejected. */
export function getDecisionPaymentStatus(
  action: "ACCEPT" | "REJECT" | "COMPLETE",
  paymentRoute: string | null | undefined
): "NOT_REQUIRED" | "REQUIRES_PAYMENT" | "CANCELLED" | undefined {
  if (action === "COMPLETE") return undefined;
  if (paymentRoute === "PAY_PROFESSIONAL_DIRECTLY") return "NOT_REQUIRED";
  return action === "ACCEPT" ? "REQUIRES_PAYMENT" : "CANCELLED";
}
