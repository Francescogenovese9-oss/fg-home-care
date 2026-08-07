import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export async function GET() {
  const siteUrl = getSiteUrl();

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        `${siteUrl}/login`
      );
    }

    const {
      data: profile,
    } = await supabase
      .from("professional_profiles")
      .select(
        "stripe_account_id"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.stripe_account_id) {
      return NextResponse.redirect(
        `${siteUrl}/dashboard/professional/payments?stripe=missing`
      );
    }

    const stripe = getStripe();

    const accountLink =
      await stripe.accountLinks.create({
        account:
          profile.stripe_account_id,

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

    return NextResponse.redirect(
      accountLink.url
    );
  } catch (error) {
    console.error(
      "Errore refresh onboarding Stripe:",
      error
    );

    return NextResponse.redirect(
      `${siteUrl}/dashboard/professional/payments?stripe=error`
    );
  }
}