import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createStripeV2Account,
  retrieveStripeV2Account,
} from "@/lib/stripe/accounts-v2";

import { getStripe } from "@/lib/stripe/server";

import { syncConnectedAccount } from "@/lib/stripe/sync-connected-account";

import { createClient } from "@/lib/supabase/server";

import { getSiteUrl } from "@/lib/site-url";

export async function POST(
  _request: NextRequest
) {
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
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        `
          id,
          first_name,
          last_name,
          email,
          role
        `
      )
      .eq("id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      return NextResponse.json(
        {
          message:
            "Profilo utente non disponibile.",
        },
        { status: 500 }
      );
    }

    if (
      profile.role !==
      "PROFESSIONAL"
    ) {
      return NextResponse.json(
        {
          message:
            "Operazione riservata ai professionisti.",
        },
        { status: 403 }
      );
    }

    const {
      data: professionalProfile,
      error: professionalError,
    } = await supabase
      .from("professional_profiles")
      .select(
        `
          user_id,
          profession,
          verification_status,
          stripe_account_id
        `
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      professionalError ||
      !professionalProfile
    ) {
      return NextResponse.json(
        {
          message:
            "Profilo professionale non disponibile.",
        },
        { status: 500 }
      );
    }

    if (
      professionalProfile.verification_status !==
      "APPROVED"
    ) {
      return NextResponse.json(
        {
          message:
            "Il profilo deve essere approvato prima di collegare Stripe.",
        },
        { status: 403 }
      );
    }

    const displayName =
      [
        profile.first_name,
        profile.last_name,
      ]
        .filter(Boolean)
        .join(" ") ||
      "Professionista FG Home Care";

    let stripeAccountId =
      professionalProfile
        .stripe_account_id;

    /*
     * CREAZIONE ACCOUNT V2
     */
    if (!stripeAccountId) {
      const account =
        await createStripeV2Account({
          userId: user.id,

          email:
            profile.email ??
            user.email,

          displayName,

          profession:
            professionalProfile.profession,
        });

      stripeAccountId =
        account.id;

      const {
        error: saveError,
      } = await supabase
        .from("professional_profiles")
        .update({
          stripe_account_id:
            account.id,

          stripe_account_created:
            true,

          stripe_account_updated_at:
            new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (saveError) {
        console.error(
          "Errore salvataggio account Stripe:",
          saveError
        );

        return NextResponse.json(
          {
            message:
              "Account Stripe creato ma non salvato nel database.",
          },
          { status: 500 }
        );
      }

      await syncConnectedAccount(
        account
      );
    } else {
      const existingAccount =
        await retrieveStripeV2Account(
          stripeAccountId
        );

      await syncConnectedAccount(
        existingAccount
      );
    }

    /*
     * Account Links resta l'onboarding
     * Stripe-hosted.
     */
    const stripe = getStripe();

    const siteUrl = getSiteUrl();

    const accountLink =
      await stripe.accountLinks.create({
        account:
          stripeAccountId,

        refresh_url:
          `${siteUrl}/api/stripe/connect/refresh`,

        return_url:
          `${siteUrl}/dashboard/professional/payments?stripe=return`,

        type:
          "account_onboarding",

        collection_options: {
          fields:
            "eventually_due",
        },
      });

    return NextResponse.json({
      success: true,
      url: accountLink.url,
    });
  } catch (error) {
    console.error(
      "Errore onboarding Stripe v2:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossibile avviare Stripe.",
      },
      { status: 500 }
    );
  }
}