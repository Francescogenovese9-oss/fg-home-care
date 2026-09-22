export type CareGuidanceUrgency =
  | "ROUTINE"
  | "SOON"
  | "URGENT";

export type CareGuidanceProfessional = {
  profession: string;
  specialization?: string | null;
  reason: string;
};

export type CareGuidanceResult = {
  urgency: CareGuidanceUrgency;
  assistanceType: string;
  summary: string;
  professionals: CareGuidanceProfessional[];
  safetyMessage?: string | null;
};
