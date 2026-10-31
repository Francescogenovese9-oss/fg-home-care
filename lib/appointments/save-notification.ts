import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type AppointmentNotification = {
  user_id: string;
  appointment_id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  review_report_id: null;
};

/** Reuse the notification committed by the appointment trigger, if present. */
export async function saveAppointmentNotification(
  supabase: SupabaseClient,
  notification: AppointmentNotification,
  equivalentTypes: string[] = []
) {
  const { data: existing, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("appointment_id", notification.appointment_id)
    .eq("user_id", notification.user_id)
    .in("type", [notification.type, ...equivalentTypes])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // A failed lookup must not create a duplicate as a fallback.
  if (error) return { error };
  if (existing) {
    return await supabase.from("notifications")
      .update(notification).eq("id", existing.id)
      .eq("user_id", notification.user_id)
      .eq("appointment_id", notification.appointment_id);
  }
  return await supabase.from("notifications").insert(notification);
}
