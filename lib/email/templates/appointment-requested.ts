import "server-only";

type AppointmentRequestedTemplateInput = {
  professionalName: string;
  patientName: string;
  serviceLabel: string;
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes: number;
  dashboardUrl: string;
};

function escapeHtml(
  value: string
) {
  return value
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

export function appointmentRequestedTemplate({
  professionalName,
  patientName,
  serviceLabel,
  appointmentDate,
  appointmentTime,
  durationMinutes,
  dashboardUrl,
}: AppointmentRequestedTemplateInput) {
  const safeProfessionalName =
    escapeHtml(
      professionalName
    );

  const safePatientName =
    escapeHtml(
      patientName
    );

  const safeServiceLabel =
    escapeHtml(
      serviceLabel
    );

  const safeAppointmentDate =
    escapeHtml(
      appointmentDate
    );

  const safeAppointmentTime =
    escapeHtml(
      appointmentTime
    );

  const safeDashboardUrl =
    escapeHtml(
      dashboardUrl
    );

  const subject =
    "Nuova richiesta di prenotazione - FG Home Care";

  const textContent =
    `Ciao ${professionalName},\n\n` +
    `hai ricevuto una nuova richiesta di prenotazione da ${patientName}.\n\n` +
    `Prestazione: ${serviceLabel}\n` +
    `Data: ${appointmentDate}\n` +
    `Ora: ${appointmentTime}\n` +
    `Durata: ${durationMinutes} minuti\n\n` +
    `Accedi alla tua area professionista per accettare o rifiutare la richiesta:\n` +
    `${dashboardUrl}\n\n` +
    `FG Home Care`;

  const htmlContent = `
    <!doctype html>
    <html lang="it">
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
            <h1 style="margin:0 0 20px;font-size:24px;">
              Nuova richiesta di prenotazione
            </h1>

            <p>
              Ciao ${safeProfessionalName},
            </p>

            <p>
              Hai ricevuto una nuova richiesta di prenotazione da
              <strong>${safePatientName}</strong>.
            </p>

            <div style="margin:24px 0;padding:20px;background:#f8fafc;border-radius:12px;">
              <p style="margin:0 0 8px;">
                <strong>Prestazione:</strong>
                ${safeServiceLabel}
              </p>

              <p style="margin:0 0 8px;">
                <strong>Data:</strong>
                ${safeAppointmentDate}
              </p>

              <p style="margin:0 0 8px;">
                <strong>Ora:</strong>
                ${safeAppointmentTime}
              </p>

              <p style="margin:0;">
                <strong>Durata:</strong>
                ${durationMinutes} minuti
              </p>
            </div>

            <p>
              Accedi alla tua area professionista per verificare,
              accettare o rifiutare la richiesta.
            </p>

            <p style="margin:28px 0;">
              <a
                href="${safeDashboardUrl}"
                style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;"
              >
                Visualizza richiesta
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
