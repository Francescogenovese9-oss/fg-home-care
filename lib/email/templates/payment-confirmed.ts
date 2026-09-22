import "server-only";

type PaymentConfirmedTemplateInput = {
  patientName: string;
  professionalName: string;
  appointmentDate: string;
  appointmentTime: string;
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

export function paymentConfirmedTemplate({
  patientName,
  professionalName,
  appointmentDate,
  appointmentTime,
  appointmentsUrl,
}: PaymentConfirmedTemplateInput) {
  const safePatientName =
    escapeHtml(patientName);

  const safeProfessionalName =
    escapeHtml(professionalName);

  const safeAppointmentDate =
    escapeHtml(appointmentDate);

  const safeAppointmentTime =
    escapeHtml(appointmentTime);

  const safeAppointmentsUrl =
    escapeHtml(appointmentsUrl);

  const subject =
    "Pagamento confermato - FG Home Care";

  const textContent =
    `Ciao ${patientName},\n\n` +
    `il pagamento della tua prenotazione con ${professionalName} è stato confermato.\n\n` +
    `ata: ${appointmentDate}\n` +
    `Ora: ${appointmentTime}\n\n` +
    `Puoi consultare i dettagli della prenotazione qui:\n` +
    `${appointmentsUrl}\n\n` +
    `FG Home Care`;

  const htmlContent = `
    <!doctype html>
    <html lang="it">
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
            <h1 style="margin:0 0 20px;font-size:24px;">
              Pagamento confermato
            </h1>

            <p>
              Ciao ${safePatientName},
            </p>

            <p>
              Il pagamento della tua prenotazione con
              <strong>${safeProfessionalName}</strong>
              è stato confermato correttamente.
            </p>

            <div style="margin:24px 0;padding:20px;background:#f8fafc;border-radus:12px;">
              <p style="margin:0 0 8px;">
                <strong>Data:</strong>
                ${safeAppointmentDate}
              </p>

              <p style="margin:0;">
                <strong>Ora:</strong>
                ${safeAppointmentTime}
              </p>
            </div>

            <p>
              La prenotazione risulta ora pagata.
              Puoi consultare i dettagli dalla tua area personale.
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
