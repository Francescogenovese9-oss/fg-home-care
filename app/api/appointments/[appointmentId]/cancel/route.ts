import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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
      data: appointment,
      error: appointmentError,
    } = await supabase
      .from("appointments")
      .select(
        `
          id,
          patient_id,
          status,
          appointment_date,
          appointment_time
        `
      )
      .eq("id", appointmentId)
      .eq("patient_id", user.id)
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

    if (appointment.status !== "PENDING") {
      return NextResponse.json(
        {
          message:
            "Puoi annullare soltanto le richieste ancora in attesa.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .eq("patient_id", user.id)
      .eq("status", "PENDING")
      .select(
        `
          id,
          status,
          updated_at
        `
      )
      .single();

    if (error) {
      console.error(
        "Errore annullamento appuntamento:",
        {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            error.message ||
            "Impossibile annullare la richiesta.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      appointment: data,
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