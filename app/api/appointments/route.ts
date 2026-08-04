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

function normalizeTime(value: string | null | undefined) {
  return value?.slice(0, 5) ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    const validation = appointmentSchema.safeParse(body);

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
      console.error("Errore lettura utente:", userError);
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
     * Usiamo la vista pubblica perché è leggibile anche
     * dall’account paziente e contiene soltanto professionisti
     * approvati e pubblicati.
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
      .eq("user_id", values.professionalId)
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
      professional.verification_status !== "APPROVED" ||
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
      values.serviceType === "HOME_VISIT" &&
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
      values.serviceType === "VIDEO_CONSULTATION" &&
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

    /*
     * Usiamo mezzogiorno per evitare variazioni del giorno
     * causate dal fuso orario durante il calcolo del weekday.
     */
    const selectedDate = new Date(
      `${values.appointmentDate}T12:00:00`
    );

    if (Number.isNaN(selectedDate.getTime())) {
      return NextResponse.json(
        {
          message: "La data selezionata non è valida.",
        },
        { status: 400 }
      );
    }

    const selectedWeekday =
      weekdayMap[selectedDate.getDay()];

    const availableWeekdays: string[] =
      professional.available_weekdays ?? [];

    if (
      availableWeekdays.length > 0 &&
      !availableWeekdays.includes(selectedWeekday)
    ) {
      return NextResponse.json(
        {
          message:
            "Il professionista non risulta disponibile nel giorno selezionato.",
        },
        { status: 400 }
      );
    }

    const availableFrom = normalizeTime(
      professional.available_from
    );

    const availableTo = normalizeTime(
      professional.available_to
    );

    if (
      availableFrom &&
      values.appointmentTime < availableFrom
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
      values.appointmentTime > availableTo
    ) {
      return NextResponse.json(
        {
          message: `Il professionista è disponibile fino alle ${availableTo}.`,
        },
        { status: 400 }
      );
    }

    /*
     * Verifichiamo se esiste già una richiesta attiva
     * per lo stesso professionista, giorno e orario.
     */
    const {
      data: conflictingAppointments,
      error: conflictError,
    } = await supabase
      .from("appointments")
      .select("id")
      .eq(
        "professional_id",
        values.professionalId
      )
      .eq(
        "appointment_date",
        values.appointmentDate
      )
      .eq(
        "appointment_time",
        values.appointmentTime
      )
      .in("status", ["PENDING", "ACCEPTED"])
      .limit(1);

    if (conflictError) {
      console.error(
        "Errore controllo disponibilità:",
        conflictError
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile verificare la disponibilità dell’orario.",
        },
        { status: 500 }
      );
    }

    if (
      conflictingAppointments &&
      conflictingAppointments.length > 0
    ) {
      return NextResponse.json(
        {
          message:
            "L’orario selezionato non è più disponibile.",
        },
        { status: 409 }
      );
    }

    console.log("Creazione appuntamento:", {
      patientId: user.id,
      professionalId: values.professionalId,
      serviceType: values.serviceType,
      appointmentDate: values.appointmentDate,
      appointmentTime: values.appointmentTime,
      durationMinutes: values.durationMinutes,
    });

    const {
      data: appointment,
      error: insertError,
    } = await supabase
      .from("appointments")
      .insert({
        patient_id: user.id,
        professional_id: values.professionalId,
        service_type: values.serviceType,
        appointment_date: values.appointmentDate,
        appointment_time: values.appointmentTime,
        duration_minutes: values.durationMinutes,
        hourly_rate: professional.hourly_rate,
        patient_notes:
          values.patientNotes?.trim() || null,
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
      console.error("Errore creazione appuntamento:", {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });

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