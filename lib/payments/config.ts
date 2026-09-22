import "server-only";

export type ProfessionalPlan = "BASIC" | "PREMIUM";

const DEFAULT_BASIC_COMMISSION_PERCENT = 15;
const DEFAULT_PREMIUM_COMMISSION_PERCENT = 8;

function getCommissionPercent(
  envValue: string | undefined,
  fallback: number
) {
  const configuredValue = Number(envValue);

  if (
    !Number.isFinite(configuredValue) ||
    configuredValue < 0 ||
    configuredValue > 100
  ) {
    return fallback;
  }

  return configuredValue;
}

export function getPlatformCommissionPercent(
  plan: ProfessionalPlan = "BASIC"
) {
  if (plan === "PREMIUM") {
    return getCommissionPercent(
      process.env.FG_HOME_CARE_PREMIUM_COMMISSION_PERCENT,
      DEFAULT_PREMIUM_COMMISSION_PERCENT
    );
  }

  return getCommissionPercent(
    process.env.FG_HOME_CARE_BASIC_COMMISSION_PERCENT ??
      process.env.FG_HOME_CARE_COMMISSION_PERCENT,
    DEFAULT_BASIC_COMMISSION_PERCENT
  );
}

export const PREMIUM_MONTHLY_PRICE_EUROS = 19.9;

export const PAYMENT_CURRENCY = "eur";
