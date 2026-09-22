import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

import {
  messageSchema,
} from "@/lib/validations/message";

import {
  detectOffPlatformContact,
} from "@/lib/security/off-platform-contact";

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
    const {
      appointmentId,
    } =
      await context.params;

    const supabase =
      await createClient();

    /*
     * =====================================================
     * AUTENTICAZIONE
     * =====================================================
     */

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError
    ) {
      console.error(
        "Errore autenticazione lettura chat:",
        userError
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          message:
            "Utente non autenticato.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * =====================================================
     * APPUNTAMENTO
     * =====================================================
     */

    const {
      data: appointment,
      error:
        appointmentError,
    } = await supabase
      .from(
        "appointments"
      )
      .select(
        `
          id,
          patient_id,
          professional_id,
          status
        `
      )
      .eq(
        "id",
        appointmentId
      )
      .maybeSingle();

    if (
      appointmentError
    ) {
      console.error(
        "Errore lettura prenotazione chat:",
        appointmentError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare la prenotazione.",
        },
        {
          status: 500,
        }
      );
    }

    if (!appointment) {
      return NextResponse.json(
        {
          message:
            "Prenotazione non trovata.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Solo i due partecipanti possono
     * leggere la conversazione.
     */

    const isPatient =
      appointment.patient_id ===
      user.id;

    const isProfessional =
      appointment.professional_id ===
      user.id;

    if (
      !isPatient &&
      !isProfessional
    ) {
      return NextResponse.json(
        {
          message:
            "Chat non disponibile.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * MESSAGGI
     * =====================================================
     */

    const {
      data: messages,
      error:
        messagesError,
    } = await supabase
      .from(
        "appointment_messages"
      )
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
      .eq(
        "appointment_id",
        appointmentId
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        }
      );

    if (
      messagesError
    ) {
      console.error(
        "Errore lettura messaggi:",
        messagesError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile caricare i messaggi.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      messages:
        messages ??
        [],
    });
  } catch (error) {
    console.error(
      "Errore API lettura chat:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Errore interno del server.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      appointmentId,
    } =
      await context.params;

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          message:
            "Richiesta non valida.",
        },
        {
          status: 400,
        }
      );
    }

    const validation =
      messageSchema.safeParse({
        ...(typeof body ===
          "object" &&
        body !== null
          ? body
          : {}),

        appointmentId,
      });

    if (
      !validation.success
    ) {
      return NextResponse.json(
        {
          message:
            validation.error
              .issues[0]
              ?.message ??
            "Messaggio non valido.",
        },
        {
          status: 400,
        }
      );
    }

    const values =
      validation.data;

    const supabase =
      await createClient();

    /*
     * =====================================================
     * AUTENTICAZIONE
     * =====================================================
     */

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError
    ) {
      console.error(
        "Errore autenticazione invio messaggio:",
        userError
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          message:
            "Utente non autenticato.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * =====================================================
     * APPUNTAMENTO
     * =====================================================
     */

    const {
      data: appointment,
      error:
        appointmentError,
    } = await supabase
      .from(
        "appointments"
      )
      .select(
        `
          id,
          patient_id,
          professional_id,
          status,
          payment_status
        `
      )
      .eq(
        "id",
        appointmentId
      )
      .maybeSingle();

    if (
      appointmentError
    ) {
      console.error(
        "Errore controllo prenotazione:",
        appointmentError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare la prenotazione.",
        },
        {
          status: 500,
        }
      );
    }

    if (!appointment) {
      return NextResponse.json(
        {
          message:
            "Prenotazione non trovata.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * AUTORIZZAZIONE PARTECIPANTI
     * =====================================================
     */

    const isPatient =
      appointment.patient_id ===
      user.id;

    const isProfessional =
      appointment.professional_id ===
      user.id;

    if (
      !isPatient &&
      !isProfessional
    ) {
      return NextResponse.json(
        {
          message:
            "Non puoi inviare messaggi in questa chat.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * STATO CHAT
     * =====================================================
     */

    if (
      ![
        "PENDING",
        "ACCEPTED",
        "COMPLETED",
      ].includes(
        appointment.status
      )
    ) {
      return NextResponse.json(
        {
          message:
            "La chat non è disponibile per questa prenotazione.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * PROTEZIONE CONTATTI OFF-PLATFORM
     * =====================================================
     *
     * Prima del pagamento non consentiamo
     * lo scambio di recapiti o sistemi
     * di pagamento esterni.
     *
     * Una volta PAID, i contatti vengono
     * sbloccati per esigenze operative
     * legate alla prestazione.
     */

    const contactSharingAllowed =
      appointment.payment_status ===
      "PAID";

    if (!contactSharingAllowed) {
      const detectedTypes =
        detectOffPlatformContact(
          values.message
        );

      if (detectedTypes.length > 0) {
        /*
         * Salviamo solamente il tipo di
         * tentativo, non il contenuto del
         * messaggio.
         */
        try {
          const admin =
            getSupabaseAdmin();

          const {
            error:
              attemptLogError,
          } = await admin
            .from(
              "off_platform_contact_attempts"
            )
            .insert({
              appointment_id:
                appointmentId,

              sender_id:
                user.id,

              sender_role:
                isPatient
                  ? "PATIENT"
                  : "PROFESSIONAL",

              detected_types:
                detectedTypes,
            });

          if (attemptLogError) {
            console.error(
              "Errore log tentativo off-platform:",
              attemptLogError
            );
          }
        } catch (logError) {
          /*
           * Un errore nel log non deve
           * consentire il bypass del filtro.
           */
          console.error(
            "Errore audit off-platform:",
            logError
          );
        }

        return NextResponse.json(
          {
            code:
              "OFF_PLATFORM_CONTACT_BLOCKED",

            message:
              "Per la sicurezza di paziente e professionista, i contatti personali e i pagamenti esterni possono essere condivisi solo dopo il pagamento della prenotazione.",

            detectedTypes,
          },
          {
            status: 422,
          }
        );
      }
    }

    /*
     * =====================================================
     * DESTINATARIO
     * =====================================================
     */

    const recipientId =
      isPatient
        ? appointment.professional_id
        : appointment.patient_id;

    /*
     * =====================================================
     * CREAZIONE MESSAGGIO
     * =====================================================
     */

    const {
      data: message,
      error:
        insertError,
    } = await supabase
      .from(
        "appointment_messages"
      )
      .insert({
        appointment_id:
          appointmentId,

        sender_id:
          user.id,

        message:
          values.message,

        read:
          false,
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

    if (
      insertError
    ) {
      console.error(
        "Errore invio messaggio:",
        {
          message:
            insertError.message,

          code:
            insertError.code,

          details:
            insertError.details,

          hint:
            insertError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            insertError.message ||
            "Impossibile inviare il messaggio.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * PROFILO MITTENTE
     * =====================================================
     */

    const {
      data:
        senderProfile,

      error:
        senderProfileError,
    } = await supabase
      .from(
        "profiles"
      )
      .select(
        `
          first_name,
          last_name
        `
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

    if (
      senderProfileError
    ) {
      console.error(
        "Errore profilo mittente chat:",
        senderProfileError
      );
    }

    const senderName =
      [
        senderProfile
          ?.first_name,

        senderProfile
          ?.last_name,
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        );

    /*
     * =====================================================
     * NOTIFICA MESSAGE_RECEIVED
     * =====================================================
     */

    const supabaseAdmin =
      getSupabaseAdmin();

    /*
     * Ogni messaggio è un evento distinto.
     *
     * Non applichiamo l'anti-duplicato
     * delle recensioni perché due messaggi
     * consecutivi devono poter generare
     * due eventi distinti.
     */

    const notificationMessage =
      senderName
        ? `${senderName} ti ha inviato un nuovo messaggio.`
        : "Hai ricevuto un nuovo messaggio.";

    const notificationLink =
      `/dashboard/appointments/${encodeURIComponent(
        appointmentId
      )}/chat`;

    const {
      data:
        notification,

      error:
        notificationError,
    } = await supabaseAdmin
      .from(
        "notifications"
      )
      .insert({
        user_id:
          recipientId,

        appointment_id:
          appointmentId,

        review_report_id:
          null,

        type:
          "MESSAGE_RECEIVED",

        title:
          "Nuovo messaggio",

        message:
          notificationMessage,

        link:
          notificationLink,

        read:
          false,
      })
      .select(
        `
          id,
          user_id,
          appointment_id,
          type,
          link,
          read,
          created_at
        `
      )
      .single();

    /*
     * La notifica è secondaria:
     * un eventuale errore NON annulla
     * il messaggio già inviato.
     */

    if (
      notificationError
    ) {
      console.error(
        "Messaggio inviato ma notifica destinatario non creata:",
        {
          recipientId,

          appointmentId,

          messageId:
            message.id,

          error:
            notificationError,
        }
      );
    }

    /*
     * =====================================================
     * RISPOSTA
     * =====================================================
     */

    return NextResponse.json(
      {
        success: true,

        message,

        recipientId,

        notificationCreated:
          !notificationError,

        notificationId:
          notification
            ?.id ??
          null,

        notificationLink,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Errore API invio messaggio:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Il server non è riuscito a inviare il messaggio.",
      },
      {
        status: 500,
      }
    );
  }
}