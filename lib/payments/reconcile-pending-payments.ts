import "server-only";

import {
  reconcileAppointmentPayment,
  type PaymentReconciliationResult,
} from "@/lib/payments/reconcile-payment";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

type BatchItem = {
  appointmentId: string;
  success: boolean;
  result?: PaymentReconciliationResult;
  error?: string;
};

export type PaymentReconciliationBatchResult = {
  scanned: number;
  processed: number;
  repaired: number;
  anomalies: number;
  failed: number;
  items: BatchItem[];
};

type CandidateAppointment = {
  id: string;
};

export async function reconcilePendingPayments(
  limit = 25
): Promise<PaymentReconciliationBatchResult> {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Math.trunc(limit),
        100
      )
    );

  const supabase =
    getSupabaseAdmin();

  /*
   * =====================================================
   * CANDIDATI PRINCIPALI
   * =====================================================
   *
   * Cerchiamo appuntamenti che hanno già
   * unPaymentIntent Stripe ma non risultano
   * stabilmente conclusi.
   * =====================================================
   */

  const {
    data:
      candidateData,

    error:
      candidateError,
  } = await supabase
    .from(
      "appointments"
    )
    .select(
      "id"
    )
    .not(
      "stripe_payment_intent_id",
      "is",
      null
    )
    .in(
      "payment_status",
      [
        "PROCESSING",
        "PAYMENT_FAILED",
        "REQUIRES_PAYMENT",
      ]
    )
    .order(
      "payment_updated_at",
      {
        ascending: true,
        nullsFirst: true,
      }
    )
    .limit(
      safeLimit
    );

  if (
    candidateError
  ) {
    console.error(
      "Errore lettura candidati reconciliation:",
      {
        message:
          candidateError.message,

        code:
          candidateError.code,

        details:
          candidateError.details,

        hint:
          candidateError.hint,
      }
    );

    throw candidateError;
  }

  const candidates =
    (candidateData ??
      []) as CandidateAppointment[];

  /*
   * =====================================================
   * PAID SENZA NOTIFICA
   * =====================================================
   *
   * Controlliamo anche eventuali pagamenti PAID
   * per i quali manca la notifica al professionista.
   * =====================================================
   */

  const remainingSlots =
    Math.max(
      0,
      safeLimit -
        candidates.length
    );

  if (
    remainingSlots > 0
  ) {
    const {
      data:
        paidAppointments,

      error:
        paidAppointmentsError,
    } = await supabase
      .from(
        "appointments"
      )
      .select(
        "id"
      )
      .eq(
        "payment_status",
        "PAID"
      )
      .not(
        "stripe_payment_intent_id",
        "is",
        null
      )
      .order(
        "payment_updated_at",
        {
          ascending: false,
        }
      )
      .limit(
        Math.min(
          100,
          remainingSlots * 5
        )
      );

    if (
      paidAppointmentsError
    ) {
      console.error(
        "Errore controllo appuntamenti PAID:",
        paidAppointmentsError
      );

      throw paidAppointmentsError;
    }

    const paidIds =
      (
        paidAppointments ??
        []
      ).map(
        (appointment) =>
          appointment.id
      );

    if (
      paidIds.length > 0
    ) {
      const {
        data:
          paymentNotifications,

        error:
          paymentNotificationsError,
      } = await supabase
        .from(
          "notifications"
        )
        .select(
          "appointment_id"
        )
        .eq(
          "type",
          "APPOINTMENT_PAYMENT_RECEIVED"
        )
        .in(
          "appointment_id",
          paidIds
        );

      if (
        paymentNotificationsError
      ) {
        console.error(
          "Errore controllo notifiche pagamento:",
          paymentNotificationsError
        );

        throw paymentNotificationsError;
      }

      const notifiedAppointmentIds =
        new Set(
          (
            paymentNotifications ??
            []
          )
            .map(
              (notification) =>
                notification.appointment_id
            )
            .filter(
              (
                appointmentId
              ): appointmentId is string =>
                Boolean(
                  appointmentId
                )
            )
        );

      const missingNotificationCandidates =
        paidIds
          .filter(
            (appointmentId) =>
              !notifiedAppointmentIds.has(
                appointmentId
              )
          )
          .slice(
            0,
            remainingSlots
          )
          .map(
            (id) => ({
              id,
            })
          );

      candidates.push(
        ...missingNotificationCandidates
      );
    }
  }

  /*
   * =====================================================
   * DEDUPLICAZIONE
   * =====================================================
   */

  const appointmentIds =
    Array.from(
      new Set(
        candidates.map(
          (candidate) =>
            candidate.id
        )
      )
    ).slice(
      0,
      safeLimit
    );

  const items:
    BatchItem[] =
    [];

  /*
   * =====================================================
   * RECONCILIATION SEQUENZIALE
   * =====================================================
   *
   * Evitiamo Promise.all massivi per non generare
   * picchi inutili verso Stripe.
   * =====================================================
   */

  for (
    const appointmentId
    of appointmentIds
  ) {
    try {
      const result =
        await reconcileAppointmentPayment(
          appointmentId
        );

      items.push({
        appointmentId,
        success:
          true,
        result,
      });
    } catch (error) {
      console.error(
        "Errore reconciliation automatica appuntamento:",
        {
          appointmentId,
          error,
        }
      );

      items.push({
        appointmentId,
        success:
          false,
        error:
          error instanceof Error
            ? error.message
            : "Errore sconosciuto.",
      });
    }
  }

  /*
   * =====================================================
   * REPORT
   * =====================================================
   */

  const repaired =
    items.filter(
      (item) =>
        item.success &&
        item.result?.repaired
    ).length;

  const anomalies =
    items.filter(
      (item) =>
        item.success &&
        item.result?.anomaly
    ).length;

  const failed =
    items.filter(
      (item) =>
        !item.success
    ).length;

  return {
    scanned:
      appointmentIds.length,

    processed:
      items.filter(
        (item) =>
          item.success
      ).length,

    repaired,

    anomalies,

    failed,

    items,
  };
}
