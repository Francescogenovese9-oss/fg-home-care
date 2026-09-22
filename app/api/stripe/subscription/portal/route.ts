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
      .from("profiles")
      .select("role")
      .eq(
        "id",
        user.id
      )
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
            stripe_customer_id,
            subscription_status
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
      !professional
        .stripe_customer_id
    ) {
      return NextResponse.json(
        {
          message:
            "Nessun account di fatturazione Stripe disponibile.",
        },
        {
          status: 400,
        }
      );
    }

    const stripe =
      getStripe();

    const session =
      await stripe.billingPortal.sessions.create(
        {
          customer:
            professional
              .stripe_customer_id,

          return_url:
            `${getSiteUrl()}/dashboard/professional/payments`,
        }
      );

    return NextResponse.json({
      url:
        session.url,
    });
  } catch (
    error
  ) {
    console.error(
      "Errore apertura Customer Portal Stripe:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Impossibile aprire la gestione dell'abbonamento.",
      },
      {
        status: 500,
      }
    );
  }
}
