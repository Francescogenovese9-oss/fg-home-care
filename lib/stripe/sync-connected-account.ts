import "server-only";

import type { StripeV2Account } from "@/lib/stripe/accounts-v2";
import { createClient } from "@/lib/supabase/server";

export async function syncConnectedAccount(
  account: StripeV2Account
) {
  const supabase = await createClient();

  const balanceCapabilities =
    account.configuration
      ?.recipient
      ?.capabilities
      ?.stripe_balance;

  const transfersEnabled =
    balanceCapabilities
      ?.stripe_transfers
      ?.status === "active";

  const payoutsEnabled =
    balanceCapabilities
      ?.payouts
      ?.status === "active";

  const requirements =
    account.requirements?.entries ?? [];

  const userRequirements =
    requirements.filter(
      (requirement) =>
        requirement.awaiting_action_from ===
        "user"
    );

  const detailsSubmitted =
    userRequirements.length === 0;

  const onboardingCompleted =
    detailsSubmitted &&
    transfersEnabled &&
    payoutsEnabled;

  const { error } = await supabase
    .from("professional_profiles")
    .update({
      stripe_account_created: true,

      stripe_transfers_enabled:
        transfersEnabled,

      /*
       * Campo legacy.
       * Lo manteniamo sincronizzato per
       * non rompere l'interfaccia esistente.
       */
      stripe_charges_enabled:
        transfersEnabled,

      stripe_payouts_enabled:
        payoutsEnabled,

      stripe_details_submitted:
        detailsSubmitted,

      stripe_onboarding_completed:
        onboardingCompleted,

      stripe_account_updated_at:
        new Date().toISOString(),
    })
    .eq(
      "stripe_account_id",
      account.id
    );

  if (error) {
    console.error(
      "Errore sincronizzazione Stripe v2:",
      error
    );

    throw new Error(
      "Impossibile sincronizzare Stripe con Supabase."
    );
  }

  return {
    transfersEnabled,
    payoutsEnabled,
    detailsSubmitted,
    onboardingCompleted,
    requirements: userRequirements,
  };
}