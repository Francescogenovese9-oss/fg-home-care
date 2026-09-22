import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non autenticato." },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Operazione non consentita." },
      { status: 403 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from("care_guidance_events")
    .insert({
      patient_id: user.id,
      event_type: "PROFESSIONALS_VIEWED",
      guidance_source: null,
    });

  if (error) {
    console.error(
      "Errore tracking visualizzazione professionisti:",
      {
        message: error.message,
        code: error.code,
      }
    );

    return NextResponse.json(
      { error: "Errore tracking." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
