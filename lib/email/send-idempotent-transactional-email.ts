import "server-only";

import {
  sendTransactionalEmail,
} from "@/lib/email/send-transactional-email";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

type Recipient = {
  email: string;
  name?: string;
};

type SendIdempotentTransactionalEmailInput = {
  eventKey: string;
  eventType: string;

  to: Recipient[];

  subject: string;
  htmlContent: string;
  textContent: string;

  recipientUserId?: string | null;
  appointmentId?: string | null;
};

export type SendIdempotentTransactionalEmailResult = {
  success: boolean;
  sent: boolean;
  skipped: boolean;

  eventId: string | null;
  messageId: string | null;

  attempts: number | null;
  error: string | null;
};

type ClaimResult = {
  event_id: string;
  should_send: boolean;
  current_status: string;
  current_attempts: number;
};

export async function sendIdempotentTransactionalEmail({
  eventKey,
  eventType,
  to,
  subject,
  htmlContent,
  textContent,
  recipientUserId = null,
  appointmentId = null,
}: SendIdempotentTransactionalEmailInput): Promise<SendIdempotentTransactionalEmailResult> {
  /*
   * =====================================================
   * VALIDAZIONE
   * =====================================================
   */

  const normalizedEventKey =
    eventKey.trim();

  const normalizedEventType =
    eventType.trim();

  if (!normalizedEventKey) {
    throw new Error(
      "eventKey email transazionale mancante."
    );
  }

  if (!normalizedEventType) {
    throw new Error(
      "eventType email transazionale mancante."
    );
  }

  if (
    !Array.isArray(to) ||
    to.length !== 1
  ) {
    throw new Error(
      "L'invio idempotente richiede esattamente un destinatario."
    );
  }

  const recipient =
    to[0];

  const recipientEmail =
    recipient.email
      ?.trim()
      .toLowerCase();

  if (!recipientEmail) {
    throw new Error(
      "Email destinatario mancante."
    );
  }

  /*
   * =====================================================
   * SUPABASE ADMIN
   * =====================================================
   */

  const supabase =
    getSupabaseAdmin();

  /*
   * =====================================================
   * CLAIM ATOMICO
   * =====================================================
   *
   * La funzione PostgreSQL decide atomicamente se questo
   * processo può effettuare l'invio.
   *
   * Possibili casi:
   *
   * - evento nuovo        → should_send =ue
   * - evento SENT         → should_send = false
   * - PENDING recente     → should_send = false
   * - FD              → should_send = true
   * - PENDING scaduto     → should_send = true
   * =====================================================
   */

  const {
    data:
      claimData,

    error:
      claimError,
  } = await supabase.rpc(
    "claim_transactional_email_event",
    {
      p_event_key:
        normalizedEventKey,

      p_event_type:
        normalizedEventType,

      p_recipient_email:
        recipientEmail,

      p_recipient_user_id:
        recipientUserId,

      p_appointment_id:
        appointmentId,
    }
  );

  if (claimError) {
    console.error(
      "Errore claim email transazionale:",
      {
        eventKey:
          normalizedEventKey,

        eventType:
          normalizedEventType,

        appointmentId,

        recipientEmail,

        message:
          claimError.message,

        code:
          claimError.code,

        details:
          claimError.details,

        hint:
          claimError.hint,
      }
    );

    throw claimError;
  }

  const claim =
    Array.isArray(claimData)
      ? (
          claimData[0] as
            | ClaimResult
            | undefined
        )
      : (
          claimData as
            | ClaimResult
            | null
        );

  if (!claim?.event_id) {
    throw new Error(
      `Claim email transazionale senza event_id per ${normalizedEventKey}.`
    );
  }

  /*
   * =====================================================
   * EVENTO GIÀ GESTITO / IN CORSO
   * =====================================================
   */

  if (!claim.should_send) {
    console.log(
      "ℹ️ Email transazionale non reinviata:",
      {
        eventKey:
          normalizedEventKey,

        eventType:
          normalizedEventType,
    eventId:
          claim.event_id,

        status:
          claim.current_status,

        attempts:
          claim.current_attempts,
      }
    );

    return {
      success:
        true,

      sent:
        false,

      skipped:
        true,

      eventId:
        claim.event_id,

      messageId:
        null,

      attempts:
        claim.current_attempts,

      error:
        null,
    };
  }

  /*
   * =====================================================
   * INVIO BREVO
   * =====================================================
   */

  let emailResult:
    Awaited<
      ReturnType<
        typeof sendTransactionalEmail
      >
    >;

  try {
    emailResult =
      await sendTransactionalEmail({
        to: [
          {
            email:
              recipientEmail,

            name:
              recipient.name,
          },
        ],

        subject,
        htmlContent,
        textContent,

        eventName:
          normalizedEventType,

        referenceId:
          appointmentId ??
          normalizedEventKey,
      });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Errore sconosciuto durante invio email.";

    /*
     * Anche un'eccezione imprevista deve liberare
     * l'evento PENDING portandolo a FAILED.
     */

    const {
      error:
        failedUpdateError,
    } = await supabase
      .from(
        "transactional_email_events"
      )
      .update({
        status:
          "FAILED",

        last_error:
          errorMessage,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        claim.event_id
      )
      .eq(
        "status",
        "PENDING"
      );

    if (failedUpdateError) {
      console.error(
        "Errore aggiornamento evento email a FAILED:",
        {
          eventId:
            claim.event_id,

          eventKey:
            normalizedEventKey,

          message:
            failedUpdateError.message,
        }
      );
    }

    console.error(
      "Errore inatteso invio email idempotente:",
      {
        eventId:
          claim.event_id,

        eventKey:
          normalizedEventKey,

        message:
          errorMessage,
      }
    );

    return {
      success:
        false,

      sent:
        false,

      skipped:
        false,

      eventId:
        claim.event_id,

      messageId:
        null,

      attempts:
        claim.current_attempts,

      error:
        errorMessage,
    };
  }

  /*
   * =====================================================
   * BREVO HA RIFIUTATO L'INVIO
   * =====================================================
   */

  if (!emailResult.success) {
    const errorMessage =
      emailResult.error ??
      "Invio email non riuscito.";

    const {
      error:
        failedUpdateError,
    } = await supabase
      .from(
        "transactional_email_events"
      )
      .update({
        status:
          "FAILED",

        last_error:
          errorMessage,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        claim.event_id
      )
      .eq(
        "status",
        "PENDING"
      );

    if (failedUpdateError) {
      console.error(
        "Email fallita e impossibile aggiornare il relativo evento:",
        {
          eventId:
            claim.event_id,

          eventKey:
            normalizedEventKey,

          message:
            failedUpdateError.message,
        }
      );
    }

    return {
      success:
        false,

      sent:
        false,

      skipped:
        false,

      eventId:
        claim.event_id,

      messageId:
        null,

      attempts:
        claim.current_attempts,

      error:
        errorMessage,
    };
  }

  /*
   * =====================================================
   * INVIO COMPLETATO → SENT
   * =====================================================
   */

  const now =
    new Date().toISOString();

  const {
    error:
    sentUpdateError,
  } = await supabase
    .from(
      "transactional_email_events"
    )
    .update({
      status:
        "SENT",

      brevo_message_id:
        emailResult.messageId ??
        null,

      last_error:
        null,

      sent_at:
        now,

      updated_at:
        now,
    })
    .eq(
      "id",
      claim.event_id
    )
    .eq(
      "status",
      "PENDING"
    );

  if (sentUpdateError) {
    /*
     * ATTENZIONE:
     *
     * Brevo ha già accettato l'email.
     * Non dobbiamo dichiarare semplicemente "inio fallito",
     * perché un retry potrebbe generare un duplicato.
     *
     * Lasciamo l'evento PENDING: il imeout protegge
     * temporaneamente dai retry immediati e il problema
     * sarà visibile nei log/reconiliation.
     */

    console.error(
      "⚠️ Email inviata da Brevo ma evento non aggiornato a SENT:",
      {
        eventId:
          claim.event_id,

        eventKey:
          normalizedEventKey,

        messageId:
          emailResult.messageId,

        message:
          sentUpdateError.message,

        code:
      sentUpdateError.code,
      }
    );

    return {
      success:
        false,

      sent:
        true,

      skipped:
        false,

      eventId:
        claim.event_id,

      messageId:
        emailResult.messageId ??
        null,

      attempts:
        claim.current_attempts,

      error:
        "Email inviata, ma stato dell'evento non aggiornato a SENT.",
    };
  }

  console.log(
    "✅ Email transazionale idpotente completata:",
    {
      eventId:
        claim.event_id,

      eventKey:
        normalizedEventKey,

      eventType:
        normalizedEventType,

      appointmentId,

      recipientEmail,

      messageId:
        emailResult.messageId,

      attempts:
        claim.current_attempts,
    }
  );

  return {
    success:
      true,

    sent:
      true,

    skipped:
      false,

    eventId:
      claim.event_id,

    messageId:
      emailResult.messageId ??
      null,

    attempts:
      claim.current_attempts,

    error:
      null,
  };
}
