import { TERMS_VERSION } from "@/lib/legal/versions";
import { getSignupPlan, needsSignupPayment } from "@/lib/subscriptions/paid-signup";
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

    const signupPlan = getSignupPlan(user);
    const signup = needsSignupPayment(user);
    if (signup && signupPlan !== "PREMIUM") return NextResponse.json({ message: "Completa il piano scelto durante la registrazione." }, { status: 409 });
    if (process.env.NEXT_PUBLIC_TRANSACTIONS_ENABLED !== "true" && !signup) return NextResponse.json({ message: "Nuove attivazioni Premium dalla dashboard non disponibili." }, { status: 503 });
    if (signup) {
      const consent = await request.json().catch(() => null);
      if (consent?.signupTermsAccepted !== true || consent.signupTermsVersion !== TERMS_VERSION) return NextResponse.json({ message: "Accetta le condizioni aggiornate dell’abbonamento." }, { status: 400 });
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
        "Errore lettura profilo Checkout Premium:",
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
        "Errore lettura profilo professionale Checkout Premium:",
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
      !signup && professional
        .verification_status !==
      "APPROVED"
    ) {
      return NextResponse.json(
        {
          message:
            "Il profilo deve essere approvato prima di attivare Premium.",
        },
        {
          status: 403,
        }
      );
    }

    const existingSubscriptionStatuses = new Set([
      "active", "trialing", "past_due", "unpaid", "incomplete", "paused",
    ]);
    if (
      professional.stripe_subscription_id &&
      existingSubscriptionStatuses.has(professional.subscription_status ?? "")
    ) {
      return NextResponse.json(
        {
          message: "Gestisci prima l'abbonamento esistente dal portale di fatturazione.",
          alreadyActive: true,
        },
        { status: 409 }
      );
    }

    const priceId =
      process.env
        .STRIPE_PREMIUM_PRICE_ID
        ?.trim();

    if (
      !priceId
    ) {
      throw new Error(
        "STRIPE_PREMIUM_PRICE_ID non configurata."
      );
    }

    const stripe =
      getStripe();

    const configuredPrice = await stripe.prices.retrieve(priceId);
    if (!configuredPrice.active || configuredPrice.type !== "recurring" ||
        configuredPrice.recurring?.interval !== "month" || configuredPrice.recurring?.interval_count !== 1 ||
        configuredPrice.currency !== "eur" || configuredPrice.unit_amount !== 1990) {
      throw new Error("Il prezzo Stripe Premium non corrisponde alla tariffa prevista.");
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
              ...(signup ? { fg_signup_flow: "paid-signup-v1", fg_terms_version: TERMS_VERSION, fg_terms_accepted_at: new Date().toISOString() } : {}),
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
            signup ? `${siteUrl}/onboarding/subscription?payment=success` : `${siteUrl}/dashboard/professional/payments?premium=success`,

          cancel_url:
            signup ? `${siteUrl}/onboarding/subscription?payment=canceled` : `${siteUrl}/dashboard/professional/payments?premium=canceled`,

          metadata: {
            ...(signup ? { fg_signup_flow: "paid-signup-v1", fg_terms_version: TERMS_VERSION, fg_terms_accepted_at: new Date().toISOString() } : {}),
            fg_home_care_professional_id:
              user.id,

            fg_home_care_plan:
              "PREMIUM",
          },

          subscription_data: {
            metadata: {
              ...(signup ? { fg_signup_flow: "paid-signup-v1", fg_terms_version: TERMS_VERSION, fg_terms_accepted_at: new Date().toISOString() } : {}),
              fg_home_care_professional_id:
                user.id,

              fg_home_care_plan:
                "PREMIUM",
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
      "Errore creazione Checkout Premium:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Impossibile avviare il pagamento Premium.",
      },
      {
        status: 500,
      }
    );
  }
}
