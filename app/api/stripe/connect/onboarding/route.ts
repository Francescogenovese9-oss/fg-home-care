import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createStripeV2Account,
  retrieveStripeV2Account,
} from "@/lib/stripe/accounts-v2";

import { getStripe } from "@/lib/stripe/server";

import {
  syncConnectedAccount,
} from "@/lib/stripe/sync-connected-account";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

import {
  getSiteUrl,
} from "@/lib/site-url";

export async function POST(
  _request: NextRequest
) {
  try {
    /*
     * =====================================================
     * CLIENT UTENTE
     * =====================================================
     *
     * Serve per autenticazione e controlli
     * sul professionista loggato.
     * =====================================================
     */

    const supabase =
      await createClient();

    /*
     * =====================================================
     * AUTENTICAZIONE
     * =====================================================
     */

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError
    ) {
      console.error(
        "Errore autenticazione onboarding Stripe:",
        userError
      );
    }

    if (
      !user
    ) {
      return NextResponse.json(
        {
          message:
            "Utente non autenticato.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * =====================================================
     * PROFILO ACCOUNT
     * =====================================================
     */

    const {
      data:
        profile,

      error:
        profileError,
    } = await supabase
      .from(
        "profiles"
      )
      .select(
        `
          id,
          first_name,
          last_name,
          email,
          role
        `
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      console.error(
        "Errore lettura profilo onboarding Stripe:",
        profileError
      );

      return NextResponse.json(
        {
          message:
            "Profilo utente non disponibile.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =====================================================
     * VERIFICA RUOLO
     * =====================================================
     */

    if (
      profile.role !==
      "PROFESSIONAL"
    ) {
      return NextResponse.json(
        {
          message:
            "Operazione riservata ai professionisti.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * PROFILO PROFESSIONALE
     * =====================================================
     */

    const {
      data:
        professionalProfile,

      error:
        professionalError,
    } = await supabase
      .from(
        "professional_profiles"
      )
      .select(
        `
          user_id,
          profession,
          verification_status,
          stripe_account_id
        `
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (
      professionalError ||
      !professionalProfile
    ) {
      console.error(
        "Errore lettura profilo professionale onboarding Stripe:",
        professionalError
      );

      return NextResponse.json(
        {
          message:
            "Profilo professionale non disponibile.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =====================================================
     * PROFILO APPROVATO
     * =====================================================
     */

    if (
      professionalProfile
        .verification_status !==
      "APPROVED"
    ) {
      return NextResponse.json(
        {
          message:
            "Il profilo deve essere approvato prima di collegare Stripe.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * NOME PROFESSIONISTA
     * =====================================================
     */

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
     * =====================================================
     * CLIENT ADMIN PRIVILEGIATO
     * =====================================================
     *
     * I campi Stripe sono dati di sistema.
     *
     * Non devono essere modificabili direttamente
     * da un account authenticated.
     * =====================================================
     */

    const supabaseAdmin =
      getSupabaseAdmin();

    /*
     * =====================================================
     * CREAZIONE ACCOUNT STRIPE V2
     * =====================================================
     */

    if (
      !stripeAccountId
    ) {
      const account =
        await createStripeV2Account({
          userId:
            user.id,

          email:
            profile.email ??
            user.email,

          displayName,

          profession:
            professionalProfile
              .profession,
        });

      stripeAccountId =
        account.id;

      /*
       * ===================================================
       * SALVATAGGIO ACCOUNT STRIPE
       * ===================================================
       *
       * Scrittura con service role.
       * ===================================================
       */

      const {
        error:
          saveError,
      } = await supabaseAdmin
        .from(
          "professional_profiles"
        )
        .update({
          stripe_account_id:
            account.id,

          stripe_account_created:
            true,

          stripe_account_updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "user_id",
          user.id
        );

      if (
        saveError
      ) {
        console.error(
          "Errore salvataggio account Stripe:",
          {
            message:
              saveError.message,

            code:
              saveError.code,

            details:
              saveError.details,

            hint:
              saveError.hint,

            userId:
              user.id,

            stripeAccountId:
              account.id,
          }
        );

        return NextResponse.json(
          {
            message:
              "Account Stripe creato ma non salvato nel database.",
          },
          {
            status: 500,
          }
        );
      }

      /*
       * Sincronizzazione capability e stato
       * dell'account Stripe.
       *
       * syncConnectedAccount utilizza già
       * getSupabaseAdmin().
       */

      await syncConnectedAccount(
        account
      );
    } else {
      /*
       * ===================================================
       * ACCOUNT STRIPE GIÀ ESISTENTE
       * ===================================================
       */

      const existingAccount =
        await retrieveStripeV2Account(
          stripeAccountId
        );

      await syncConnectedAccount(
        existingAccount
      );
    }

    /*
     * =====================================================
     * ACCOUNT LINK STRIPE
     * =====================================================
     *
     * L'onboarding resta Stripe-hosted.
     * =====================================================
     */

    const stripe =
      getStripe();

    const siteUrl =
      getSiteUrl();

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

    /*
     * =====================================================
     * RISPOSTA
     * =====================================================
     */

    return NextResponse.json({
      success:
        true,

      url:
        accountLink.url,
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
      {
        status: 500,
      }
    );
  }
}