import { NextResponse } from "next/server";

import { retrieveStripeV2Account } from "@/lib/stripe/accounts-v2";

import { syncConnectedAccount } from "@/lib/stripe/sync-connected-account";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          message:
            "Utente non autenticato.",
        },
        { status: 401 }
      );
    }

    const {
      data: profile,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (
      profile?.role !==
      "PROFESSIONAL"
    ) {
      return NextResponse.json(
        {
          message:
            "Operazione non autorizzata.",
        },
        { status: 403 }
      );
    }

    const {
      data: professionalProfile,
      error: profileError,
    } = await supabase
      .from("professional_profiles")
      .select(
        "stripe_account_id"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        {
          message:
            "Impossibile leggere il profilo.",
        },
        { status: 500 }
      );
    }

    if (
      !professionalProfile
        ?.stripe_account_id
    ) {
      return NextResponse.json({
        connected: false,
        message:
          "Nessun account Stripe collegato.",
      });
    }

    const account =
      await retrieveStripeV2Account(
        professionalProfile
          .stripe_account_id
      );

    const status =
      await syncConnectedAccount(
        account
      );

    return NextResponse.json({
      success: true,

      connected: true,

      account: {
        id: account.id,

        transfersEnabled:
          status.transfersEnabled,

        payoutsEnabled:
          status.payoutsEnabled,

        detailsSubmitted:
          status.detailsSubmitted,

        onboardingCompleted:
          status.onboardingCompleted,

        requirements:
          status.requirements.map(
            (requirement) => ({
              description:
                requirement.description ??
                null,

              status:
                requirement
                  .minimum_deadline
                  ?.status ??
                null,
            })
          ),
      },
    });
  } catch (error) {
    console.error(
      "Errore stato Stripe v2:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossibile aggiornare lo stato Stripe.",
      },
      { status: 500 }
    );
  }
}