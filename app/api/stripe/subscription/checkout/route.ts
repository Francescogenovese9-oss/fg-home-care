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
  _request: NextRequest
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
      professional
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

    if (
      professional
        .subscription_status ===
        "active" &&
      professional
        .stripe_subscription_id
    ) {
      return NextResponse.json(
        {
          message:
            "L'abbonamento Premium è già attivo.",
          alreadyActive:
            true,
        },
        {
        status: 409,
        }
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
            `${siteUrl}/dashboard/professional/payments?premium=success`,

          cancel_url:
            `${siteUrl}/dashboard/professional/payments?premium=canceled`,

          metadata: {
            fg_home_care_professional_id:
              user.id,

            fg_home_care_plan:
              "PREMIUM",
          },

          subscription_data: {
            metadata: {
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
