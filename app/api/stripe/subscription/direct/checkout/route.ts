import { isDirectEnabledFor } from "@/lib/subscriptions/direct-rollout";
import { DIRECT_TERMS_VERSION, TERMS_VERSION, PRIVACY_VERSION, hasAcceptedDirectTerms } from "@/lib/legal/versions";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getStripe,
} from "@/lib/stripe/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

import {
  getSiteUrl,
} from "@/lib/site-url";
import { isDoctorProfession } from "@/lib/subscriptions/direct-plan";
import { isProfession } from "@/lib/professions";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
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

    if (!isDirectEnabledFor(user.id)) {
      return NextResponse.json({ message: "DIRECT non è ancora disponibile per questo account." }, { status: 503 });
    }

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
        "Errore lettura profilo Checkout DIRECT:",
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

    const supabaseAdmin =
      getSupabaseAdmin();

    const {
      data:
        professional,

      error:
        professionalError,
    } =
      await supabaseAdmin
        .from(
          "professional_profiles"
        )
        .select(
          `
            user_id,
            verification_status,
            profession,
            subscription_plan,
            subscription_status,
            stripe_customer_id,
            stripe_subscription_id
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      professionalError ||
      !professional
    ) {
      console.error(
        "Errore lettura profilo professionale Checkout DIRECT:",
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

    if (
      professional
        .verification_status !==
      "APPROVED"
    ) {
      return NextResponse.json(
        {
          message:
            "Il profilo deve essere approvato prima di attivare DIRECT.",
        },
        {
          status: 403,
        }
      );
    }

    const consent = await request.json().catch(() => null);
    if (!hasAcceptedDirectTerms(consent)) {
      return NextResponse.json(
        { message: "Leggi e accetta le condizioni DIRECT aggiornate prima di continuare.", directTermsVersion: DIRECT_TERMS_VERSION },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    const termsAcceptedAt = new Date().toISOString();

    // Do not open a second subscription while an existing one can
    // still recover, renew or be resumed through the Billing Portal.
    const blockingSubscriptionStatuses = new Set([
      "active", "trialing", "past_due", "unpaid", "incomplete", "paused",
    ]);
    if (
      professional.stripe_subscription_id &&
      blockingSubscriptionStatuses.has(professional.subscription_status ?? "")
    ) {
      return NextResponse.json(
        {
          message:
            "Esiste già un abbonamento da gestire. Apri il portale di fatturazione prima di sottoscriverne un altro.",
          alreadyActive:
            true,
        },
        {
        status: 409,
        }
      );
    }

    // Never use a client-supplied profession or Stripe Price ID.
    // Only the server-side, approved professional profile determines pricing.
    if (!isProfession(professional.profession || "")) {
      return NextResponse.json(
        { message: "Professione non verificabile: contatta l'assistenza." },
        { status: 403 }
      );
    }
    const doctor = isDoctorProfession(professional.profession);
    const priceId = (
      doctor
        ? process.env.STRIPE_DIRECT_DOCTOR_PRICE_ID
        : process.env.STRIPE_DIRECT_HEALTHCARE_PRICE_ID
    )?.trim();

    if (
      !priceId
    ) {
      throw new Error(
        "Prezzo Stripe DIRECT non configurato."
      );
    }

    const stripe =
      getStripe();

    // Reject a misconfigured Stripe Price before opening Checkout.
    const configuredPrice = await stripe.prices.retrieve(priceId);
    if (
      !configuredPrice.active ||
      configuredPrice.type !== "recurring" ||
      configuredPrice.recurring?.interval !== "month" ||
      configuredPrice.recurring?.interval_count !== 1 ||
      configuredPrice.currency !== "eur" ||
      configuredPrice.unit_amount !== (doctor ? 4990 : 2990)
    ) {
      throw new Error("Il prezzo Stripe DIRECT non corrisponde alla tariffa prevista.");
    }

    let customerId =
      professional
        .stripe_customer_id;

    if (
      customerId
    ) {
      try {
        const existingCustomer =
          await stripe.customers.retrieve(
            customerId
          );

        if (
          "deleted" in
            existingCustomer &&
          existingCustomer.deleted
        ) {
          customerId =
            null;
        }
      } catch (
        customerError
      ) {
        console.error(
          "Customer Stripe non recuperabile, ne verrà creato uno nuovo:",
          customerError
        );

        customerId =
          null;
      }
    }

    if (
      !customerId
    ) {
      const customer =
        await stripe.customers.create(
          {
            email:
              profile.email ||
              user.email ||
              undefined,

            name:
              [
                profile.first_name,
                profile.last_name,
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                ) ||
              undefined,

            metadata: {
              fg_home_care_professional_id:
                user.id,
            },
          }
        );

      customerId =
        customer.id;

      const {
        error:
          customerUpdateError,
      } =
        await supabaseAdmin
          .from(
            "professional_profiles"
          )
          .update(
            {
              stripe_customer_id:
                customerId,
            }
          )
          .eq(
            "user_id",
            user.id
          );

      if (
        customerUpdateError
      ) {
        console.error(
          "Errore salvataggio Stripe Customer:",
          customerUpdateError
        );

        throw new Error(
          "Impossibile salvare il cliente Stripe."
        );
      }
    }

    const siteUrl =
      getSiteUrl();

    const session =
      await stripe.checkout.sessions.create(
        {
          mode:
            "subscription",

          customer:
            customerId,

          client_reference_id:
            user.id,

          line_items: [
            {
              price:
                priceId,

              quantity:
                1,
            },
          ],

          success_url:
            `${siteUrl}/dashboard/professional/payments?direct=success`,

          cancel_url:
            `${siteUrl}/dashboard/professional/payments?direct=canceled`,

          metadata: {
            fg_direct_terms_version: DIRECT_TERMS_VERSION,
            fg_terms_version: TERMS_VERSION,
            fg_privacy_version: PRIVACY_VERSION,
            fg_direct_terms_accepted_at: termsAcceptedAt,
            fg_home_care_professional_id:
              user.id,

            fg_home_care_plan:
              "DIRECT",
          },

          subscription_data: {
            metadata: {
              fg_direct_terms_version: DIRECT_TERMS_VERSION,
              fg_terms_version: TERMS_VERSION,
              fg_privacy_version: PRIVACY_VERSION,
              fg_direct_terms_accepted_at: termsAcceptedAt,
              fg_home_care_professional_id:
                user.id,

              fg_home_care_plan:
                "DIRECT",
            },
          },

          allow_promotion_codes:
            false,
        }
      );

    if (
      !session.url
    ) {
      throw new Error(
        "Stripe non ha restituito l'URL Checkout."
      );
    }

    return NextResponse.json(
      {
        url:
          session.url,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Errore creazione Checkout DIRECT:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Impossibile avviare l'abbonamento DIRECT.",
      },
      {
        status: 500,
      }
    );
  }
}
