import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isDirectTestPair } from "./direct-rollout";

/** Private projection, never exposes documents, billing or contact details. */
export async function getTestProfessional(viewerId: string, professionalId: string) {
  if (!isDirectTestPair(viewerId, professionalId)) return { data: null, error: null };
  const admin = getSupabaseAdmin();
  const result = await admin.from("professional_profiles").select(`user_id, profession, specialization, bio, city, province, postal_code,
    service_radius_km, hourly_rate, available_weekdays, available_from, available_to,
    home_visits, video_consultations, avatar_path, updated_at, verification_status, published`)
    .eq("user_id", professionalId).eq("verification_status", "APPROVED").eq("video_consultations", true).maybeSingle();
  if (!result.data || result.error) return { data: null, error: result.error };
  const profile = await admin.from("profiles").select("first_name,last_name").eq("id", professionalId).single();
  if (profile.error) return { data: null, error: profile.error };
  return { data: { ...result.data, ...profile.data }, error: null };
}
