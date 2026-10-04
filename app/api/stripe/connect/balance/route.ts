import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (profile?.role !== "PROFESSIONAL") {
      return NextResponse.json(
        { message: "Operazione non autorizzata." },
        { status: 403 }
      );
    }

    const {
      data: professionalProfile,
      error: professionalError,
    } = await supabase
      .from("professional_profiles")
      .select(
        "stripe_account_id,stripe_onboarding_completed,stripe_payouts_enabled"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (professionalError) {
      throw professionalError;
    }

    if (!professionalProfile?.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        available: 0,
        pending: 0,
        currency: "eur",
        payoutsEnabled: false,
        onboardingCompleted: false,
        payouts: [],
      });
    }

    const stripe = getStripe();
    const accountId =
      professionalProfile.stripe_account_id;

    const balance = await stripe.balance.retrieve(
      {},
      { stripeAccount: accountId }
    );

    const available =
      balance.available.find(
        (item) => item.currency === "eur"
      )?.amount ?? 0;

    const pending =
      balance.pending.find(
        (item) => item.currency === "eur"
      )?.amount ?? 0;

    const payouts = await stripe.payouts.list(
      { limit: 10 },
      { stripeAccount: accountId }
    );

    return NextResponse.json({
      connected: true,
      currency: "eur",
      available,
      pending,
      payoutsEnabled:
        professionalProfile.stripe_payouts_enabled ??
        false,
      onboardingCompleted:
        professionalProfile.stripe_onboarding_completed ??
        false,
      payouts: payouts.data.map((payout) => ({
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        arrivalDate: payout.arrival_date
          ? new Date(
              payout.arrival_date * 1000
            ).toISOString()
          : null,
        createdAt: new Date(
          payout.created * 1000
        ).toISOString(),
      })),
    });
  } catch (error) {
    console.error(
      "Errore lettura saldo Stripe:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Impossibile recuperare il saldo Stripe.",
      },
      { status: 500 }
    );
  }
}
