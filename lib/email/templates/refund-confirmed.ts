import "server-only";

type RefundConfirmedTemplateInput = {
  patientName: string;
  professionalName: string;
  appointmentDate: string;
  appointmentTime: string;
  refundAmount: string;
  refundPercent: number;
  fullRefund: boolean;
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

export function refundConfirmedTemplate({
  patientName,
  professionalName,
  appointmentDate,
  appointmentTime,
  refundAmount,
  refundPercent,
  fullRefund,
  appointmentsUrl,
}: RefundConfirmedTemplateInput) {
  const safePatientName =
    escapeHtml(patientName);

  const safeProfessionalName =
    escapeHtml(professionalName);

  const safeAppointmentDate =
    escapeHtml(appointmentDate);

  const safeAppointmentTime =
    escapeHtml(appointmentTime);

  const safeRefundAmount =
    escapeHtml(refundAmount);

  const safeAppointmentsUrl =
    escapeHtml(appointmentsUrl);

  const refundDescription =
    fullRefund
      ? "rimborso completo"
      : `rimborso del ${refundPercent}%`;

  const subject =
    fullRefund
      ? "Rimborso confermato - FG Home Care"
      : `Rimborso del ${refundPercent}% confermato - FG Home Care`;

  const textContent =
    `Ciao ${patientName},\n\n` +
    `Il rimborso relativo alla tua prenotazione con ${professionalName} e stato confermato.\n\n` +
    `Data: ${appointmentDate}\n` +
    `Ora: ${appointmentTime}\n` +
    `Importo rimborsato: ${refundAmount}\n\n` +
    `L'accredito effettivo può richiedere alcuni giorni, in base al circuito di pagamento e alla banca utilizzata.\n\n` +
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
              Rimborso confermato
            </h1>

            <p>
              Ciao ${safePatientName},
            </p>

            <p>
              Il ${refundDescription} relativo alla tua prenotazione con
              <strong>${safeProfessionalName}</strong>
              è stato confermato.
            </p>

           <div style="margin:24px 0;padding:20px;background:#f8fafc;border-radius:12px;">
              <p style="margin:0 0 8px;">
                <strong>Data:</strong>
                ${safeAppointmentDate}
              </p>

              <p style="margin:0 0 8px;">
                <strong>Ora:</strong>
                ${safeAppointmentTime}
              </p>

              <p style="margin:0 0 8px;">
                <strong>Percentuale rimborsata:</strong>
                ${refundPercent}%
              </p>

              <p style="margin:0;">
                <strong>Importo rimborsato:</strong>
                ${safeRefundAmount}
              </p>
            </div>

            <p>
              L'accredito effettivo può richiedere alcuni giorni
              in base al circuito di pagamento e alla banca utilizzata.
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
