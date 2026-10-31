/** Only server-managed app_metadata can require or complete paid onboarding. */
export const PAID_SIGNUP_VERSION = "paid-signup-v1";
export type PaidSignupPlan = "PREMIUM" | "DIRECT";
type SignupUser = { app_metadata?: Record<string, unknown> };
export function getSignupPlan(user: SignupUser): PaidSignupPlan | null {
  const metadata = user.app_metadata;
  if (metadata?.signup_subscription_version !== PAID_SIGNUP_VERSION) return null;
  const plan = metadata.signup_subscription_plan;
  return plan === "PREMIUM" || plan === "DIRECT" ? plan : null;
}
export function needsSignupPayment(user: SignupUser): boolean {
  return getSignupPlan(user) !== null && user.app_metadata?.signup_subscription_completed !== true;
}
