import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { appointmentSchema } from "@/lib/validations/appointment";

const weekdayMap: Record<number, string> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

function normalizeTime(
  value: string | null | undefined
) {
  return value?.slice(0, 5) ?? null;
}

function convertTimeToMinutes(time: string) {
  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function formatMinutesAsTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(2, "0")}`;
}

function addMinutesToTime(
  time: string,
  minutesToAdd: number
) {
  const startingMinutes =
    convertTimeToMinutes(time);

  return formatMinutesAsTime(
    startingMinutes + minutesToAdd
  );
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    const validation =
      appointmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error.issues[0]?.message ??
            "I dati della prenotazione non sono validi.",
        },
        { status: 400 }
      );
    }

    const values = validation.data;
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
          message:
            "Devi effettuare l’accesso prima di inviare una richiesta.",
        },
        { status: 401 }
      );
    }

    if (user.id === values.professionalId) {
      return NextResponse.json(
        {
          message:
            "Non puoi inviare una richiesta al tuo stesso account.",
        },
        { status: 400 }
      );
    }

    const {
      data: patientProfile,
      error: patientProfileError,
    } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (patientProfileError) {
      console.error(
        "Errore lettura profilo paziente:",
        patientProfileError
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile verificare il profilo dell’utente.",
        },
        { status: 500 }
      );
    }

    if (!patientProfile) {
      return NextResponse.json(
        {
          message: "Profilo utente non trovato.",
        },
        { status: 404 }
      );
    }

    if (patientProfile.role !== "PATIENT") {
      return NextResponse.json(
        {
          message:
            "Solo gli account paziente possono inviare richieste di assistenza.",
        },
        { status: 403 }
      );
    }

    /*
     * Leggiamo il professionista dalla vista pubblica,
     * che contiene soltanto profili approvati e pubblicati.
     */
    const {
      data: professional,
      error: professionalError,
    } = await supabase
      .from("public_professionals")
      .select(
        `
          user_id,
          hourly_rate,
          available_weekdays,
          available_from,
          available_to,
          home_visits,
          video_consultations,
          verification_status,
          published
        `
      )
      .eq(
        "user_id",
        values.professionalId
      )
      .maybeSingle();

    if (professionalError) {
      console.error(
        "Errore lettura professionista:",
        professionalError
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile verificare la disponibilità del professionista.",
        },
        { status: 500 }
      );
    }

    if (!professional) {
      return NextResponse.json(
        {
          message:
            "Il professionista non è disponibile o non è più pubblicato.",
        },
        { status: 404 }
      );
    }

    if (
      professional.verification_status !==
        "APPROVED" ||
      professional.published !== true
    ) {
      return NextResponse.json(
        {
          message:
            "Il professionista non è disponibile per le prenotazioni.",
        },
        { status: 404 }
      );
    }

    if (
      values.serviceType ===
        "HOME_VISIT" &&
      !professional.home_visits
    ) {
      return NextResponse.json(
        {
          message:
            "Il professionista non offre assistenza domiciliare.",
        },
        { status: 400 }
      );
    }

    if (
      values.serviceType ===
        "VIDEO_CONSULTATION" &&
      !professional.video_consultations
    ) {
      return NextResponse.json(
        {
          message:
            "Il professionista non offre videoconsulti.",
        },
        { status: 400 }
      );
    }

    const selectedDateTime = new Date(
      `${values.appointmentDate}T${values.appointmentTime}:00`
    );

    if (
      Number.isNaN(
        selectedDateTime.getTime()
      )
    ) {
      return NextResponse.json(
        {
          message:
            "La data o l’orario selezionati non sono validi.",
        },
        { status: 400 }
      );
    }

    if (
      selectedDateTime.getTime() <=
      Date.now()
    ) {
      return NextResponse.json(
        {
          message:
            "La data e l’orario devono essere successivi al momento attuale.",
        },
        { status: 400 }
      );
    }

    /*
     * Utilizziamo mezzogiorno per calcolare
     * il giorno della settimana senza variazioni
     * causate dal fuso orario.
     */
    const selectedDateForWeekday =
      new Date(
        `${values.appointmentDate}T12:00:00`
      );

    const selectedWeekday =
      weekdayMap[
        selectedDateForWeekday.getDay()
      ];

    const availableWeekdays: string[] =
      professional.available_weekdays ??
      [];

    if (
      availableWeekdays.length > 0 &&
      !availableWeekdays.includes(
        selectedWeekday
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Il professionista non risulta disponibile nel giorno selezionato.",
        },
        { status: 400 }
      );
    }

    const availableFrom =
      normalizeTime(
        professional.available_from
      );

    const availableTo =
      normalizeTime(
        professional.available_to
      );

    const appointmentEndTime =
      addMinutesToTime(
        values.appointmentTime,
        values.durationMinutes
      );

    /*
     * Evitiamo appuntamenti che terminano
     * nel giorno successivo.
     */
    if (
      convertTimeToMinutes(
        values.appointmentTime
      ) +
        values.durationMinutes >=
      24 * 60
    ) {
      return NextResponse.json(
        {
          message:
            "La prestazione non può terminare nel giorno successivo.",
        },
        { status: 400 }
      );
    }

    if (
      availableFrom &&
      values.appointmentTime <
        availableFrom
    ) {
      return NextResponse.json(
        {
          message: `Il professionista è disponibile dalle ${availableFrom}.`,
        },
        { status: 400 }
      );
    }

    if (
      availableTo &&
      appointmentEndTime > availableTo
    ) {
      return NextResponse.json(
        {
          message:
            `La prestazione terminerebbe alle ${appointmentEndTime}, ` +
            `ma il professionista è disponibile fino alle ${availableTo}.`,
        },
        { status: 400 }
      );
    }

    /*
     * Controllo dei blocchi inseriti
     * nell’agenda dal professionista.
     */
    const {
      data: isAvailable,
      error: availabilityError,
    } = await supabase.rpc(
      "is_professional_available",
      {
        p_professional_id:
          values.professionalId,
        p_appointment_date:
          values.appointmentDate,
        p_appointment_time:
          values.appointmentTime,
        p_duration_minutes:
          values.durationMinutes,
      }
    );

    if (availabilityError) {
      console.error(
        "Errore verifica indisponibilità:",
        {
          message:
            availabilityError.message,
          code: availabilityError.code,
          details:
            availabilityError.details,
          hint: availabilityError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile verificare la disponibilità del professionista.",
        },
        { status: 500 }
      );
    }

    if (isAvailable !== true) {
      return NextResponse.json(
        {
          message:
            "Il professionista non è disponibile nella data o nella fascia oraria selezionata.",
        },
        { status: 409 }
      );
    }

    /*
     * Recuperiamo gli appuntamenti attivi
     * del professionista nella stessa data.
     */
    const {
      data: existingAppointments,
      error: conflictError,
    } = await supabase
      .from("appointments")
      .select(
        `
          id,
          appointment_time,
          duration_minutes,
          status
        `
      )
      .eq(
        "professional_id",
        values.professionalId
      )
      .eq(
        "appointment_date",
        values.appointmentDate
      )
      .in("status", [
        "PENDING",
        "ACCEPTED",
      ]);

    if (conflictError) {
      console.error(
        "Errore controllo appuntamenti:",
        {
          message:
            conflictError.message,
          code: conflictError.code,
          details:
            conflictError.details,
          hint: conflictError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile verificare gli appuntamenti già presenti.",
        },
        { status: 500 }
      );
    }

    const requestedStart =
      convertTimeToMinutes(
        values.appointmentTime
      );

    const requestedEnd =
      requestedStart +
      values.durationMinutes;

    const hasAppointmentConflict =
      (
        existingAppointments ?? []
      ).some((appointment) => {
        const existingStart =
          convertTimeToMinutes(
            appointment.appointment_time.slice(
              0,
              5
            )
          );

        const existingEnd =
          existingStart +
          appointment.duration_minutes;

        return (
          requestedStart < existingEnd &&
          requestedEnd > existingStart
        );
      });

    if (hasAppointmentConflict) {
      return NextResponse.json(
        {
          message:
            "La fascia oraria selezionata si sovrappone a un’altra richiesta o prenotazione.",
        },
        { status: 409 }
      );
    }

    console.log(
      "Creazione appuntamento:",
      {
        patientId: user.id,
        professionalId:
          values.professionalId,
        serviceType:
          values.serviceType,
        appointmentDate:
          values.appointmentDate,
        appointmentTime:
          values.appointmentTime,
        appointmentEndTime,
        durationMinutes:
          values.durationMinutes,
      }
    );

    const {
      data: appointment,
      error: insertError,
    } = await supabase
      .from("appointments")
      .insert({
        patient_id: user.id,
        professional_id:
          values.professionalId,
        service_type:
          values.serviceType,
        appointment_date:
          values.appointmentDate,
        appointment_time:
          values.appointmentTime,
        duration_minutes:
          values.durationMinutes,
        hourly_rate:
          professional.hourly_rate,
        patient_notes:
          values.patientNotes?.trim() ||
          null,
        status: "PENDING",
      })
      .select(
        `
          id,
          patient_id,
          professional_id,
          service_type,
          appointment_date,
          appointment_time,
          duration_minutes,
          hourly_rate,
          patient_notes,
          status,
          created_at
        `
      )
      .single();

    if (insertError) {
      console.error(
        "Errore creazione appuntamento:",
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
            "Non è stato possibile salvare la richiesta.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        appointment,
        message:
          "Richiesta inviata correttamente. Il professionista dovrà confermarla.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Errore API creazione appuntamento:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Il server non è riuscito a completare la richiesta.",
      },
      { status: 500 }
    );
  }
}