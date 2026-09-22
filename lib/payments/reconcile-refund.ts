import "server-only";

import Stripe from "stripe";

import {
  syncRefund,
} from "@/lib/payments/sync-refund";

import {
  getStripe,
} from "@/lib/stripe/server";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

type RefundReconciliationAction =
  | "ALREADY_CONSISTENT"
  | "SYNCED_REFUND"
  | "LEFT_PENDING"
  | "ANOMALY";

export type RefundReconciliationResult = {
  appointmentId: string;
  paymentIntentId: string;
  refundId: string | null;

  previousPaymentStatus: string;
  currentPaymentStatus: string;

  action:
    RefundReconciliationAction;

  repaired: boolean;
  anomaly: boolean;
  message: string;
};

type RefundAppointmentRecord = {
  id: string;
  patient_id: string;
  professional_id: string;
  status: string;
  payment_status: string;

  subtotal_amount:
    | number
    | null;

  stripe_payment_intent_id:
    | string
    | null;

  stripe_charge_id:
    | string
    | null;

  stripe_refund_id:
    | string
    | null;

  refund_amount:
    | number
    | null;

  refund_percent:
    | number
    | null;

  cancellation_policy:
    | string
    | null;

  refunded_at:
    | string
    | null;

  cancelled_at:
    | string
    | null;

  payment_updated_at:
    | string
    | null;

  updated_at: string;
};

function getRefundPaymentIntentId(
  refund: Stripe.Refund
) {
  return typeof refund.payment_intent ===
    "string"
    ? refund.payment_intent
    : refund.payment_intent?.id ??
        null;
}

function isFinalRefundStatus(
  paymentStatus: string
) {
  return (
    paymentStatus ===
      "REFUNDED" ||
    paymentStatus ===
      "PARTIALLY_REFUNDED"
  );
}

export async function reconcileAppointmentRefund(
  appointmentId: string
): Promise<RefundReconciliationResult> {
  if (!appointmentId) {
    throw new Error(
      "Identificativo appuntamento mancante."
    );
  }

  const supabase =
    getSupabaseAdmin();

  /*
   * =====================================================
   * APPUNTAMENTO
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
        subtotal_amount,
        stripe_payment_intent_id,
        stripe_charge_id,
        stripe_refund_id,
        refund_amount,
        refund_percent,
        cancellation_policy,
        refunded_at,
        cancelled_at,
        payment_updated_at,
        updated_at
      `
    )
    .eq(
      "id",
      appointmentId
    )
    .maybeSingle();

  if (appointmentError) {
    console.error(
      "Errore lettura appuntamento refund reconciliation:",
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

  if (!appointment) {
    throw new Error(
      `Appuntamento ${appointmentId} non trovato.`
    );
  }

  const currentAppointment =
    appointment as RefundAppointmentRecord;

  const paymentIntentId =
    currentAppointment
      .stripe_payment_intent_id;

  if (!paymentIntentId) {
    throw new Error(
      `L'appuntamento ${appointmentId} non ha un PaymentIntent Stripe associato.`
    );
  }

  /*
   * =====================================================
   * RECUPERO REFUND STRIPE
   * =====================================================
   *
   * Recuperiamo i refund direttamente da Stripe.
   * Stripe resta la fonte autorevole.
   * =====================================================
   */

  const stripe =
    getStripe();

  let refunds:
    Stripe.ApiList<Stripe.Refund>;

  try {
    refunds =
      await stripe.refunds.list({
        payment_intent:
          paymentIntentId,

        limit:
          100,
      });
  } catch (error) {
    console.error(
      "Errore recupero refund Stripe durante reconciliation:",
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
   * REFUND FG HOME CARE
   * =====================================================
   *
   * Preferiamo refund che dichiarano esplicitamente
   * l'appointmentId nei metadata.
   *
   * In questo modo non associamo automaticamente
   * refund estranei al nostro flusso.
   * =====================================================
   */

  const matchingRefunds =
    refunds.data.filter(
      (refund) =>
        refund.metadata
          ?.fg_home_care_appointment_id ===
        appointmentId
    );

  if (
    matchingRefunds.length ===
    0
  ) {
    /*
     * Se siamo REFUND_PENDING ma Stripe non mostra
     * ancora alcun refund FG Home Care, non riportiamo
     * automaticamente il pagamento a PAID.
     *
     * Potrebbe esserci stata una risposta incerta
     * dalla chiamata Stripe.
     */
    if (
      currentAppointment
        .payment_status ===
      "REFUND_PENDING"
    ) {
      return {
        appointmentId,
        paymentIntentId,

        refundId:
          null,

        previousPaymentStatus:
          currentAppointment
            .payment_status,

        currentPaymentStatus:
          currentAppointment
            .payment_status,

        action:
          "LEFT_PENDING",

        repaired:
          false,

        anomaly:
          false,

        message:
          "Nessun refund FG Home Care ancora rilevato su Stripe. Lo stato REFUND_PENDING viene mantenuto.",
      };
    }

    return {
      appointmentId,
      paymentIntentId,

      refundId:
        currentAppointment
          .stripe_refund_id,

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
        "FG Home Care registra uno stato di rimborso, ma Stripe non restituisce alcun refund associato all'appuntamento.",
    };
  }

  /*
   * Un appointment dovrebbe avere un solo refund
   * generato dal nostro flusso.
   *
   * Se Stripe ne contiene più di uno, non scegliamo
   * arbitrariamente quale sincronizzare.
   */
  if (
    matchingRefunds.length >
    1
  ) {
    return {
      appointmentId,
      paymentIntentId,

      refundId:
        null,

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
        `Stripe contiene ${matchingRefunds.length} refund FG Home Care per lo stesso appuntamento. È richiesta una verifica manuale.`,
    };
  }

  const refund =
    matchingRefunds[0];

  const refundPaymentIntentId =
    getRefundPaymentIntentId(
      refund
    );

  if (
    refundPaymentIntentId !==
    paymentIntentId
  ) {
    return {
      appointmentId,
      paymentIntentId,

      refundId:
        refund.id,

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
        "Il refund Stripe non corrisponde al PaymentIntent registrato sull'appuntamento.",
    };
  }

  /*
   * =====================================================
   * REFUND SUCCEEDED
   * =====================================================
   *
   * Solo un refund confermato da Stripe può
   * finalizzare lo stato locale.
   * =====================================================
   */

  if (
    refund.status ===
    "succeeded"
  ) {
    const alreadyConsistent =
      isFinalRefundStatus(
        currentAppointment
          .payment_status
      ) &&
      currentAppointment
        .stripe_refund_id ===
        refund.id &&
      currentAppointment
        .refund_amount ===
        refund.amount;

    const syncResult =
      await syncRefund(
        refund
      );

    return {
      appointmentId,
      paymentIntentId,

      refundId:
        refund.id,

      previousPaymentStatus:
        currentAppointment
          .payment_status,

      currentPaymentStatus:
        syncResult.paymentStatus,

      action:
        alreadyConsistent
          ? "ALREADY_CONSISTENT"
          : "SYNCED_REFUND",

      repaired:
        !alreadyConsistent,

      anomaly:
        false,

      message:
        alreadyConsistent
          ? "Rimborso già coerente con Stripe."
          : "Rimborso riallineato utilizzando lo stato confermato da Stripe.",
    };
  }

  /*
   * ====================================================
   * REFUND PENDING
   * =====================================================
   */

  if (
    refund.status ===
    "pending"
  ) {
    return {
      appointmentId,
      paymentIntentId,

      refundId:
        refund.id,

      previousPaymentStatus:
        currentAppointment
          .payment_status,

      currentPaymentStatus:
        currentAppointment
          .payment_status,

      action:
        "LEFT_PENDING",

      repaired:
        false,

      anomaly:
        false,

      message:
        "Stripe sta ancora elaborando il rimborso. Nessuna modifica automatica effettuata.",
    };
  }

  /*
   * =====================================================
   * REFUND FAILED / CANCELED / STATO NON ATTESO
   * =====================================================
   *
   * Non riportiamo automaticamente a PAID:
   * un errore finanziario richiede verifica esplicita.
   * =====================================================
   */

  return {
    appointmentId,
    paymentIntentId,

    refundId:
      refund.id,

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
      `Stripe riporta il refund ${refund.id} nello stato ${refund.status ?? "sconosciuto"}. Nessuna modifica automatica effettuata.`,
  };
}
