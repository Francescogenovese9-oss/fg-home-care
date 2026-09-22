import "server-only";

export function calculateRefundAmount({
  subtotalAmount,
  refundPercent,
}: {
  subtotalAmount: number;
  refundPercent: number;
}) {
  if (
    !Number.isInteger(subtotalAmount) ||
    subtotalAmount < 0
  ) {
    throw new Error(
      "Importo prenotazione non valido."
    );
  }

  if (
    !Number.isFinite(refundPercent) ||
    refundPercent < 0 ||
    refundPercent > 100
  ) {
    throw new Error(
      "Percentuale rimborso non valida."
    );
  }

  return Math.round(
    subtotalAmount *
      (refundPercent / 100)
  );
}