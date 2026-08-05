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
    const { appointmentId } =
      await context.params;

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

    /*
     * Verifica che l’appuntamento esista e che
     * l’utente autenticato sia uno dei partecipanti.
     */
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
        "Errore lettura appuntamento chat:",
        appointmentError
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile verificare la conversazione.",
        },
        { status: 500 }
      );
    }

    if (!appointment) {
      return NextResponse.json(
        {
          message:
            "Prenotazione non trovata.",
        },
        { status: 404 }
      );
    }

    const isPatient =
      appointment.patient_id === user.id;

    const isProfessional =
      appointment.professional_id ===
      user.id;

    if (!isPatient && !isProfessional) {
      return NextResponse.json(
        {
          message:
            "Non sei autorizzato ad accedere a questa chat.",
        },
        { status: 403 }
      );
    }

    const readAt = new Date().toISOString();

    /*
     * Segna come letti soltanto i messaggi:
     *
     * - appartenenti alla conversazione;
     * - inviati dall’altro partecipante;
     * - ancora non letti.
     */
    const {
      data: updatedMessages,
      error: messagesError,
    } = await supabase
      .from("appointment_messages")
      .update({
        read: true,
        read_at: readAt,
      })
      .eq(
        "appointment_id",
        appointmentId
      )
      .neq("sender_id", user.id)
      .eq("read", false)
      .select(
        `
          id,
          appointment_id,
          sender_id,
          read,
          read_at
        `
      );

    if (messagesError) {
      console.error(
        "Errore aggiornamento messaggi letti:",
        {
          message: messagesError.message,
          code: messagesError.code,
          details: messagesError.details,
          hint: messagesError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            messagesError.message ||
            "Non è stato possibile aggiornare i messaggi.",
        },
        { status: 400 }
      );
    }

    /*
     * Segna come lette anche tutte le notifiche
     * MESSAGE_RECEIVED associate alla stessa chat.
     *
     * In questo modo, quando l’utente apre la
     * conversazione:
     *
     * - il badge della chat torna a zero;
     * - il contatore della campanella diminuisce;
     * - le notifiche della conversazione risultano lette.
     */
    const {
      data: updatedNotifications,
      error: notificationError,
    } = await supabase
      .from("notifications")
      .update({
        read: true,
        read_at: readAt,
      })
      .eq("user_id", user.id)
      .eq(
        "appointment_id",
        appointmentId
      )
      .eq(
        "type",
        "MESSAGE_RECEIVED"
      )
      .eq("read", false)
      .select(
        `
          id,
          appointment_id,
          type,
          read,
          read_at
        `
      );

    /*
     * Un errore sulle notifiche non deve annullare
     * l’aggiornamento dei messaggi già completato.
     * Lo registriamo nel terminale e restituiamo
     * comunque una risposta positiva.
     */
    if (notificationError) {
      console.error(
        "Errore aggiornamento notifiche chat:",
        {
          message:
            notificationError.message,
          code: notificationError.code,
          details:
            notificationError.details,
          hint: notificationError.hint,
        }
      );
    }

    return NextResponse.json({
      success: true,
      messages: updatedMessages ?? [],
      notifications:
        updatedNotifications ?? [],
      updatedMessagesCount:
        updatedMessages?.length ?? 0,
      updatedNotificationsCount:
        updatedNotifications?.length ?? 0,
      message:
        "Messaggi e notifiche della conversazione aggiornati.",
    });
  } catch (error) {
    console.error(
      "Errore API messaggi letti:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Il server non è riuscito ad aggiornare i messaggi.",
      },
      { status: 500 }
    );
  }
}