import {
  NextRequest,
  NextResponse,
} from "next/server";

import { calculateCancellationPolicy } from "@/lib/payments/cancellation-policy";
import { calculateRefundAmount } from "@/lib/payments/calculate-refund";
import { syncRefund } from "@/lib/payments/sync-refund";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

type RequestBody = {
  appointmentId?: string;
};

type RefundClaimRow = {
  claimed: boolean;
  appointment_id: string;
  payment_status: string | null;
};

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        {
          message:
            "Richiesta non valida.",
        },
        { status: 400 }
      );
    }

    if (!body.appointmentId) {
      return NextResponse.json(
        {
          message:
            "Prenotazione mancante.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * AUTENTICAZIONE
     * =====================================================
     */

    const supabase =
      await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          message:
            "Utente non autenticato.",
        },
        { status: 401 }
      );
    }

    /*
     * =====================================================
     * RUOLO
     * =====================================================
     */

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Errore lettura profilo durante rimborso:",
        profileError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare il profilo.",
        },
        { status: 500 }
      );
    }

    if (
      profile?.role !==
      "PATIENT"
    ) {
      return NextResponse.json(
        {
          message:
            "Solo il paziente può annullare questa prenotazione.",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * LETTURA PRENOTAZIONE
     * ====================================================
     */

    const {
      data: appointment,
      error: appointmentError,
    } = await supabase
      .from("appointments")
      .select(
        `
          id,
          patient_id,
          professional_id,
          status,
          payment_status,
          appointment_date,
          appointment_time,
          subtotal_amount,
          stripe_payment_intent_id,
          stripe_refund_id,
          refund_amount,
          refund_percent
        `
      )
      .eq(
        "id",
        body.appointmentId
      )
      .maybeSingle();

    if (appointmentError) {
      console.error(
        "Errore lettura prenotazione:",
        appointmentError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile leggere la prenotazione.",
        },
        { status: 500 }
      );
    }

    if (!appointment) {
      return NextResponse.json(
        {
          message:
            "Prenotazione non trovata.",
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * OWNERSHIP
     * =====================================================
     */

    if (
      appointment.patient_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          message:
            "Non puoi annullare questa prenotazione.",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * STATO PRENOTAZIONE
     * =====================================================
     */

    if (
      appointment.status !==
      "ACCEPTED"
    ) {
      return NextResponse.json(
        {
          message:
            "Puoi annullare soltanto una prenotazione accettata.",
        },
        { status: 409 }
      );
    }

    /*
     * =====================================================
     * POLICY CANCELLAZIONE
     * =====================================================
     */

    const policy =
      calculateCancellationPolicy({
        appointmentDate:
          appointment.appointment_date,

        appointmentTime:
          appointment.appointment_time,
      });

    const admin =
      getSupabaseAdmin();

    const now =
      new Date().toISOString();

    /*
     * =====================================================
     * PRENOTAZIONE NON PAGATA
     * =====================================================
     *
     * Nessun rimborso Stripe.
     */

    if (
      appointment.payment_status ===
        "REQUIRES_PAYMENT" ||
      appointment.payment_status ===
        "PAYMENT_FAILED"
    ) {
      const {
        data: cancelledAppointment,
        error: cancelError,
      } = await admin
        .from("appointments")
        .update({
          status:
            "CANCELLED",

          payment_status:
            "CANCELLED",

          refund_amount:
            0,

          refund_percent:
            0,

          cancellation_policy:
            "Prenotazione non pagata.",

          cancelled_at:
            now,

          payment_updated_at:
            now,

          updated_at:
            now,
        })
        .eq(
          "id",
          appointment.id
        )
        .eq(
          "patient_id",
          user.id
        )
        .eq(
          "status",
          "ACCEPTED"
        )
        .in(
          "payment_status",
          [
            "REQUIRES_PAYMENT",
            "PAYMENT_FAILED",
          ]
        )
        .select(
          `
            id,
            status,
            payment_status,
            refund_amount,
            refund_percent,
            stripe_refund_id
          `
        )
        .maybeSingle();

      if (cancelError) {
        throw cancelError;
      }

      if (!cancelledAppointment) {
        return NextResponse.json(
          {
            message:
              "La prenotazione non è più disponibile per l'annullamento.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,

        refunded: false,

        refundPercent: 0,

        refundAmount: 0,

        appointment:
          cancelledAppointment,

        message:
        "Prenotazione annullata.",
      });
    }

    /*
     * =====================================================
     * RIMBORSO GIÀ COMPLETATO
     * =====================================================
     */

    if (
      appointment.payment_status ===
        "REFUNDED" ||
      appointment.payment_status ===
        "PARTIALLY_REFUNDED"
    ) {
      return NextResponse.json(
        {
          message:
            "Questa prenotazione risulta già rimborsata.",
        },
        { status: 409 }
      );
    }

    /*
     * =====================================================
     * RIMBORSO GIÀ IN CORSO
     * =====================================================
   */

    if (
      appointment.payment_status ===
      "REFUND_PENDING"
    ) {
      return NextResponse.json(
        {
          message:
            "Il rimborso è già in elaborazione.",
        },
        { status: 409 }
      );
    }

    /*
     * Da questo punto in poi accettiamo
     * esclusivamente pagamenti PAID.
     */

    if (
      appointment.payment_status !==
      "PAID"
  ) {
      return NextResponse.json(
        {
          message:
            "Questa prenotazione non può essere annullata con rimborso.",
        },
        { status: 409 }
      );
    }

    /*
     * ====================================================
     * IMPORTO
     * =====================================================
     */

    if (
      appointment.subtotal_amount ===
      null
    ) {
      return NextResponse.json(
        {
          message:
            "Importo della prestazione mancante.",
        },
        { status: 500 }
      );
    }

    /*
     * =====================================================
     * CANCELLAZIONE SENZA RIMBORSO
     * =====================================================
     *
     * Il pagamento rimane PAID perché
     * il denaro non viene restituito.
     */

    if (
      !policy.refundAllowed ||
      policy.refundPercent === 0
    ) {
      const {
        data: cancelledAppointment,
        error: noRefundError,
      } = await admin
        .from("appointments")
        .update({
          status:
            "CANCELLED",

          payment_status:
            "PAID",

          refund_amount:
            0,

          refund_percent:
            0,

          cancellation_policy:
            policy.policyLabel,

          cancelled_at:
            now,

          payment_updated_at:
            now,

          updated_at:
            now,
        })
        .eq(
          "id",
          appointment.id
        )
        .eq(
          "patient_id",
          user.id
        )
        .eq(
          "status",
          "ACCEPTED"
        )
        .eq(
          "payment_status",
          "PAID"
        )
        .select(
          `
            id,
            status,
            payment_status,
            refund_amount,
            refund_percent,
            stripe_refund_id
          `
        )
        .maybeSingle();

      if (noRefundError) {
        throw noRefundError;
      }

      if (!cancelledAppointment) {
        return NextResponse.json(
          {
            message:
              "La prenotazione non è più disponibile per l'annullamento.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,

        refunded: false,

        refundPercent: 0,

        refundAmount: 0,

        appointment:
          cancelledAppointment,

        message:
          "Prenotazione annullata. In base alla policy non è previsto alcun rimborso.",
      });
    }

    /*
     * =====================================================
     * PAYMENT INTENT
     * =====================================================
     */

    if (
      !appointment
        .stripe_payment_intent_id
    ) {
      return NextResponse.json(
        {
          message:
            "PaymentIntent Stripe mancante.",
        },
        { status: 500 }
      );
    }

    /*
     * =====================================================
     * CALCOLO RIMBORSO
     * =====================================================
     */

    const refundAmount =
      calculateRefundAmount({
        subtotalAmount:
          appointment.subtotal_amount,

        refundPercent:
          policy.refundPercent,
      });

    if (refundAmount <= 0) {
      return NextResponse.json(
        {
          message:
            "L'importo del rimborso non è valido.",
        },
        { status: 500 }
      );
    }

    /*
     * =====================================================
     * CLAIM ATOMICO DEL RIMBORSO
     * ====================================================
     *
     * PostgreSQL può effettuare:
     *
     * PAID -> REFUND_PENDING
     *
     * una sola volta.
     *
     * Solo la richiesta che ottiene
     * claimed=true può procedere verso ripe.
     */

    const {
      data: claimData,
      error: claimError,
    } = await admin.rpc(
      "claim_appointment_refund",
      {
        p_appointment_id:
          appointment.id,

        p_patient_id:
          user.id,
      }
    );

    if (claimError) {
      console.error(
        "Errore claim rimborso:",
        claimError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile avviare il rimborso.",
        },
        { status: 500 }
      );
    }

    const claim =
      (
        claimData as
          | RefundClaimRow[]
          | null
      )?.[0] ?? null;

    if (!claim?.claimed) {
      if (
        claim?.payment_status ===
        "REFUND_PENDING"
      ) {
        return NextResponse.json(
          {
            message:
              "Il rimborso è già in elaborazione.",
          },
          { status: 409 }
        );
      }

      if (
        claim?.payment_status ===
          "REFUNDED" ||
        claim?.payment_status ===
          "PARTIALLY_REFUNDED"
      ) {
        return NextResponse.json(
          {
          message:
              "Questa prenotazione risulta già rimborsata.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          message:
            "La prenotazione non è più disponibile per il rimborso.",
        },
        { status: 409 }
      );
    }

    /*
     * ==================================================
     * STRIPE REFUND
     * =====================================================
     *
     * Da questo momento il database è già
     * REFUND_PENDING.
     *
     * Una seconda richiesta concorrente non
     * può quindi arrivare a Stripe.
     */

    const stripe =
      getStripe();

    let refund;

    try {
      refund =
        await stripe.refunds.create(
          {
            payment_intent:
              appointment
                .stripe_payment_intent_id,

            amount:
              refundAmount,

            reverse_transfer:
              true,

            refund_application_fee:
              true,

            metadata: {
              fg_home_care_appointment_id:
                appointment.id,

              fg_home_care_patient_id:
                user.id,

              fg_home_care_professional_id:
                appointment.professional_id,

              fg_home_care_refund_percent:
                String(
                  policy.refundPercent
                ),
            },
          },
          {
            /*
             * Secondo livello di idempotenza.
             *
             * Anche Stripe protegge dai retry
             * della stessa operazione.
             */
            idempotencyKey:
              `fg-home-care-cancellation-${appointment.id}-${policy.refundPercent}`,
          }
        );
    } catch (stripeError) {
      /*
       * NON riportiamo automaticamente
       * REFUND_PENDING -> PAID.
       *
       * Non possiamo assumere che Stripe
       * non abbia ricevuto o elaborato la
       * richiesta prima di un eventuale
       * errore di rete.
       *
       * REFUND_PENDING rimane quindi lo stato
       * sicuro finché webhook/reconciliation
       * non stabiliscono la verità  Stripe.
       */

      console.error(
        "Errore creazione rimborso Stripe:",
        stripeError
      );

      return NextResponse.json(
        {
          message:
            "Il rimborso è stato preso in carico ma non è ancora possibile confermarne l'esito. Lo stato verrà sincronizzato automaticamente.",
        },
        { status: 202 }
      );
 }

    /*
     * =====================================================
     * REFUND NON ANCORA CONCLUSO
     * =====================================================
     *
     * Manteniamo REFUND_PENDING.
     * Webhook/reconciliation completeranno
     * successivamente la sincronizzazione.
     */

    if (
      refund.status !==
      "succeeded"
    ) {
      return NextResponse.json(
        {
          success: true,

          refunded: false,

          refundId:
            refund.id,

          refundPercent:
            policy.refundPercent,

          refundAmount,

          message:
            "Prenotazione annullata. Rimborso in elaborazione.",
        },
        { status: 202 }
      );
    }

    /*
     * =====================================================
     * SYNC REFUND CONDIVISO
     * =====================================================
     *
     * La route non aggiorna direttamente lo stato
     * finale del rimborso.
     *
     * syncRefund() diventa il punto unico che
     * sincronizza Stripe -> appointments.
     */

    let syncResult;

    try {
      syncResult =
        await syncRefund(
          refund
        );
    } catch (syncError) {
      /*
       * Stripe ha già confermato il rimborso.
       *
       * Non riportiamo REFUND_PENDING -> PAID.
       * Webhook/rconciliation potranno
       * recuperare la sincronizzazione.
       */

      console.error(
        "Stripe ha elaborato il rimborso ma syncRefund non è riuscito a sincronizzarlo:",
        {
          appointmentId:
            appointment.id,

          refundId:
            refund.id,

          error:
            syncError instanceof Error
             ? syncError.message
              : syncError,
        }
      );

      return NextResponse.json(
        {
          message:
            "Stripe ha elaborato il rimborso ma FG Home Care non è riuscito a sincronizzare i dati. La sincronizzazione verrà recuperata automaticamente.",
        },
        { status: 500 }
    );
    }

    /*
     * =====================================================
     * RISPOSTA
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      refunded: true,

      refundId:
        syncResult.refundId,

      refundPercent:
        syncResult.refundPercent,

      refundAmount:
        syncResult.refundAmount,

      appointment:
        syncResult.appointment,

      message:
        syncResult.fullRefund
          ? "Prenotazione annullata e rimborso completo effettuato."
          : syncResult.refundPercent ===
            50
            ? "Prenotazione annullata e rimborso del 50% effettuato."
            : `Prenotazione annullata e rimborso del ${syncResult.refundPercent}% effettuato.`,
    });
  } catch (error) {
    console.error(
      "Errore cancellazione/rimborso prenotazione:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Impossibile annullare la prenotazione.",
      },
      { status: 500 }
    );
  }
}
