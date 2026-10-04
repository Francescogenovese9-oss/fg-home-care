import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  reconcilePendingPayments,
} from "@/lib/payments/reconcile-pending-payments";

import {
  reconcilePendingRefunds,
} from "@/lib/payments/reconcile-pending-refunds";

import {
  remindAppointmentsToComplete,
} from "@/lib/appointments/remind-completion";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function getCronSecret() {
  const secret =
    process.env
      .CRON_SECRET
      ?.trim();

  if (!secret) {
    throw new Error(
      "CRON_SECRET non configurato."
    );
  }

  return secret;
}

function isAuthorized(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  const expectedAuthorization =
    `Bearer ${getCronSecret()}`;

  return (
    authorization ===
    expectedAuthorization
  );
}

async function runReconciliation(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * AUTENTICAZIONE ENDPOINT INTERNO
     * =====================================================
     */

    if (
      !isAuthorized(
        request
      )
    ) {
      console.warn(
        "Tentativo non autorizzato reconciliation automatica."
      );

      return NextResponse.json(
        {
          success:
            false,

          message:
            "Non autorizzato.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * =====================================================
     * RECONCILIATION PAGAMENTI
     * =====================================================
     */

    const payments =
      await reconcilePendingPayments(
        25
      );

    /*
     * =====================================================
     * RECONCILIATION RIMBORSI
     * =====================================================
     *
     * Viene eseguita separatamente dalla reconciliation
     * dei pagamenti perché REFUND_PENDING rappresenta
     * un'operazione finanziaria differente.
     * =====================================================
     */

    const refunds =
      await reconcilePendingRefunds(
        25
      );

    /*
     * =====================================================
     * REMINDER COMPLETAMENTO PRESTAZIONI
     * =====================================================
     *
     * Per le prestazioni:
     * - ACCEPTED
     * - PAID
     * - con orario di fine già trascorso
     *
     * viene creata una notifia al professionista
     * per ricordare la conferma del completamento.
     * =====================================================
     */

    const completionReminders =
      await remindAppointmentsToComplete(
        100
      );

    /*
     * =====================================================
     * REPORT COMPLESSIVO
     * ====================================================
     */

    const summary = {
      scanned:
        payments.scanned +
        refunds.scanned,

      processed:
        payments.processed +
        refunds.processed,

      repaired:
        payments.repaired +
        refunds.repaired,

      anomalies:
        payments.anomalies +
        refunds.anomalies,

      failed:
        payments.failed +
        refunds.failed,
    };

    /*
     * =====================================================
     * LOG
     * =====================================================
     */

    console.log(
      "✅ Reconciation automatica finanziaria completata:",
      {
        summary,

        payments: {
          scanned:
            payments.scanned,

          processed:
            payments.processed,

          repaired:
            payments.repaired,

          anomalies:
            payments.anomalies,

          failed:
            payments.failed,
        },

        refunds: {
          scanned:
            refunds.scanned,

          processed:
            refunds.processed,

          repaired:
            refunds.repaired,

          anomalies:
            refunds.anomalies,

          pending:
            refunds.pending,

          failed:
            refunds.failed,
        },
      }
    );

    /*
     * =====================================================
     * RISPOSTA
     * =====================================================
     */

    return NextResponse.json(
      {
        success:
          true,

        summary,

        payments,

        refunds,

        completionReminders,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "❌ Errore reconciliation automatica finanziaria:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Errore durante la reconciliation automatica.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * POST
 * =========================================================
 *
 * Utile per test manuali e chiamate server-side.
 * =========================================================
 */

export async function POST(
  request: NextRequest
) {
  return runReconciliation(
    request
  );
}

/*
 * =========================================================
 * GET
 * =========================================================
 *
 * Utilizzato dal cron di produzione.
 * =========================================================
 */

export async function GET(
  request: NextRequest
) {
  return runReconciliation(
    request
  );
}
