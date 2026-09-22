export type TrustLevel =
  | "TRUSTED"
  | "ATTENTION"
  | "HIGH_RISK";

export type TrustScoreResult = {
  score: number;
  level: TrustLevel;
};

export function calculateTrustScore(
  attemptsCount: number
): TrustScoreResult {
  let penalty = 0;

  for (let i = 1; i <= attemptsCount; i++) {
    if (i === 1) {
      penalty += 5;
    } else if (i === 2) {
      penalty += 10;
    } else if (i === 3) {
      penalty += 15;
    } else {
      penalty += 20;
    }
  }

  const score = Math.max(
    0,
    100 - penalty
  );

  let level: TrustLevel =
    "TRUSTED";

  if (score < 50) {
    level = "HIGH_RISK";
  } else if (score < 80) {
    level = "ATTENTION";
  }

  return {
    score,
    level,
  };
}
