import "server-only";

const DEFAULT_COMMISSION_PERCENT = 15;

export function getPlatformCommissionPercent() {
  const configuredValue = Number(
    process.env
      .FG_HOME_CARE_COMMISSION_PERCENT
  );

  if (
    !Number.isFinite(configuredValue) ||
    configuredValue < 0 ||
    configuredValue > 100
  ) {
    return DEFAULT_COMMISSION_PERCENT;
  }

  return configuredValue;
}

export const PAYMENT_CURRENCY = "eur";