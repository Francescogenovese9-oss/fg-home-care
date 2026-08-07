export function formatMoney(
    amountInCents: number,
    currency = "EUR"
  ) {
    if (!Number.isFinite(amountInCents)) {
      return "Importo non disponibile";
    }
  
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountInCents / 100);
  }