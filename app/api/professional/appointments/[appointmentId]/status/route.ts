import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type AppointmentAction =
  | "ACCEPT"
  | "REJECT"
  | "COMPLETE";

type RequestBody = {
  action?: AppointmentAction;
  professionalNotes?: string;
};

type RouteContext = {
  params: Promise<{
    appointmentId: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { appointmentId } = await context.params;

    const body = (await request.json()) as RequestBody;

    if (
      body.action !== "ACCEPT" &&
      body.action !== "REJECT" &&
      body.action !== "COMPLETE"
    ) {
      return NextResponse.json(
        {
          message: "Azione non valida.",
        },
        { status: 400 }
      );
    }

    const notes =
      body.professionalNotes?.trim() || null;

    if (body.action === "REJECT" && !notes) {
      return NextResponse.json(
        {
          message:
            "Inserisci una motivazione prima di rifiutare la richiesta.",
        },
        { status: 400 }
      );
    }

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
      data: accountProfile,
      error: accountProfileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (accountProfileError) {
      console.error(
        "Errore lettura ruolo:",
        accountProfileError
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile verificare il tuo account.",
        },
        { status: 500 }
      );
    }

    if (accountProfile?.role !== "PROFESSIONAL") {
      return NextResponse.json(
        {
          message:
            "Accesso riservato ai professionisti.",
        },
        { status: 403 }
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
          professional_id,
          status
        `
      )
      .eq("id", appointmentId)
      .eq("professional_id", user.id)
      .maybeSingle();

    if (appointmentError) {
      console.error(
        "Errore lettura richiesta:",
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

    if (
      body.action === "ACCEPT" &&
      appointment.status !== "PENDING"
    ) {
      return NextResponse.json(
        {
          message:
            "Puoi accettare soltanto una richiesta in attesa.",
        },
        { status: 400 }
      );
    }

    if (
      body.action === "REJECT" &&
      appointment.status !== "PENDING"
    ) {
      return NextResponse.json(
        {
          message:
            "Puoi rifiutare soltanto una richiesta in attesa.",
        },
        { status: 400 }
      );
    }

    if (
      body.action === "COMPLETE" &&
      appointment.status !== "ACCEPTED"
    ) {
      return NextResponse.json(
        {
          message:
            "Puoi completare soltanto una prenotazione accettata.",
        },
        { status: 400 }
      );
    }

    const nextStatus =
      body.action === "ACCEPT"
        ? "ACCEPTED"
        : body.action === "REJECT"
          ? "REJECTED"
          : "COMPLETED";

    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: nextStatus,
        professional_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .eq("professional_id", user.id)
      .eq("status", appointment.status)
      .select(
        `
          id,
          status,
          professional_notes,
          updated_at
        `
      )
      .single();

    if (error) {
      console.error(
        "Errore aggiornamento richiesta:",
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
            "Impossibile aggiornare la richiesta.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      appointment: data,
      message:
        nextStatus === "ACCEPTED"
          ? "Richiesta accettata correttamente."
          : nextStatus === "REJECTED"
            ? "Richiesta rifiutata."
            : "Prestazione contrassegnata come completata.",
    });
  } catch (error) {
    console.error(
      "Errore API stato appuntamento:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Il server non è riuscito ad aggiornare la richiesta.",
      },
      { status: 500 }
    );
  }
}