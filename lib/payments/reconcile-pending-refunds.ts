import "server-only";

import {
  reconcileAppointmentRefund,
  type RefundReconciliationResult,
} from "@/lib/payments/reconcile-refund";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

type BatchItem = {
  appointmentId: string;
  success: boolean;
  result?: RefundReconciliationResult;
  error?: string;
};

export type RefundReconciliationBatchResult = {
  scanned: number;
  processed: number;
  repaired: number;
  anomalies: number;
  pending: number;
  failed: number;
  items: BatchItem[];
};

type CandidateAppointment = {
  id: string;
};

export async function reconcilePendingRefunds(
  limit = 25
): Promise<RefundReconciliationBatchResult> {
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
   * CANDIDATI REFUND_PENDING
   * =====================================================
   *
   * Questi sono gli appuntamenti per i quali FG Home Care
   * ha iniziato un rimborso ma non ha ancora registrato
   * uno stato finale.
   *
   * Non riportiamo mai automaticamente questi record
   * a PAID: Stripe verrà interrogato come fonte autorevole.
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
    .eq(
      "payment_status",
      "REFUND_PENDING"
    )
    .not(
      "stripe_payment_intent_id",
      "is",
      null
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
      "Errore lettura candidati refund reconciliation:",
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
   * Come per i pagamenti, evitiamo Promise.all massivi
   * per non generare picchi di richieste verso Stripe.
   * =====================================================
   */

  for (
    const appointmentId
    of appointmentIds
  ) {
    try {
      const result =
        await reconcileAppointmentRefund(
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
        "Errore reconciliation automatica refund appuntamento:",
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

  const pending =
    items.filter(
      (item) =>
        item.success &&
        item.result?.action ===
          "LEFT_PENDING"
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

    pending,

    failed,

    items,
  };
}
