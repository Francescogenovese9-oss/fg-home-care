import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { parseRomeDateTime } from "@/lib/payments/cancellation-policy";

type ReminderResult = {
  scanned: number;
  eligible: number;
  created: number;
  skipped: number;
  failed: number;
};

export async function remindAppointmentsToComplete(
  limit = 100
): Promise<ReminderResult> {
  const supabase = getSupabaseAdmin();

  const result: ReminderResult = {
    scanned: 0,
    eligible: 0,
    created: 0,
    skipped: 0,
    failed: 0,
  };

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      "id,professional_id,appointment_date,appointment_time,duration_minutes,status,payment_status"
    )
    .eq("status", "ACCEPTED")
    .eq("payment_status", "PAID")
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  result.scanned = appointments?.length ?? 0;

  for (const appointment of appointments ?? []) {
    try {
      if (
        !Number.isInteger(appointment.duration_minutes) ||
        appointment.duration_minutes <= 0
      ) {
        result.skipped++;
        continue;
      }

      const start = parseRomeDateTime(
        appointment.appointment_date,
        appointment.appointment_time
      );

      const end = new Date(
        start.getTime() +
          appointment.duration_minutes * 60 * 1000
      );

      if (Date.now() < end.getTime()) {
        result.skipped++;
        continue;
      }

      result.eligible++;

      const {
        data: existingNotification,
        error: existingError,
      } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", appointment.professional_id)
        .eq("appointment_id", appointment.id)
        .eq("type", "APPOINTMENT_COMPLETION_REMINDER")
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingNotification) {
        result.skipped++;
        continue;
      }

      const { error: insertError } = await supabase
        .from("notifications")
        .insert({
          user_id: appointment.professional_id,
          appointment_id: appointment.id,
          review_report_id: null,
          type: "APPOINTMENT_COMPLETION_REMINDER",
          title: "Conferma la prestazione",
          message:
            "La prestazione risulta terminata. Conferma il completamento se è stata effettivamente eseguita.",
         link:
            "/dashboard/professional/appointments?appointmentId=" +
            encodeURIComponent(appointment.id),
          read: false,
        });

      if (insertError) {
        throw insertError;
      }

      result.created++;
    } catch (error) {
      result.failed++;

      console.error(
        "Errore reminder completamento:",
        appointment.id,
        error
      );
    }
  }

  console.log(
    "Reminder completamento prestazioni:",
    result
  );

  return result;
}
