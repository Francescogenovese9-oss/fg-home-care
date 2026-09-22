import "server-only";

import Stripe from "stripe";

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
  const isPremium =
    subscription.status ===
    "active";

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
            isPremium
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
      isPremium
        ? "PREMIUM"
        : "BASIC",
  };
}
