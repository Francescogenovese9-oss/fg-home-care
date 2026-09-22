import {
  NextRequest,
  NextResponse,
} from "next/server";

import Stripe from "stripe";

import { syncSucceededPayment } from "@/lib/payments/sync-succeeded-payment";
import { syncRefund } from "@/lib/payments/sync-refund";
import { getStripe } from "@/lib/stripe/server";
import { syncProfessionalSubscription } from "@/lib/stripe/sync-professional-subscription";
import { syncSubscriptionInvoice } from "@/lib/stripe/sync-subscription-invoice";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function getAppointmentId(
  paymentIntent: Stripe.PaymentIntent
) {
  return (
    paymentIntent.metadata
      ?.fg_home_care_appointment_id ??
    null
  );
}

type StripeWebhookEventStatus =
  | "RECEIVED"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED";

type StripeWebhookEventRecord = {
  id: string;
  stripe_event_id: string;
  event_type: string;
  object_id: string | null;
  appointment_id: string | null;
  status: StripeWebhookEventStatus;
  attempts: number;
  last_error: string | null;
};

function getStripeObjectId(
  event: Stripe.Event
) {
  const object =
    event.data.object as {
      id?: string;
    };

  return object.id ?? null;
}

function getStripeAppointmentId(
  event: Stripe.Event
) {
  if (
    event.type.startsWith(
      "payment_intent."
    )
  ) {
    const paymentIntent =
      event.data
        .object as Stripe.PaymentIntent;

    return getAppointmentId(
      paymentIntent
    );
  }

  return null;
}

async function beginStripeEventProcessing(
  event: Stripe.Event
): Promise<
  | {
      duplicate: true;
      record:
        StripeWebhookEventRecord;
    }
  | {
      duplicate: false;
      record:
        StripeWebhookEventRecord;
    }
> {
  const supabase =
    getSupabaseAdmin();

  const stripeEventId =
    event.id;

  const eventType =
    event.type;

  const objectId =
    getStripeObjectId(
      event
    );

  const appointmentId =
    getStripeAppointmentId(
      event
    );

  const {
    data:
      existingEvent,

    error:
      existingEventError,
  } = await supabase
    .from(
      "stripe_webhook_events"
    )
    .select(
      `
        id,
        stripe_event_id,
        event_type,
        object_id,
        appointment_id,
        status,
        attempts,
        last_error
      `
    )
    .eq(
      "stripe_event_id",
      stripeEventId
    )
    .maybeSingle();

  if (
    existingEventError
  ) {
    console.error(
      "Errore lettura registro webhook Stripe:",
      {
        stripeEventId,
        eventType,
        message:
          existingEventError.message,
        code:
          existingEventError.code,
        details:
          existingEventError.details,
        hint:
          existingEventError.hint,
      }
    );

    throw existingEventError;
  }

  if (
    existingEvent?.status ===
    "PROCESSED"
  ) {
    console.log(
      "ℹ️ Evento Stripe già elaborato:",
      {
        stripeEventId,
        eventType,
        attempts:
          existingEvent.attempts,
      }
    );

    return {
      duplicate: true,
      record:
        existingEvent as StripeWebhookEventRecord,
    };
  }

  const now =
    new Date().toISOString();

  if (
    existingEvent
  ) {
    const {
      data:
        updatedEvent,

      error:
        updateEventError,
    } = await supabase
      .from(
        "stripe_webhook_events"
      )
      .update({
        event_type:
          eventType,

        object_id:
          objectId,

        appointment_id:
          appointmentId ??
          existingEvent.appointment_id,

        status:
          "PROCESSING",

        attempts:
          Number(
            existingEvent.attempts ??
            0
          ) + 1,

        last_error:
          null,

        processing_started_at:
          now,

        updated_at:
          now,
      })
      .eq(
        "id",
        existingEvent.id
      )
      .select(
        `
          id,
          stripe_event_id,
          event_type,
          object_id,
          appointment_id,
          status,
          attempts,
          last_error
        `
      )
      .single();

    if (
      updateEventError
    ) {
      console.error(
        "Errore aggiornamento registro webhook Stripe:",
        {
          stripeEventId,
          eventType,
          message:
            updateEventError.message,
          code:
            updateEventError.code,
          details:
            updateEventError.details,
          hint:
            updateEventError.hint,
        }
      );

      throw updateEventError;
    }

    return {
      duplicate: false,
      record:
        updatedEvent as StripeWebhookEventRecord,
    };
  }

  const {
    data:
      insertedEvent,

    error:
      insertEventError,
  } = await supabase
    .from(
      "stripe_webhook_events"
    )
    .insert({
      stripe_event_id:
        stripeEventId,

      event_type:
        eventType,

      object_id:
        objectId,

      appointment_id:
        appointmentId,

      status:
        "PROCESSING",

      attempts:
        1,

      last_error:
        null,

      processing_started_at:
        now,

      updated_at:
        now,
    })
    .select(
      `
        id,
        stripe_event_id,
        event_type,
        object_id,
        appointment_id,
        status,
        attempts,
        last_error
      `
    )
    .single();

  if (
    insertEventError
  ) {
    /*
     * Se due delivery identiche arrivano nello
     * stesso istante, il vincolo UNIQUE su
     * stripe_event_id può far vincere una sola
     * INSERT. In quel caso rileggiamo il record.
     */
    if (
      insertEventError.code ===
      "23505"
    ) {
      const {
        data:
          concurrentEvent,

        error:
          concurrentEventError,
      } = await supabase
        .from(
          "stripe_webhook_events"
        )
        .select(
          `
            id,
            stripe_event_id,
            event_type,
            object_id,
            appointment_id,
            status,
            attempts,
            last_error
          `
        )
        .eq(
          "stripe_event_id",
          stripeEventId
        )
        .single();

      if (
        concurrentEventError
      ) {
        throw concurrentEventError;
      }

      if (
        concurrentEvent.status ===
        "PROCESSED"
      ) {
        return {
          duplicate: true,
          record:
            concurrentEvent as StripeWebhookEventRecord,
        };
      }

      return {
        duplicate: true,
        record:
          concurrentEvent as StripeWebhookEventRecord,
      };
    }

    console.error(
      "Errore registrazione webhook Stripe:",
      {
        stripeEventId,
        eventType,
        message:
          insertEventError.message,
        code:
          insertEventError.code,
        details:
          insertEventError.details,
        hint:
          insertEventError.hint,
      }
    );

    throw insertEventError;
  }

  return {
    duplicate: false,
    record:
      insertedEvent as StripeWebhookEventRecord,
  };
}

async function markStripeEventProcessed(
  eventId: string,
  appointmentId:
    | string
    | null
) {
  const supabase =
    getSupabaseAdmin();

  const now =
    new Date().toISOString();

  const {
    error,
  } = await supabase
    .from(
      "stripe_webhook_events"
    )
    .update({
      appointment_id:
        appointmentId,

      status:
        "PROCESSED",

      last_error:
        null,

      processed_at:
        now,

      updated_at:
        now,
    })
    .eq(
      "id",
      eventId
    );

  if (
    error
  ) {
    console.error(
      "Errore chiusura registro webhook Stripe:",
      {
        eventId,
        appointmentId,
        message:
          error.message,
        code:
          error.code,
        details:
          error.details,
        hint:
          error.hint,
      }
    );

    throw error;
  }
}

async function markStripeEventFailed(
  eventId: string,
  error:
    unknown
) {
  const supabase =
    getSupabaseAdmin();

  const now =
    new Date().toISOString();

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error ===
          "string"
        ? error
        : "Errore sconosciuto durante l'elaborazione del webhook Stripe.";

  const {
    error:
      updateError,
  } = await supabase
    .from(
      "stripe_webhook_events"
    )
    .update({
      status:
        "FAILED",

      last_error:
        errorMessage.slice(
          0,
          4000
        ),

      updated_at:
        now,
    })
    .eq(
      "id",
      eventId
    );

  if (
    updateError
  ) {
    console.error(
      "Errore salvataggio stato FAILED webhook Stripe:",
      {
        eventId,
        message:
          updateError.message,
        code:
          updateError.code,
        details:
          updateError.details,
        hint:
          updateError.hint,
      }
    );
  }
}

async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent
) {
  const appointmentId =
    getAppointmentId(paymentIntent);

  if (!appointmentId) {
    console.error(
      "Webhook Stripe: appointmentId mancante sul pagamento fallito.",
      paymentIntent.id
    );

    return;
  }

  const supabase =
    getSupabaseAdmin();

  const now =
    new Date().toISOString();

  const {
    error,
  } = await supabase
    .from("appointments")
    .update({
      payment_status:
        "PAYMENT_FAILED",

      payment_updated_at:
        now,

      updated_at:
        now,
    })
    .eq(
      "id",
      appointmentId
    )
    .eq(
      "stripe_payment_intent_id",
      paymentIntent.id
    );

  if (error) {
    console.error(
      "Webhook Stripe: errore aggiornamento PAYMENT_FAILED:",
      error
    );

    throw error;
  }

  console.log(
    "❌ Pagamento Stripe fallito:",
    {
      appointmentId,
      paymentIntentId:
        paymentIntent.id,
    }
  );
}

async function handlePaymentCanceled(
  paymentIntent: Stripe.PaymentIntent
) {
  const appointmentId =
    getAppointmentId(paymentIntent);

  if (!appointmentId) {
    return;
  }

  const supabase =
    getSupabaseAdmin();

  const now =
    new Date().toISOString();

  const {
    error,
  } = await supabase
    .from("appointments")
    .update({
      payment_status:
        "REQUIRES_PAYMENT",

      payment_updated_at:
        now,

      updated_at:
        now,
    })
    .eq(
      "id",
      appointmentId
    )
    .eq(
      "stripe_payment_intent_id",
      paymentIntent.id
    );

  if (error) {
    console.error(
      "Webhook Stripe: errore payment_intent.canceled:",
      error
    );

    throw error;
  }
}

async function handleChargeRefunded(
  charge: Stripe.Charge
) {
  /*
   * =====================================================
   * PAYMENT INTENT
   * =====================================================
   */

  const paymentIntentId =
    typeof charge.payment_intent ===
    "string"
      ? charge.payment_intent
      : charge.payment_intent?.id ??
        null;

  if (!paymentIntentId) {
    throw new Error(
      `Charge ${charge.id} rimborsato senza PaymentIntent associato.`
    );
  }

  /*
   * =====================================================
   * RECUPERO REFUND DA STRIPE
   * =====================================================
   *
   * charge.refunded contiene il Charge, mentre
   * syncRefund() lavora sul vero oggetto Refund.
   *
   * Recuperiamo quindi i Refund associati al Charge
   * direttamente da Stripe.
   */

  const stripe =
    getStripe();

  const refunds =
    await stripe.refunds.list({
      charge:
        charge.id,

      limit:
        100,
    });

  if (
    refunds.data.length ===
    0
  ) {
    throw new Error(
      `Charge ${charge.id} risulta rimborsato ma Stripe non restituisce alcun Refund associato.`
    );
  }

  /*
   * =====================================================
   * REFUND FG HOME CARE
   * =====================================================
   *
   * Preferiamo un Refund che contenga il nostro
   * appointmentId nei metadata.
   *
   * Questo evita di sincronizzare accidentalmente
   * eventuali refund estranei al flusso applicativo.
   */

  const refund =
    refunds.data.find(
      (candidate) =>
        candidate.metadata
          ?.fg_home_care_appointment_id
    );

  if (!refund) {
    throw new Error(
      `Nessun Refund FG Home Care trovato per Charge ${charge.id}.`
    );
  }

  /*
   * =====================================================
   * VERIFICA PAYMENT INTENT
   * =====================================================
   */

  const refundPaymentIntentId =
    typeof refund.payment_intent ===
    "string"
      ? refund.payment_intent
      : refund.payment_intent?.id ??
        null;

  if (
    !refundPaymentIntentId ||
    refundPaymentIntentId !==
      paymentIntentId
  ) {
    throw new Error(
      `Refund ${refund.id} non corrisponde al PaymentIntent ${paymentIntentId} del Charge ${charge.id}.`
    );
  }

  /*
   * =====================================================
   * SYNC CONDIVISO
   * =====================================================
   *
   * Nessun UPDATE diretto di appointments.
   *
   * Route di rimborso e webhook utilizzano
   * entrambi lo stesso syncRefund().
   */

  const result =
    await syncRefund(
      refund
    );

  console.log(
    "↩️ Webhook Stripe refund sincronizzato:",
    {
      appointmentId:
        result.appointment.id,

      chargeId:
        charge.id,

      paymentIntentId,

      refundId:
        result.refundId,

      refundAmount:
        result.refundAmount,

      refundPercent:
        result.refundPercent,

      paymentStatus:
        result.paymentStatus,
    }
  );

  return result;
}
export async function POST(
  request: NextRequest
) {
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
      {
        status: 500,
      }
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
      {
        status: 400,
      }
    );
  }

  /*
   * Stripe richiede il payload RAW.
   * NON usare request.json().
   */

  const rawBody =
    await request.text();

  const stripe =
    getStripe();

  let event:
    Stripe.Event;

  try {
    event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
  } catch (error) {
    console.error(
      "❌ Firma webhook Stripe non valida:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Firma webhook non valida.",
      },
      {
        status: 400,
      }
    );
  }

  console.log(
    "📩 Webhook Stripe ricevuto:",
    {
      id:
        event.id,
      type:
        event.type,
    }
  );

  let trackedEvent:
    StripeWebhookEventRecord;

  try {
    const trackingResult =
      await beginStripeEventProcessing(
        event
      );

    trackedEvent =
      trackingResult.record;

    if (
      trackingResult.duplicate
    ) {
      /*
       * Se lo stesso evento è già stato elaborato,
       * rispondiamo 200 a Stripe senza ripetere
       * gli effetti.
       *
       * Se il record è ancora PROCESSING perché
       * un'altra delivery identica è già in corso,
       * la seconda delivery viene ugualmente
       * assorbita: la prima è responsabile
       * dell'elaborazione.
       */
      return NextResponse.json({
        received: true,
        duplicate: true,
        eventId:
          event.id,
        status:
          trackedEvent.status,
      });
    }
  } catch (error) {
    console.error(
      "❌ Impossibile registrare webhook Stripe:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Impossibile registrare il webhook.",
      },
      {
        status: 500,
      }
    );
  }

  let resolvedAppointmentId =
    getStripeAppointmentId(
      event
    );

  try {
    switch (
      event.type
    ) {
      case "payment_intent.succeeded": {
        const paymentIntent =
          event.data
            .object as Stripe.PaymentIntent;

        resolvedAppointmentId =
          getAppointmentId(
            paymentIntent
          );

        const syncResult =
          await syncSucceededPayment(
            paymentIntent
          );

        console.log(
          "✅ payment_intent.succeeded elaborato tramite servizio condiviso:",
          {
            appointmentId:
              syncResult.appointment.id,

            professionalId:
              syncResult.appointment
                .professional_id,

            paymentIntentId:
              paymentIntent.id,

            paymentStatus:
              syncResult.appointment
                .payment_status,

            notificationId:
              syncResult.notificationId,

            notificationCreated:
              syncResult.notificationCreated,
          }
        );

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent =
          event.data
            .object as Stripe.PaymentIntent;

        resolvedAppointmentId =
          getAppointmentId(
            paymentIntent
          );

        await handlePaymentFailed(
          paymentIntent
        );

        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent =
          event.data
            .object as Stripe.PaymentIntent;

        resolvedAppointmentId =
          getAppointmentId(
            paymentIntent
          );

        await handlePaymentCanceled(
          paymentIntent
        );

        break;
      }

      case "charge.refunded": {
        const charge =
          event.data
            .object as Stripe.Charge;

        await handleChargeRefunded(
          charge
        );

        /*
         * Per charge.refunded l'appointmentId
         * non è nei metadata dell'oggetto Charge.
         * Lo recuperiamo dal database tramite il
         * PaymentIntent collegato.
         */
        const paymentIntentId =
          typeof charge.payment_intent ===
          "string"
            ? charge.payment_intent
            : charge.payment_intent?.id ??
              null;

        if (
          paymentIntentId
        ) {
          const supabase =
            getSupabaseAdmin();

          const {
            data:
              refundedAppointment,
          } = await supabase
            .from(
              "appointments"
            )
            .select("id")
            .eq(
              "stripe_payment_intent_id",
              paymentIntentId
            )
            .maybeSingle();

          resolvedAppointmentId =
            refundedAppointment?.id ??
            null;
        }

        break;
      }

      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        if (
          session.mode === "subscription" &&
          session.subscription
        ) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;

          const subscription =
            await getStripe().subscriptions.retrieve(
              subscriptionId
            );

          await syncProfessionalSubscription(
            subscription
          );
        }

        break;
      }

      case "invoice.paid": {
        const invoice =
          event.data.object as Stripe.Invoice;

        await syncSubscriptionInvoice(
          invoice,
          "PAID"
        );

        break;
      }

      case "invoice.payment_failed": {
        const invoice =
          event.data.object as Stripe.Invoice;

        await syncSubscriptionInvoice(
          invoice,
          "FAILED"
        );

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription =
          event.data.object as Stripe.Subscription;

        await syncProfessionalSubscription(
          subscription
        );

        break;
      }

      default:
        console.log(
          `Evento Stripe ignorato: ${event.type}`
        );
    }

    await markStripeEventProcessed(
      trackedEvent.id,
      resolvedAppointmentId
    );

    return NextResponse.json({
      received: true,
      eventId:
        event.id,
      status:
        "PROCESSED",
    });
  } catch (error) {
    console.error(
      "❌ Errore elaborazione webhook Stripe:",
      error
    );

    await markStripeEventFailed(
      trackedEvent.id,
      error
    );

    return NextResponse.json(
      {
        message:
          "Errore elaborazione webhook.",
        eventId:
          event.id,
      },
      {
        status: 500,
      }
    );
  }
}
