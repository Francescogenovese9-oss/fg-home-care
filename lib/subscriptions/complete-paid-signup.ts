import "server-only";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { syncProfessionalSubscription } from "@/lib/stripe/sync-professional-subscription";
import { getSignupPlan, needsSignupPayment } from "./paid-signup";
import { isDoctorProfession } from "./direct-plan";
import { isProfession } from "@/lib/professions";

/** A success URL or an active subscription alone is not proof of payment. */
export async function completePaidSignup(user: User): Promise<boolean> {
  if (!needsSignupPayment(user)) return true;
  const admin = getSupabaseAdmin();
  const { data: professional, error } = await admin.from("professional_profiles")
    .select("stripe_subscription_id, subscription_status") .eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!professional?.stripe_subscription_id || professional.subscription_status !== "active") return false;
  const profession = user.app_metadata.signup_profession;
  const amount = getSignupPlan(user) === "PREMIUM" ? 1990
    : typeof profession === "string" && isProfession(profession) ? (isDoctorProfession(profession) ? 4990 : 2990) : null;
  if (amount === null) return false;
  // This ledger has RLS enabled and no client write policies; only signed
  // Stripe webhooks write invoice payment confirmations using the admin client.
  const { data: payment, error: paymentError } = await admin.from("professional_subscription_payments")
    .select("stripe_invoice_id").eq("professional_id", user.id)
    .eq("stripe_subscription_id", professional.stripe_subscription_id)
    .eq("status", "PAID").eq("currency", "eur").gte("amount_paid", amount).limit(1).maybeSingle();
  if (paymentError) throw paymentError;
  if (!payment) return false;
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, signup_subscription_completed: true, signup_subscription_completed_at: new Date().toISOString() },
  });
  if (updateError) throw updateError;
  return true;
}

/** Approval may arrive after the first invoice. Reconcile entitlement then,
 * preserving the existing verified-profession / actual Stripe price checks. */
export async function syncApprovedSignupSubscription(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  if (!data.user || getSignupPlan(data.user) !== "DIRECT") return;
  const { data: professional, error: profileError } = await admin.from("professional_profiles")
    .select("verification_status, subscription_plan, subscription_status, stripe_subscription_id")
    .eq("user_id", userId).maybeSingle();
  if (profileError) throw profileError;
  if (professional?.verification_status !== "APPROVED" || professional.subscription_plan === "DIRECT" ||
      professional.subscription_status !== "active" || !professional.stripe_subscription_id) return;
  await syncProfessionalSubscription(await getStripe().subscriptions.retrieve(professional.stripe_subscription_id));
}
