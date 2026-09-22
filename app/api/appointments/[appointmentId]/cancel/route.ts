import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    appointmentId: string;
  }>;
};

export async function PATCH(
  _request: Request,
  context: RouteContext
) {
  try {
    const { appointmentId } = await context.params;

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Errore lettura utente:",
        userError
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          message: "Utente non autenticato.",
        },
        { status: 401 }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Errore lettura profilo:",
        profileError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare il profilo utente.",
        },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "PATIENT") {
      return NextResponse.json(
        {
          message:
            "Solo il paziente può annullare questa richiesta.",
        },
        { status: 403 }
      );
    }

    const admin = getSupabaseAdmin();

    const {
      data: appointment,
      error: appointmentError,
    } = await admin
      .from("appointments")
      .select(
        `
          id,
          patient_id,
          status,
          payment_status,
          appointment_date,
          appointment_time
        `
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (appointmentError) {
      console.error(
        "Errore lettura appuntamento:",
        appointmentError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile controllare la richiesta.",
        },
        { status: 500 }
      );
    }

    if (!appointment) {
      return NextResponse.json(
        {
          message: "Richiesta non trovata.",
        },
        { status: 404 }
      );
    }

    if (appointment.patient_id !== user.id) {
      return NextResponse.json(
        {
          message:
            "Non sei autorizzato ad annullare questa richiesta.",
        },
        { status: 403 }
      );
    }

    if (appointment.status !== "PENDING") {
      return NextResponse.json(
        {
          message:
            "Puoi annullare soltanto le richieste ancora in attesa.",
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const {
      data: cancelledAppointment,
      error: cancelError,
    } = await admin
      .from("appointments")
      .update({
        status: "CANCELLED",
        cancelled_at: now,
        updated_at: now,
      })
      .eq("id", appointmentId)
      .eq("patient_id", user.id)
      .eq("status", "PENDING")
      .select(
        `
          id,
          status,
          payment_status,
          cancelled_at,
          updated_at
        `
      )
      .maybeSingle();

    if (cancelError) {
      console.error(
        "Errore annullamento appuntamento:",
        {
          message: cancelError.message,
          code: cancelError.code,
          details: cancelError.details,
          hint: cancelError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            "Impossibile annullare la richiesta.",
        },
        { status: 500 }
      );
    }

    if (!cancelledAppointment) {
      return NextResponse.json(
        {
          message:
            "La richiesta non è più in attesa e non può essere annullata.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      appointment: cancelledAppointment,
      message:
        "Richiesta annullata correttamente.",
    });
  } catch (error) {
    console.error(
      "Errore API annullamento:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Il server non è riuscito ad annullare la richiesta.",
      },
      { status: 500 }
    );
  }
}