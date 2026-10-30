import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: documents, error } = await admin
    .from("video_consultation_documents")
    .select("id,appointment_id,storage_path")
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) return NextResponse.json({ error: "Lettura documenti non riuscita" }, { status: 500 });
  if (!documents?.length) return NextResponse.json({ scanned: 0, deleted: 0 });

  const ids = [...new Set(documents.map(d => d.appointment_id))];
  const { data: rooms, error: roomsError } = await admin.from("video_consultations")
    .select("appointment_id,ends_at").in("appointment_id", ids);
  const { data: appointments, error: appointmentsError } = await admin.from("appointments")
    .select("id,status").in("id", ids);
  if (roomsError || appointmentsError) return NextResponse.json({ error: "Verifica sessioni non riuscita" }, { status: 500 });
  const roomById = new Map((rooms ?? []).map(r => [r.appointment_id, r]));
  const appointmentById = new Map((appointments ?? []).map(a => [a.id, a]));
  const now = Date.now();
  const expired = documents.filter(d => {
    const appointment = appointmentById.get(d.appointment_id);
    const room = roomById.get(d.appointment_id);
    if (!appointment) return false;
    if (["COMPLETED", "CANCELLED", "REJECTED"].includes(appointment.status)) return true;
    return Boolean(room?.ends_at && new Date(room.ends_at).getTime() + 30 * 60_000 < now);
  });
  let deleted = 0;
  let failed = 0;
  for (const doc of expired) {
    const removed = await admin.storage.from("video-consultation-documents").remove([doc.storage_path]);
    if (removed.error) { failed++; continue; }
    const result = await admin.from("video_consultation_documents").delete().eq("id", doc.id);
    if (result.error) { failed++; continue; }
    deleted++;
  }
  return NextResponse.json({ scanned: documents.length, deleted, failed }, { status: failed ? 500 : 200 });
}
