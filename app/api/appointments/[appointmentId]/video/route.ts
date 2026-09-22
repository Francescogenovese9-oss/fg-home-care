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
  parseRomeDateTime,
} from "@/lib/payments/cancellation-policy";

import {
  createWherebyRoom,
} from "@/lib/video/whereby";

type RouteContext = {
  params: Promise<{
    appointmentId: string;
  }>;
};

const EARLY_ACCESS_MINUTES = 15;
const LATE_ACCESS_MINUTES = 30;

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { appointmentId } =
      await context.params;

    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Errore autenticazione videoconsulto:",
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

    const {
      data: appointment,
      error: appointmentError,
    } = await supabase
      .from("appointments")
      .select(`
        id,
        patient_id,
        professional_id,
        service_type,
        appointment_date,
        appointment_time,
        duration_minutes,
        status,
        payment_status
      `)
      .eq("id", appointmentId)
      .maybeSingle();

    if (appointmentError) {
      console.error(
        "Errore lettura appuntamento videoconsulto:",
        appointmentError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare l'appuntamento.",
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
            "Appuntamento non trovato.",
        },
        {
          status: 404,
        }
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
            "Videoconsulto non disponibile.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      appointment.service_type !==
      "VIDEO_CONSULTATION"
    ) {
      return NextResponse.json(
        {
          message:
            "Questo appuntamento non e un videoconsulto.",
        },
        {
          status: 400,
        }
      );
    }

    if (appointment.status !== "ACCEPTED") {
      return NextResponse.json(
        {
          message:
            "Il videoconsulto richiede un appuntamento accettato.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      appointment.payment_status !==
      "PAID"
    ) {
      return NextResponse.json(
        {
          message:
            "Il videoconsulto sara disponibile dopo il pagamento.",
        },
        {
          status: 402,
        }
      );
    }

    const appointmentStart =
      parseRomeDateTime(
        appointment.appointment_date,
        appointment.appointment_time
      );

    const durationMinutes =
      Number(
        appointment.duration_minutes
      );

    if (
      !Number.isFinite(durationMinutes) ||
      durationMinutes <= 0
    ) {
      throw new Error(
        "Durata appuntamento non valida."
      );
    }

    const appointmentEnd =
      new Date(
        appointmentStart.getTime() +
          durationMinutes * 60 * 1000
      );

    const accessStartsAt =
      new Date(
        appointmentStart.getTime() -
          EARLY_ACCESS_MINUTES *
            60 *
            1000
      );

    const accessEndsAt =
      new Date(
        appointmentEnd.getTime() +
          LATE_ACCESS_MINUTES *
            60 *
            1000
      );

    const now = new Date();

    if (now < accessStartsAt) {
      return NextResponse.json(
        {
          message:
            "Il videoconsulto sara disponibile 15 minuti prima dell'orario previsto.",
          availableAt:
            accessStartsAt.toISOString(),
        },
        {
          status: 403,
        }
      );
    }

    if (now > accessEndsAt) {
      return NextResponse.json(
        {
          message:
            "La finestra di accesso al videoconsulto e terminata.",
        },
        {
          status: 410,
        }
      );
    }

    const admin =
      getSupabaseAdmin();

    const {
      data: existingRoom,
      error: existingRoomError,
    } = await admin
      .from("video_consultations")
      .select(`
        room_url,
        host_room_url,
        ends_at,
        patient_joined_at,
        professional_joined_at
      `)
      .eq(
        "appointment_id",
        appointment.id
      )
      .maybeSingle();

    if (existingRoomError) {
      console.error(
        "Errore lettura stanza videoconsulto:",
        existingRoomError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare la stanza del videoconsulto.",
        },
        {
          status: 500,
        }
      );
    }

    if (existingRoom) {
      const joinedColumn = isProfessional
        ? "professional_joined_at"
        : "patient_joined_at";

      const recipientId = isProfessional
        ? appointment.patient_id
        : appointment.professional_id;

      const participantLabel = isProfessional
        ? "Il professionista"
        : "Il paziente";

      const { data: firstJoin, error: joinError } =
        await admin
          .from("video_consultations")
          .update({
            [joinedColumn]: now.toISOString(),
          })
          .eq("appointment_id", appointment.id)
          .is(joinedColumn, null)
          .select("appointment_id")
          .maybeSingle();

      if (joinError) {
        console.error(
          "Errore registrazione ingresso videoconsulto:",
          joinError
        );
      }

      if (firstJoin) {
        const { error: notificationError } =
          await admin
            .from("notifications")
            .insert({
                                                      user_id: recipientId,
              appointment_id: appointment.id,
              review_report_id: null,
              type: "VIDEO_CONSULTATION_STARTED",
              title: "Videoconsulto iniziato",
              message:
                `${participantLabel} e entrato nel videoconsulto. Collegati ora.`,
              link:
                `/dashboard/appointments/${appointment.id}/video`,
              read: false,
            });

        if (notificationError) {
          console.error(
            "Errore notifica avvio videoconsulto:",
            notificationError
          );
        }
      }

      const roomUrl =
        isProfessional
          ? existingRoom.host_room_url ??
            existingRoom.room_url
          : existingRoom.room_url;

      return NextResponse.json({
        roomUrl,
        role: isProfessional
          ? "PROFESSIONAL"
          : "PATIENT",
        startsAt:
          appointmentStart.toISOString(),
        endsAt:
          appointmentEnd.toISOString(),
      });
    }

    const wherebyRoom =
      await createWherebyRoom({
        startDate: appointmentStart,
        endDate: accessEndsAt,
      });

    const {
      data: createdRoom,
      error: roomInsertError,
    } = await admin
      .from("video_consultations")
      .insert({
        appointment_id:
          appointment.id,
        provider:
          "WHEREBY",
        provider_room_name:
          wherebyRoom.meetingId,
        room_url:
          wherebyRoom.roomUrl,
        host_room_url:
          wherebyRoom.hostRoomUrl,
        starts_at:
          appointmentStart.toISOString(),
        ends_at:
          accessEndsAt.toISOString(),
      })
      .select(`
        room_url,
        host_room_url
      `)
      .single();

    let finalRoom =
      createdRoom;

    if (roomInsertError) {
      /*
       * Due partecipanti potrebbero richiedere
       * la stanza nello stesso istante.
       *
       * Il vincolo UNIQUE su appointment_id
       * impedisce di salvarne due.
       */
      if (roomInsertError.code === "23505") {
        const {
          data: concurrentRoom,
          error: concurrentRoomError,
        } = await admin
          .from("video_consultations")
          .select(`
            room_url,
            host_room_url
          `)
          .eq(
            "appointment_id",
            appointment.id
          )
          .maybeSingle();

        if (
          concurrentRoomError ||
          !concurrentRoom
        ) {
          console.error(
            "Errore recupero stanza concorrente:",
            concurrentRoomError
          );

          return NextResponse.json(
            {
              message:
                "Impossibile preparare il videoconsulto.",
            },
            {
              status: 500,
            }
          );
        }

        finalRoom =
          concurrentRoom;
      } else {
        console.error(
          "Errore salvataggio stanza videoconsulto:",
          roomInsertError
        );

        return NextResponse.json(
          {
            message:
              "Impossibile preparare il videoconsulto.",
          },
          {
            status: 500,
          }
        );
      }
    }

    if (!finalRoom) {
      return NextResponse.json(
        {
          message:
            "Impossibile preparare il videoconsulto.",
        },
        {
          status: 500,
        }
      );
    }

    const joinedColumn = isProfessional
      ? "professional_joined_at"
      : "patient_joined_at";

    const { data: firstJoin, error: joinError } =
      await admin
        .from("video_consultations")
        .update({
          [joinedColumn]: now.toISOString(),
        })
        .eq("appointment_id", appointment.id)
        .is(joinedColumn, null)
        .select("appointment_id")
        .maybeSingle();

    if (joinError) {
      console.error(
        "Errore registrazione ingresso videoconsulto:",
        joinError
      );
    }

    if (firstJoin) {
      const recipientId = isProfessional
        ? appointment.patient_id
        : appointment.professional_id;

      const participantLabel = isProfessional
        ? "Il professionista"
        : "Il paziente";

      const { error: notificationError } =
        await admin
          .from("notifications")
          .insert({
            user_id: recipientId,
            appointment_id: appointment.id,
            review_report_id: null,
            type: "VIDEO_CONSULTATION_STARTED",
            title: "Videoconsulto iniziato",
            message:
              `${participantLabel} e entrato nel videoconsulto. Collegati ora.`,
            link:
              `/dashboard/appointments/${appointment.id}/video`,
            read: false,
          });

      if (notificationError) {
        console.error(
          "Errore notifica avvio videoconsulto:",
          notificationError
        );
      }
    }

    const roomUrl =
      isProfessional
        ? finalRoom.host_room_url ??
          finalRoom.room_url
        : finalRoom.room_url;

    return NextResponse.json({
      roomUrl,
      role: isProfessional
        ? "PROFESSIONAL"
        : "PATIENT",
      startsAt:
        appointmentStart.toISOString(),
      endsAt:
        appointmentEnd.toISOString(),
    });
  } catch (error) {
    console.error(
      "Errore videoconsulto:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Errore durante la preparazione del videoconsulto.",
      },
      {
        status: 500,
      }
    );
  }
}
