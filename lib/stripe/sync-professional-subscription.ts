import "server-only";
import { isDirectEnabledFor } from "@/lib/subscriptions/direct-rollout";

import Stripe from "stripe";
import { isProfession } from "@/lib/professions";
import { isDoctorProfession } from "@/lib/subscriptions/direct-plan";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

function getCustomerId(
  subscription: Stripe.Subscription
) {
  if (
    typeof subscription.customer ===
    "string"
  ) {
    return subscription.customer;
  }

  return subscription.customer.id;
}

function getCurrentPeriodEnd(
  subscription: Stripe.Subscription
) {
  const periodEnd =
    subscription.items.data[0]
      ?.current_period_end;

  if (
    !periodEnd
  ) {
    return null;
  }

  return new Date(
    periodEnd * 1000
  ).toISOString();
}

export async function syncProfessionalSubscription(
  subscription: Stripe.Subscription
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const customerId =
    getCustomerId(
      subscription
    );

  let professionalId =
    subscription.metadata
      .fg_home_care_professional_id ||
    null;

  if (
    !professionalId
  ) {
    const {
      data:
        professional,
      error:
        lookupError,
    } =
      await supabaseAdmin
        .from(
          "professional_profiles"
        )
        .select(
          "user_id"
        )
        .eq(
          "stripe_customer_id",
          customerId
        )
        .maybeSingle();

    if (
      lookupError
    ) {
      throw lookupError;
    }

    professionalId =
      professional?.user_id ||
      null;
  }

  if (
    !professionalId
  ) {
    throw new Error(
      `Professionista non trovato per subscription ${subscription.id}.`
    );
  }

  /*
   * Premium è concesso solo quando Stripe
   * considera realmente attivo l'abbonamento.
   *
   * cancel_at_period_end non toglie Premium
   * immediatamente: finché lo status resta
   * active, il professionista mantie i
   * vantaggi fino alla scadenza del periodo.
   */
  const isActive =
    subscription.status ===
    "active";

  // Stripe is the source of truth for the plan. A DIRECT subscription
  // is never inferred from browser-provided metadata or registration.
  const stripePlan =
    subscription.metadata
      .fg_home_care_plan;

  // Subscription metadata alone cannot authorize a plan.
  // Match the actual recurring Price ID configured server-side.
  const subscribedPriceIds = subscription.items.data.map(
    (item) => item.price.id
  );
  const doctorDirectPriceId = process.env.STRIPE_DIRECT_DOCTOR_PRICE_ID?.trim();
  const healthcareDirectPriceId = process.env.STRIPE_DIRECT_HEALTHCARE_PRICE_ID?.trim();

  const matchesDirectPrice =
    subscribedPriceIds.length === 1 &&
    Boolean(
      (doctorDirectPriceId && subscribedPriceIds[0] === doctorDirectPriceId) ||
      (healthcareDirectPriceId && subscribedPriceIds[0] === healthcareDirectPriceId)
    );

  let matchesVerifiedProfession = false;
  if (stripePlan === "DIRECT" && matchesDirectPrice) {
    const { data: approvedProfessional, error: professionError } =
      await supabaseAdmin
        .from("professional_profiles")
        .select("profession, verification_status")
        .eq("user_id", professionalId)
        .maybeSingle();

    if (professionError) {
      throw professionError;
    }

    const verifiedProfession = approvedProfessional?.profession;
    if (
      approvedProfessional?.verification_status === "APPROVED" &&
      typeof verifiedProfession === "string" &&
      isProfession(verifiedProfession)
    ) {
      const expectedPriceId = isDoctorProfession(verifiedProfession)
        ? doctorDirectPriceId
        : healthcareDirectPriceId;

      matchesVerifiedProfession =
        Boolean(expectedPriceId) &&
        subscribedPriceIds[0] === expectedPriceId;
    }
  }

  const isDirect =
    isActive &&
    stripePlan === "DIRECT" &&
    matchesDirectPrice &&
    matchesVerifiedProfession &&
    isDirectEnabledFor(professionalId);

  // Keep legacy Premium subscriptions working, but never misclassify
  // a DIRECT Stripe Price as PREMIUM if its metadata is missing or stale.
  const isPremium =
    isActive &&
    stripePlan !== "DIRECT" &&
    !matchesDirectPrice;

  const {
    error:
      updateError,
  } =
    await supabaseAdmin
      .from(
        "professional_profiles"
      )
      .update(
        {
          stripe_customer_id:
            customerId,

          stripe_subscription_id:
            subscription.id,

          subscription_status:
            subscription.status,

          subscription_plan:
            isDirect
              ? "DIRECT"
              : isPremium
                ? "PREMIUM"
                : "BASIC",

          subscription_current_period_end:
            getCurrentPeriodEnd(
              subscription
            ),

          subscription_cancel_at_period_end:
            Boolean(
              subscription.cancel_at_period_end ||
              subscription.cancel_at
            ),
        }
      )
      .eq(
        "user_id",
        professionalId
      );

  if (
    updateError
  ) {
    throw updateError;
  }

  return {
    professionalId,
    subscriptionId:
      subscription.id,
    status:
      subscription.status,
    plan:
      isDirect
        ? "DIRECT"
        : isPremium
          ? "PREMIUM"
          : "BASIC",
  };
}
