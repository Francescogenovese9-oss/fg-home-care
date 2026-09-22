import "server-only";

import Stripe from "stripe";

import { syncSucceededPayment } from "@/lib/payments/sync-succeeded-payment";
import { getStripe } from "@/lib/stripe/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ReconciliationAction =
  | "ALREADY_CONSISTENT"
  | "SYNCED_PAID"
  | "LEFT_PROCESSING"
  | "LEFT_PENDING_PAYMENT"
  | "SYNCED_CANCELED"
  | "ANOMALY";

export type PaymentReconciliationResult = {
  appointmentId: string;

  paymentIntentId: string;

  stripeStatus: Stripe.PaymentIntent.Status;

  previousPaymentStatus: string;

  currentPaymentStatus: string;

  action: ReconciliationAction;

  repaired: boolean;

  anomaly: boolean;

  message: string;

  notificationId?: string | null;

  notificationCreated?: boolean;
};

type AppointmentRecord = {
  id: string;
  patient_id: string;
  professional_id: string;
  status: string;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  paid_at: string | null;
  payment_updated_at: string | null;
  updated_at: string;
};

function isPaidLikeStatus(
  status: string
) {
  return (
    status === "PAID" ||
    status === "REFUND_PENDING" ||
    status === "REFUNDED" ||
    status === "PARTIALLY_REFUNDED"
  );
}

function isStripePendingPaymentStatus(
  status: Stripe.PaymentIntent.Status
) {
  return (
    status ===
      "requires_payment_method" ||
    status ===
      "requires_confirmation" ||
    status ===
      "requires_action" ||
    status ===
      "requires_capture"
  );
}

export async function reconcileAppointmentPayment(
  appointmentId: string
): Promise<PaymentReconciliationResult> {
  if (!appointmentId) {
    throw new Error(
      "Identificativo appuntamento mancante."
    );
  }

  const supabase =
    getSupabaseAdmin();

  /*
   * =====================================================
   * LETTURA APPUNTAMENTO
   * =====================================================
   */

  const {
    data:
      appointment,

    error:
      appointmentError,
  } = await supabase
    .from(
      "appointments"
    )
    .select(
      `
        id,
        patient_id,
        professional_id,
        status,
        payment_status,
        stripe_payment_intent_id,
        stripe_charge_id,
        paid_at,
        payment_updated_at,
        updated_at
      `
    )
    .eq(
      "id",
      appointmentId
    )
    .maybeSingle();

  if (
    appointmentError
  ) {
    console.error(
      "Errore lettura appuntamento reconciliation:",
      {
        appointmentId,

        message:
          appointmentError.message,

        code:
          appointmentError.code,

        details:
          appointmentError.details,

        hint:
          appointmentError.hint,
      }
    );

    throw appointmentError;
  }

  if (
    !appointment
  ) {
    throw new Error(
      `Appuntamento ${appointmentId} non trovato.`
    );
  }

  const currentAppointment =
    appointment as AppointmentRecord;

  /*
   * =====================================================
   * PAYMENT INTENT
   * =====================================================
   */

  if (
    !currentAppointment
      .stripe_payment_intent_id
  ) {
    throw new Error(
      `L'appuntamento ${appointmentId} non ha un PaymentIntent Stripe associato.`
    );
  }

  const paymentIntentId =
    currentAppointment
      .stripe_payment_intent_id;

  const stripe =
    getStripe();

  let paymentIntent:
    Stripe.PaymentIntent;

  try {
    paymentIntent =
      await stripe
        .paymentIntents
        .retrieve(
          paymentIntentId
        );
  } catch (error) {
    console.error(
      "Errore recupero PaymentIntent durante reconciliation:",
      {
        appointmentId,
        paymentIntentId,
        error,
      }
    );

    throw error;
  }

  /*
   * =====================================================
   * VERIFICA METADATA
   * =====================================================
   */

  const stripeAppointmentId =
    paymentIntent.metadata
      ?.fg_home_care_appointment_id ??
    null;

  if (
    stripeAppointmentId !==
    appointmentId
  ) {
    return {
      appointmentId,

      paymentIntentId,

      stripeStatus:
        paymentIntent.status,

      previousPaymentStatus:
        currentAppointment
          .payment_status,

      currentPaymentStatus:
        currentAppointment
          .payment_status,

      action:
        "ANOMALY",

      repaired:
        false,

      anomaly:
        true,

      message:
        "Il PaymentIntent Stripe non corrisponde all'appuntamento registrato su FG Home Care.",
    };
  }

  /*
   * =====================================================
   * STRIPE SUCCEEDED
   * =====================================================
   *
   * Stripe è la fonte autorevole
   *
   * Se Stripe conferma succeeded,
   * possiamo sincronizzare in sicurezza.
   * =====================================================
   */

  if (
    paymentIntent.status ===
    "succeeded"
  ) {
    const syncResult =
      await syncSucceededPayment(
        paymentIntent
      );

    const wasAlreadyPaid =
      currentAppointment
        .payment_status ===
      "PAID";

    return {
      appointmentId,

      paymentIntentId,

      stripeStatus:
        paymentIntent.status,

      previousPaymentStatus:
        currentAppointment
          .payment_status,

      currentPaymentStatus:
        syncResult
          .appointment
          .payment_status,

      action:
        wasAlreadyPaid
          ? "ALREADY_CONSISTENT"
          : "SYNCED_PAID",

      repaired:
        !wasAlreadyPaid ||
        syncResult
          .notificationCreated,

      anomaly:
        false,

      message:
        wasAlreadyPaid
          ? "Pagamento già coerente con Stripe."
         : "Pagamento riallineato a PAID utilizzando lo stato confermato da Stripe.",

      notificationId:
        syncResult
          .notificationId,

      notificationCreated:
        syncResult
          .notificationCreated,
    };
  }

  /*
   * =====================================================
   * PROTEZIONE STATO PAID
   * =====================================================
   *
   * Se FG Home Care dice PAID ma Stripe non dice
   * succeeded, NON effettuiamo correzioni automatiche.
   *
   * È un'anomalia finanziaria da investigare.
   * ====================================================
   */

  if (
    isPaidLikeStatus(
      currentAppointment
        .payment_status
    )
  ) {
    return {
      appointmentId,

      paymentIntentId,

      stripeStatus:
        paymentIntent.status,

      previousPaymentStatus:
        currentAppointment
          .payment_status,

      currentPaymentStatus:
        currentAppointment
          .payment_status,

      action:
        "ANOMALY",

      repaired:
        false,

      anomaly:
        true,

      message:
        `FG Home Care risulta ${currentAppointment.payment_status}, ma Stripe riporta ${paymentIntent.status}. Nessuna modifica automatica effettuata.`,
    };
  }

  /*
   * =====================================================
   * STRIPE PROCESSING
   * =====================================================
   */

  if (
    paymentIntent.status ===
    "processing"
  ) {
    const now =
      new Date().toISOString();

    if (
      currentAppointment
        .payment_status !==
      "PROCESSING"
    ) {
      const {
        error:
          processingUpdateError,
      } = await supabase
        .from(
          "appointments"
        )
        .update({
          payment_status:
            "PROCESSING",

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
          paymentIntentId
        );

      if (
        processingUpdateError
      ) {
        throw processingUpdateError;
      }
    }

    return {
      appointmentId,

      paymentIntentId,

      stripeStatus:
        paymentIntent.status,

      previousPaymentStatus:
        currentAppointment
          .payment_status,

      currentPaymentStatus:
        "PROCESSING",

      action:
        "LEFT_PROCESSING",

      repaired:
        currentAppointment
          .payment_status !==
        "PROCESSING",

      anomaly:
        false,

      message:
        "Stripe sta ancora elaborando il pagamento.",
    };
  }

  /*
   * =====================================================
   * PAGAMENTO ANCORA DA COMPLETARE
   * =====================================================
   */

  if (
    isStripePendingPaymentStatus(
      paymentIntent.status
    )
  ) {
    return {
      appointmentId,

      paymentIntentId,

      stripeStatus:
        paymentIntent.status,

      previousPaymentStatus:
        currentAppointment
          .payment_status,

      currentPaymentStatus:
        currentAppointment
          .payment_status,

      action:
        "LEFT_PENDING_PAYMENT",

      repaired:
        false,

      anomaly:
        false,

      message:
        `Il pagamento non è ancora completato su Stripe (${paymentIntent.status}).`,
    };
  }

  /*
   * =====================================================
   * PAYMENT INTET CANCELED
   * =====================================================
   */

  if (
    paymentIntent.status ===
    "canceled"
  ) {
    const now =
      new Date().toISOString();

    const {
      error:
        canceledUpdateError,
    } = await supabase
      .from(
        "appointments"
      )
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
        paymentIntentId
      );

    if (
      canceledUpdateError
    ) {
      console.error(
        "Errore reconciliation PaymentIntent cancellato:",
        {
          appointmentId,

          paymentIntentId,

          message:
            canceledUpdateError.message,

          code:
            canceledUpdateError.code,

          details:
            canceledUpdateError.details,

          hint:
            canceledUpdateError.hint,
        }
      );

      throw canceledUpdateError;
    }

    return {
      appointmentId,

      paymentIntentId,

      stripeStatus:
        paymentIntent.status,

      previousPaymentStatus:
        currentAppointment
          .payment_status,

      currentPaymentStatus:
        "REQUIRES_PAYMENT",

      action:
        "SYNCED_CANCELED",

      repaired:
        currentAppointment
          .payment_status !==
        "REQUIRES_PAYMENT",

      anomaly:
        false,

      message:
        "Il PaymentIntent Stripe è stato cancellato. La prenotazione è stata riportata allo stato da pagare.",
    };
  }

  /*
   * =====================================================
   * STATO NON PREVISTO
   * =====================================================
   */

  return {
    appointmentId,

    paymentIntentId,

    stripeStatus:
      paymentIntent.status,

    previousPaymentStatus:
      currentAppointment
        .payment_status,

    currentPaymentStatus:
      currentAppointment
        .payment_status,

    action:
      "ANOMALY",

    repaired:
      false,

    anomaly:
      true,

    message:
      `Stato Stripe non gestito automaticamente: ${paymentIntent.status}.`,
  };
}