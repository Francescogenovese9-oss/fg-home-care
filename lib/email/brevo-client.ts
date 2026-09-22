import "server-only";

import {
  getBrevoApiKey,
  getBrevoApiUrl,
  getBrevoSenderEmail,
  getBrevoSenderName,
} from "@/lib/email/config";

export type TransactionalEmailRecipient = {
  email: string;
  name?: string | null;
};

export type SendBrevoEmailInput = {
  to: TransactionalEmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: TransactionalEmailRecipient;
};

export type BrevoSendResult = {
  messageId: string | null;
};

type BrevoApiResponse = {
  messageId?: string;
  code?: string;
  message?: string;
};

export async function sendBrevoEmail({
  to,
  subject,
  htmlContent,
  textContent,
  replyTo,
}: SendBrevoEmailInput): Promise<BrevoSendResult> {
  if (
    !Array.isArray(to) ||
    to.length === 0
  ) {
    throw new Error(
      "Nessun destinatario email specificato."
    );
  }

  const normalizedRecipients =
    to.map((recipient) => ({
      email:
        recipient.email
          .trim(),

      ...(recipient.name
        ?.trim()
        ? {
            name:
              recipient.name.trim(),
          }
        : {}),
    }));

  if (
    normalizedRecipients.some(
      (recipient) =>
        !recipient.email
    )
  ) {
    throw new Error(
      "Indirizzo email destinatario non valido."
    );
  }

  const response =
    await fetch(
      `${getBrevoApiUrl()}/smtp/email`,
      {
        method:
          "POST",

        headers: {
          accept:
            "application/json",

          "content-type":
            "application/json",

          "api-key":
            getBrevoApiKey(),
        },

        body:
          JSON.stringify({
            sender: {
              email:
                getBrevoSenderEmail(),

              name:
                getBrevoSenderName(),
            },

            to:
              normalizedRecipients,

            subject,

            htmlContent,

            ...(textContent
              ? {
                  textContent,
                }
              : {}),

            ...(replyTo?.email
              ? {
                  replyTo: {
                    email:
                      replyTo.email.trim(),

                    ...(replyTo.name
                      ?.trim()
                      ? {
                          name:
                            replyTo.name.trim(),
                        }
                      : {}),
                  },
                }
              : {}),
          }),
      }
    );

  let responseBody:
    BrevoApiResponse = {};

  try {
    responseBody =
      (await response.json()) as BrevoApiResponse;
  } catch {
    responseBody = {};
  }

  if (
    !response.ok
  ) {
    console.error(
      "Errore API Brevo:",
      {
        status:
          response.status,

        code:
          responseBody.code,

        message:
          responseBody.message,
      }
    );

    throw new Error(
      responseBody.message ||
        `Brevo ha restituito HTTP ${response.status}.`
    );
  }

  return {
    messageId:
      responseBody.messageId ??
      null,
  };
}
