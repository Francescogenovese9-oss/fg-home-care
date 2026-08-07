import { NextRequest, NextResponse } from "next/server";

import { retrieveStripeV2Account } from "@/lib/stripe/accounts-v2";
import { syncConnectedAccount } from "@/lib/stripe/sync-connected-account";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  try {
    const webhookSecret =
      process.env
        .STRIPE_WEBHOOK_SECRET
        ?.trim();

    if (!webhookSecret) {
      console.error(
        "STRIPE_WEBHOOK_SECRET non configurata."
      );

      return NextResponse.json(
        {
          message:
            "Webhook Stripe non configurato.",
        },
        { status: 500 }
      );
    }

    const signature =
      request.headers.get(
        "stripe-signature"
      );

    if (!signature) {
      return NextResponse.json(
        {
          message:
            "Firma Stripe mancante.",
        },
        { status: 400 }
      );
    }

    /*
     * IMPORTANTE:
     * Stripe richiede il body RAW
     * per verificare la firma.
     *
     * Non usare request.json().
     */
    const rawBody =
      await request.text();

    const stripe = getStripe();

    let event;

    try {
      event =
        stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret
        );
    } catch (error) {
      console.error(
        "Firma webhook Stripe non valida:",
        error
      );

      return NextResponse.json(
        {
          message:
            "Firma webhook non valida.",
        },
        { status: 400 }
      );
    }

    console.log(
      "Webhook Stripe ricevuto:",
      {
        id: event.id,
        type: event.type,
      }
    );

    /*
     * Per ora gestiamo gli eventi
     * collegati agli account Connect.
     *
     * Recuperiamo sempre l'account
     * completo tramite Accounts v2,
     * così Supabase viene sincronizzato
     * con lo stato attuale di Stripe.
     */
    if (
      event.type === "account.updated"
    ) {
      const eventAccount =
        event.data.object;

      if (
        typeof eventAccount ===
          "object" &&
        eventAccount !== null &&
        "id" in eventAccount &&
        typeof eventAccount.id ===
          "string"
      ) {
        const account =
          await retrieveStripeV2Account(
            eventAccount.id
          );

        await syncConnectedAccount(
          account
        );

        console.log(
          "Account Stripe sincronizzato:",
          account.id
        );
      }
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Errore webhook Stripe:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Errore interno webhook Stripe.",
      },
      { status: 500 }
    );
  }
}