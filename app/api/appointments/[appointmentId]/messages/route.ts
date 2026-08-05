import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { messageSchema } from "@/lib/validations/message";

type RouteContext = {
  params: Promise<{
    appointmentId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { appointmentId } = await context.params;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
          professional_id,
          status
        `
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (appointmentError) {
      console.error(
        "Errore lettura prenotazione chat:",
        appointmentError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare la prenotazione.",
        },
        { status: 500 }
      );
    }

    if (
      !appointment ||
      (
        appointment.patient_id !== user.id &&
        appointment.professional_id !== user.id
      )
    ) {
      return NextResponse.json(
        {
          message: "Chat non disponibile.",
        },
        { status: 403 }
      );
    }

    const {
      data: messages,
      error: messagesError,
    } = await supabase
      .from("appointment_messages")
      .select(
        `
          id,
          appointment_id,
          sender_id,
          message,
          read,
          read_at,
          created_at
        `
      )
      .eq("appointment_id", appointmentId)
      .order("created_at", {
        ascending: true,
      });

    if (messagesError) {
      console.error(
        "Errore lettura messaggi:",
        messagesError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile caricare i messaggi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      messages: messages ?? [],
    });
  } catch (error) {
    console.error(
      "Errore API lettura chat:",
      error
    );

    return NextResponse.json(
      {
        message: "Errore interno del server.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { appointmentId } = await context.params;

    const body: unknown = await request.json();

    const validation = messageSchema.safeParse({
      ...(typeof body === "object" &&
      body !== null
        ? body
        : {}),
      appointmentId,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error.issues[0]?.message ??
            "Messaggio non valido.",
        },
        { status: 400 }
      );
    }

    const values = validation.data;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
          professional_id,
          status
        `
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (appointmentError) {
      console.error(
        "Errore controllo prenotazione:",
        appointmentError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare la prenotazione.",
        },
        { status: 500 }
      );
    }

    if (
      !appointment ||
      (
        appointment.patient_id !== user.id &&
        appointment.professional_id !== user.id
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Non puoi inviare messaggi in questa chat.",
        },
        { status: 403 }
      );
    }

    if (
      ![
        "PENDING",
        "ACCEPTED",
        "COMPLETED",
      ].includes(appointment.status)
    ) {
      return NextResponse.json(
        {
          message:
            "La chat non è disponibile per questa prenotazione.",
        },
        { status: 400 }
      );
    }

    const {
      data: message,
      error: insertError,
    } = await supabase
      .from("appointment_messages")
      .insert({
        appointment_id: appointmentId,
        sender_id: user.id,
        message: values.message,
        read: false,
      })
      .select(
        `
          id,
          appointment_id,
          sender_id,
          message,
          read,
          read_at,
          created_at
        `
      )
      .single();

    if (insertError) {
      console.error(
        "Errore invio messaggio:",
        {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            insertError.message ||
            "Impossibile inviare il messaggio.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Errore API invio messaggio:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Il server non è riuscito a inviare il messaggio.",
      },
      { status: 500 }
    );
  }
}