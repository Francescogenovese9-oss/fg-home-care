/**
 * Payment routing is determined from the persisted professional subscription,
 * not from the patient's request payload.
 *
 * DIRECT must never create a Stripe PaymentIntent for a healthcare service.
 * This module does not activate DIRECT or bypass the global transactions gate.
 */
export type ProfessionalPlan = "BASIC" | "PREMIUM" | "DIRECT";
export type ServicePaymentRoute = "STRIPE_PLATFORM" | "PAY_PROFESSIONAL_DIRECTLY";

export function getServicePaymentRoute(
  persistedPlan: ProfessionalPlan,
  subscriptionStatus: string | null | undefined,
  directEnabled: boolean
): ServicePaymentRoute {
  if (
    persistedPlan === "DIRECT" &&
    subscriptionStatus === "active" &&
    directEnabled
  ) {
    return "PAY_PROFESSIONAL_DIRECTLY";
  }
  return "STRIPE_PLATFORM";
}

export function canCreatePlatformPaymentIntent(
  paymentRoute: ServicePaymentRoute
): boolean {
  return paymentRoute === "STRIPE_PLATFORM";
}
