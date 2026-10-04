import "server-only";

import {
  getPlatformCommissionPercent,
  PAYMENT_CURRENCY,
  type ProfessionalPlan,
} from "@/lib/payments/config";

type CalculatePaymentInput = {
  hourlyRate: number;
  durationMinutes: number;
  plan: ProfessionalPlan;

  /*
   * Commissione effettiva opzionale.
   *
   * Se non viene specificata continuiamo
   * a utilizzare la commissione standard
   * BASIC / PREMIUM.
   */
  commissionPercent?: number;
};

export type PaymentBreakdown = {
  currency: string;
  commissionPercent: number;
  subtotalAmount: number;
  platformFeeAmount: number;
  professionalAmount: number;
};

export function eurosToCents(
  euros: number
) {
  if (
    !Number.isFinite(euros) ||
    euros < 0
  ) {
    throw new Error(
      "Importo in euro non valido."
    );
  }

  return Math.round(euros * 100);
}

export function centsToEuros(
  cents: number
) {
  if (
    !Number.isInteger(cents) ||
    cents < 0
  ) {
    throw new Error(
      "Importo in centesimi non valido."
    );
  }

  return cents / 100;
}

export function calculatePaymentBreakdown({
  hourlyRate,
  durationMinutes,
  plan,
  commissionPercent: customCommissionPercent,
}: CalculatePaymentInput): PaymentBreakdown {
  if (
    !Number.isFinite(hourlyRate) ||
    hourlyRate < 0
  ) {
    throw new Error(
      "Tariffa oraria non valida."
    );
  }

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 15 ||
    durationMinutes > 480
  ) {
    throw new Error(
      "Durata della prestazione non valida."
    );
  }

  const commissionPercent =
    customCommissionPercent ??
    getPlatformCommissionPercent(plan);

  if (
    !Number.isFinite(commissionPercent) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    throw new Error(
      "Percentuale commissione non valida."
    );
  }

  const subtotalEuros =
    hourlyRate *
    (durationMinutes / 60);

  const subtotalAmount =
    eurosToCents(subtotalEuros);

  const platformFeeAmount = Math.round(
    subtotalAmount *
      (commissionPercent / 100)
  );

  const professionalAmount =
    subtotalAmount -
    platformFeeAmount;

  if (
    platformFeeAmount < 0 ||
    professionalAmount < 0 ||
    platformFeeAmount +
      professionalAmount !==
      subtotalAmount
  ) {
    throw new Error(
      "Calcolo economico non valido."
    );
  }

  return {
    currency: PAYMENT_CURRENCY,
    commissionPercent,
    subtotalAmount,
    platformFeeAmount,
    professionalAmount,
  };
}