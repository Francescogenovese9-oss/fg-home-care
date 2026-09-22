export type PaymentStatus =
  | "NOT_REQUIRED"
  | "REQUIRES_PAYMENT"
  | "PROCESSING"
  | "PAID"
  | "PAYMENT_FAILED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export function getPaymentStatusLabel(
  status: PaymentStatus
) {
  switch (status) {
    case "REQUIRES_PAYMENT":
      return "Da pagare";

    case "PROCESSING":
      return "In elaborazione";

    case "PAID":
      return "Pagato";

    case "PAYMENT_FAILED":
      return "Pagamento fallito";

    case "CANCELLED":
      return "Annullato";

    case "REFUND_PENDING":
      return "Rimborso in corso";

    case "REFUNDED":
      return "Rimborsato";

    case "PARTIALLY_REFUNDED":
      return "Rimborso parziale";

    default:
      return "Pagamento non richiesto";
  }
}