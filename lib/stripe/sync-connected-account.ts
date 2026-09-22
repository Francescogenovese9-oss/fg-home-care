import "server-only";

import type {
  StripeV2Account,
} from "@/lib/stripe/accounts-v2";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

export async function syncConnectedAccount(
  account: StripeV2Account
) {
  /*
   * =====================================================
   * SUPABASE ADMIN
   * =====================================================
   *
   * Questa funzione sincronizza dati provenienti
   * direttamente da Stripe.
   *
   * Nessun utente autenticato deve poter
   * modificare direttamente questi campi.
   * =====================================================
   */

  const supabaseAdmin =
    getSupabaseAdmin();

  /*
   * =====================================================
   * CAPABILITIES STRIPE
   * =====================================================
   */

  const balanceCapabilities =
    account.configuration
      ?.recipient
      ?.capabilities
      ?.stripe_balance;

  const transfersEnabled =
    balanceCapabilities
      ?.stripe_transfers
      ?.status ===
    "active";

  const payoutsEnabled =
    balanceCapabilities
      ?.payouts
      ?.status ===
    "active";

  /*
   * =====================================================
   * REQUIREMENTS
   * =====================================================
   */

  const requirements =
    account.requirements
      ?.entries ??
    [];

  const userRequirements =
    requirements.filter(
      (
        requirement
      ) =>
        requirement
          .awaiting_action_from ===
        "user"
    );

  const detailsSubmitted =
    userRequirements.length ===
    0;

  const onboardingCompleted =
    detailsSubmitted &&
    transfersEnabled &&
    payoutsEnabled;

  /*
   * =====================================================
   * SINCRONIZZAZIONE DATABASE
   * =====================================================
   *
   * L'UPDATE viene eseguito con service role.
   *
   * I campi Stripe non sono modificabili
   * direttamente dal professionista.
   * =====================================================
   */

  const {
    error,
  } = await supabaseAdmin
    .from(
      "professional_profiles"
    )
    .update({
      stripe_account_created:
        true,

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
        new Date()
          .toISOString(),
    })
    .eq(
      "stripe_account_id",
      account.id
    );

  if (error) {
    console.error(
      "Errore sincronizzazione Stripe v2:",
      {
        message:
          error.message,

        code:
          error.code,

        details:
          error.details,

        hint:
          error.hint,

        stripeAccountId:
          account.id,
      }
    );

    throw new Error(
      "Impossibile sincronizzare Stripe con Supabase."
    );
  }

  /*
   * =====================================================
   * RISPOSTA
   * =====================================================
   */

  return {
    transfersEnabled,
    payoutsEnabled,
    detailsSubmitted,
    onboardingCompleted,
    requirements:
      userRequirements,
  };
}