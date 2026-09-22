import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CareGuidanceSource =
  | "AI"
  | "RULE_BASED"
  | "RED_FLAG"
  | "NO_MATCH";

export async function trackCareGuidanceUse(
  patientId: string,
  guidanceSource: CareGuidanceSource
) {
  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from("care_guidance_events")
    .insert({
      patient_id: patientId,
      event_type: "GUIDANCE_USED",
      guidance_source: guidanceSource,
    });

  if (error) {
    console.error(
      "Errore tracking assistenza personalizzata:",
      {
        message: error.message,
        code: error.code,
      }
    );
  }
}
