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
        "Errore lettura utente chat:",
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
          professional_id
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
            "Impossibile verificare la conversazione.",
        },
        { status: 500 }
      );
    }

    if (
      !appointment ||
      (appointment.patient_id !== user.id &&
        appointment.professional_id !== user.id)
    ) {
      return NextResponse.json(
        {
          message:
            "Non sei autorizzato ad accedere a questa chat.",
        },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("appointment_messages")
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq("appointment_id", appointmentId)
      .neq("sender_id", user.id)
      .eq("read", false)
      .select("id, read, read_at");

    if (error) {
      console.error(
        "Errore aggiornamento messaggi:",
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
            "Impossibile aggiornare i messaggi.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: data ?? [],
    });
  } catch (error) {
    console.error(
      "Errore API messaggi letti:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Il server non è riuscito ad aggiornare i messaggi.",
      },
      { status: 500 }
    );
  }
}