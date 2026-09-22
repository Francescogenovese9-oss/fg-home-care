import "server-only";

type AppointmentRejectedTemplateInput = {
  patientName: string;
  professionalName: string;
  appointmentDate: string;
  appointmentTime: string;
  professionalNotes?: string | null;
  appointmentsUrl: string;
};

function escapeHtml(
  value: string
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function appointmentRejectedTemplate({
  patientName,
  professionalName,
  appointmentDate,
  appointmentTime,
  professionalNotes,
  appointmentsUrl,
}: AppointmentRejectedTemplateInput) {
  const safePatientName =
    escapeHtml(patientName);

  const safeProfessionalName =
    escapeHtml(professionalName);

  const safeAppointmentDate =
    escapeHtml(appointmentDate);

  const safeAppointmentTime =
    escapeHtml(appointmentTime);

  const safeProfessionalNotes =
    professionalNotes
      ? escapeHtml(professionalNotes)
      : null;

  const safeAppointmentsUrl =
    escapeHtml(appointmentsUrl);

  const subject =
    "Richiesta non accettata - FG Home Care";

  const textContent =
    `Ciao ${patientName},\n\n` +
    `${professionalName} non ha potuto accettare la tua richiesta.\n\n` +
    `Data: ${appointmentDate}\n` +
    `Ora: ${appointmentTime}\n` +
    (
      professionalNotes
        ? `Motivo: ${professionalNotes}\n`
        : ""
    ) +
    `\nPuoi consultare le tue richieste e cercare un'altra disponibilità:\n` +
    `${appointmentsUrl}\n\n` +
    `FG Home Care`;

  const htmlContent = `
    <!doctype html>
    <html lang="it">
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
            <h1 style="margin:0 0 20px;font-size:24px;">
              Richiesta non accettata
            </h1>

            <p>
              Ciao ${safePatientName},
            </p>

            <p>
              <strong>${safeProfessionalName}</strong>
              non ha potuto accettare la tua richiesta.
            </p>

            <div style="margin:24px 0;padding:20px;background:#f8fafc;border-radius:12px;">
              <p style="margin:0 0 8px;">
                <strong>Data:</strong>
                ${safeAppointmentDate}
              </p>

              <p style="margin:0;">
                <strong>Ora:</strong>
                ${safeAppointmentTime}
              </p>

              ${
                safeProfessionalNotes
                  ? `
                    <p style="margin:12px 0 0;">
                      <strong>Motivo:</strong>
                      ${safeProfessionalNotes}
                    </p>
                  `
                  : ""
              }
            </div>

            <p>
              Puoi tornare alle tue prenotazioni e cercare
              una nuova disponibilità.
            </p>

            <p style="margin:28px 0;">
              <a
                href="${safeAppointmentsUrl}"
                style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;"
              >
                Le mie prenotazioni
              </a>
            </p>

            <p style="margin-top:32px;color:#64748b;font-size:14px;">
              FG Home Care
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject,
    htmlContent,
    textContent,
  };
}