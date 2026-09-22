import type { ProfessionalPlan } from "@/lib/payments/config";

type RecommendedProfessional = {
  subscription_plan: ProfessionalPlan;
  average_rating: number | null;
  review_count: number;
};

export function getRecommendedScore(
  professional: RecommendedProfessional
) {
  const rating = professional.average_rating ?? 0;
  const reviews = professional.review_count ?? 0;

  const ratingScore = rating * 20;
  const reviewScore = Math.min(reviews, 20);
  const premiumBoost =
    professional.subscription_plan === "PREMIUM" ? 8 : 0;

  return ratingScore + reviewScore + premiumBoost;
}
