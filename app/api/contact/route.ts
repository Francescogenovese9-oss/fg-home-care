import { NextResponse } from "next/server";
import { z } from "zod";

import { sendTransactionalEmail } from "@/lib/email/send-transactional-email";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Inserisci nome e cognome.")
    .max(100, "Nome troppo lungo."),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Indirizzo email non valido.")
    .max(254),

  requestType: z.enum([
    "ASSISTENZA_UTENTE",
    "PROFESSIONISTA",
    "COLLABORAZIONE",
    "ALTRO",
  ]),

  subject: z
    .string()
    .trim()
    .min(3, "Inserisci l'oggetto.")
    .max(150, "Oggetto troppo lungo."),

  message: z
    .string()
    .trim()
    .min(10, "Il messaggio deve contenere almeno 10 caratteri.")
    .max(5000, "Il messaggio è troppo lungo."),

  privacyAccepted: z.literal(true),
});

const requestTypeLabels = {
  ASSISTENZA_UTENTE: "Assistenza utenti",
  PROFESSIONISTA: "Professionisti",
  COLLABORAZIONE: "Collaborazioni",
  ALTRO: "Altra richiesta",
} as const;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("\x27", "&#039;");
}
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Controlla i dati inseriti nel modulo.",
        },
        { status: 400 }
      );
    }

    const {
       name,
      email,
      requestType,
      subject,
      message,
    } = parsed.data;

    const adminEmail =
      process.env.CONTACT_ADMIN_EMAIL?.trim();

    if (!adminEmail) {
      console.error("CONTACT_ADMIN_EMAIL non configurata.");

      return NextResponse.json(
        {
          success: false,
          error: "Servizio di contatto temporaneamente non disponibile.",
        },
        { status: 500 }
      );
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");
    const requestLabel = requestTypeLabels[requestType];

    const result = await sendTransactionalEmail({
      to: [
        {
          email: adminEmail,
          name: "FG Home Care",
        },
      ],

      replyTo: [
        {
          email,
          name,
        },
      ][0],

      subject: `[FG Home Care - Contatti] ${subject}`,

      htmlContent: `
        <h2>Nuova richiesta dal sito FG Home Care</h2>

        <p><strong>Tipo richiesta:</strong> ${requestLabel}</p>
        <p><strong>Nome:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Oggetto:</strong> ${safeSubject}</p>

        <hr />

        <p><strong>Messaggio:</strong></p>
        <p>${safeMessage}</p>

        <hr />

        <p>
          Puoi rispondere direttamente a questa email
          per contattare l'utente.
        </p>
      `,

      textContent: [
        "Nuova richiesta dal sito FG Home Care",
        "",
        `Tipo richiesta: ${requestLabel}`,
        `Nome: ${name}`,
        `Email: ${email}`,
        `Oggetto: ${subject}`,
        "",
        "Messaggio:",
        message,
      ].join("\n"),

      eventName: "CONTACT_FORM_SUBMITTED",
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Non è stato possibile inviare il messaggio. Riprova più tardi.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Messaggio inviato correttamente.",
    });
  } catch (error) {
    console.error("Errore API contact:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Si è verificato un errore durante l'invio del messaggio.",
      },
      { status: 500 }
    );
  }
}
