import "server-only";

import {
  sendBrevoEmail,
  type TransactionalEmailRecipient,
} from "@/lib/email/brevo-client";

type SendTransactionalEmailInput = {
  to: TransactionalEmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: TransactionalEmailRecipient;
  eventName: string;
  referenceId?: string | null;
};

export type TransactionalEmailResult = {
  success: boolean;
  messageId: string | null;
  error: string | null;
};

export async function sendTransactionalEmail({
  to,
  subject,
  htmlContent,
  textContent,
  replyTo,
  eventName,
  referenceId,
}: SendTransactionalEmailInput): Promise<TransactionalEmailResult> {
  try {
    const result =
      await sendBrevoEmail({
        to,
        subject,
        htmlContent,
        textContent,
        replyTo,
      });

    console.log(
      "Email transazionale inviata:",
      {
        eventName,
        referenceId:
          referenceId ??
          null,
        messageId:
          result.messageId,
      }
    );

    return {
      success:
        true,

      messageId:
        result.messageId,

      error:
        null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore sconosciuto durante l'invio email.";

    console.error(
      "Errore email transazionale:",
      {
        eventName,
        referenceId:
          referenceId ??
          null,
        message,
      }
    );

    /*
     * IMPORTANTE:
     *
     * Non rilanciamo l'errore.
     *
     * Una mancata email non deve annullare
     * una prenotazione, un pagamento o
     * un'altra operazione già completata.
     */

    return {
     success:
        false,

      messageId:
        null,

      error:
        message,
    };
  }
}
