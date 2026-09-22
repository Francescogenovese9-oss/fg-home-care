import "server-only";

type AppointmentAcceptedTemplateInput = {
  patientName: string;
  professionalName: string;
  appointmentDate: string;
  appointmentTime: string;
  paymentUrl: string;
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

export function appointmentAcceptedTemplate({
  patientName,
  professionalName,
  appointmentDate,
  appointmentTime,
  paymentUrl,
}: AppointmentAcceptedTemplateInput) {
  const safePatientName =
    escapeHtml(patientName);

  const safeProfessionalName =
    escapeHtml(professionalName);

  const safeAppointmentDate =
    escapeHtml(appointmentDate);

  const safeAppointmentTime =
    escapeHtml(appointmentTime);

  const safePaymentUrl =
    escapeHtml(paymentUrl);

  const subject =
    "Richiesta accettata - FG Home Care";

  const textContent =
    `Ciao ${patientName},\n\n` +
    `${professionalName} ha accettato la tua richiesta di assistenza.\n\n` +
    `Data: ${appointmentDate}\n` +
    `Ora: ${appointmentTime}\n\n` +
    `Puoi ora procedere al pagamento:\n` +
    `${paymentUrl}\n\n` +
    `FG Home Care`;

  const htmlContent = `
    <!doctype html>
    <html lang="it">
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
            <h1 style="margin:0 0 20px;font-size:24px;">
              Richiesta accettata
            </h1>

            <p>
              Ciao ${safePatientName},
            </p>

            <p>
              <strong>${safeProfessionalName}</strong>
              ha accettato la tua richiesta di assistenza.
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
            </div>

            <p>
              Per confermare definitivamente la prenotazione,
              procedi al pagamento.
            </p>

            <p style="margin:28px 0;">
              <a
                href="${safePaymentUrl}"
                style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;"
              >
                Procedi al pagamento
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
