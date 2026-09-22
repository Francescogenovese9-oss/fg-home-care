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
  sendTransactionalEmail,
} from "@/lib/email/send-transactional-email";

import {
  appointmentRequestedTemplate,
} from "@/lib/email/templates/appointment-requested";

import {
  appointmentSchema,
} from "@/lib/validations/appointment";

const weekdayMap: Record<
  number,
  string
> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

function normalizeTime(
  value:
    | string
    | null
    | undefined
) {
  return (
    value?.slice(
      0,
      5
    ) ??
    null
  );
}

function convertTimeToMinutes(
  time: string
) {
  const [
    hours,
    minutes,
  ] = time
    .split(":")
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
}

function formatMinutesAsTime(
  totalMinutes: number
) {
  const hours =
    Math.floor(
      totalMinutes /
        60
    );

  const minutes =
    totalMinutes %
    60;

  return `${String(
    hours
  ).padStart(
    2,
    "0"
  )}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )}`;
}

function addMinutesToTime(
  time: string,
  minutesToAdd: number
) {
  const startingMinutes =
    convertTimeToMinutes(
      time
    );

  return formatMinutesAsTime(
    startingMinutes +
      minutesToAdd
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    let body:
      unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          message:
            "La richiesta non contiene dati validi.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * VALIDAZIONE
     * =====================================================
     */

    const validation =
      appointmentSchema.safeParse(
        body
      );

    if (
      !validation.success
    ) {
      return NextResponse.json(
        {
          message:
            validation.error
              .issues[0]
              ?.message ??
            "I dati della prenotazione non sono validi.",
        },
        {
          status: 400,
        }
      );
    }

    const values =
      validation.data;

    /*
     * =====================================================
     * CLIENT UTENTE
     * =====================================================
     */

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
        {
          status: 401,
        }
      );
    }

    /*
     * =====================================================
     * CONTROLLO AUTO-PRENOTAZIONE
     * =====================================================
     */

    if (
      user.id ===
      values.professionalId
    ) {
      return NextResponse.json(
        {
          message:
            "Non puoi inviare una richiesta al tuo stesso account.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * VERIFICA RUOLO PAZIENTE
     * =====================================================
     */

    const {
      data:
        patientProfile,

      error:
        patientProfileError,
    } = await supabase
      .from(
        "profiles"
      )
      .select(
        "id, role"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

    if (
      patientProfileError
    ) {
      console.error(
        "Errore lettura profilo paziente:",
        patientProfileError
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile verificare il profilo dell’utente.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !patientProfile
    ) {
      return NextResponse.json(
        {
          message:
            "Profilo utente non trovato.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      patientProfile.role !==
      "PATIENT"
    ) {
      return NextResponse.json(
        {
          message:
            "Solo gli account paziente possono inviare richieste di assistenza.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * PROFESSIONISTA
     * =====================================================
     *
     * Leggiamo il professionista dalla vista pubblica,
     * che contiene soltanto profili approvati e pubblicati.
     * =====================================================
     */

    const {
      data:
        professional,

      error:
        professionalError,
    } = await supabase
      .from(
        "public_professionals"
      )
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

    if (
      professionalError
    ) {
      console.error(
        "Errore lettura professionista:",
        professionalError
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile verificare la disponibilità del professionista.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !professional
    ) {
      return NextResponse.json(
        {
          message:
            "Il professionista non è disponibile o non è più pubblicato.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * PROFESSIONISTA APPROVATO
     * =====================================================
     */

    if (
      professional.verification_status !==
        "APPROVED" ||
      professional.published !==
        true
    ) {
      return NextResponse.json(
        {
          message:
            "Il professionista non è disponibile per le prenotazioni.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * SERVIZIO OFFERTO
     * =====================================================
     */

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
        {
          status: 400,
        }
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
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * DATA E ORARIO
     * =====================================================
     */

    const selectedDateTime =
      new Date(
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
        {
          status: 400,
        }
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
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * GIORNO DELLA SETTIMANA
     * =====================================================
     *
     * Utilizziamo mezzogiorno per calcolare
     * il giorno della settimana senza variazioni
     * causate dal fuso orario.
     * =====================================================
     */

    const selectedDateForWeekday =
      new Date(
        `${values.appointmentDate}T12:00:00`
      );

    const selectedWeekday =
      weekdayMap[
        selectedDateForWeekday.getDay()
      ];

    const availableWeekdays:
      string[] =
      professional.available_weekdays ??
      [];

    if (
      availableWeekdays.length >
        0 &&
      !availableWeekdays.includes(
        selectedWeekday
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Il professionista non risulta disponibile nel giorno selezionato.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * FASCIA ORARIA
     * =====================================================
     */

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
        {
          status: 400,
        }
      );
    }

    if (
      availableFrom &&
      values.appointmentTime <
        availableFrom
    ) {
      return NextResponse.json(
        {
          message:
            `Il professionista è disponibile dalle ${availableFrom}.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      availableTo &&
      appointmentEndTime >
        availableTo
    ) {
      return NextResponse.json(
        {
          message:
            `La prestazione terminerebbe alle ${appointmentEndTime}, ` +
            `ma il professionista è disponibile fino alle ${availableTo}.`,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * BLOCCHI AGENDA PROFESSIONISTA
     * =====================================================
     */

    const {
      data:
        isAvailable,

      error:
        availabilityError,
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

    if (
      availabilityError
    ) {
      console.error(
        "Errore verifica indisponibilità:",
        {
          message:
            availabilityError.message,

          code:
            availabilityError.code,

          details:
            availabilityError.details,

          hint:
            availabilityError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile verificare la disponibilità del professionista.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      isAvailable !==
      true
    ) {
      return NextResponse.json(
        {
          message:
            "Il professionista non è disponibile nella data o nella fascia oraria selezionata.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =====================================================
     * CONTROLLO SOVRAPPOSIZIONI
     * =====================================================
     *
     * Recuperiamo gli appuntamenti attivi
     * del professionista nella stessa data.
     * =====================================================
     */

    const {
      data:
        existingAppointments,

      error:
        conflictError,
    } = await supabase
      .from(
        "appointments"
      )
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
      .in(
        "status",
        [
          "PENDING",
          "ACCEPTED",
        ]
      );

    if (
      conflictError
    ) {
      console.error(
        "Errore controllo appuntamenti:",
        {
          message:
            conflictError.message,

          code:
            conflictError.code,

          details:
            conflictError.details,

          hint:
            conflictError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile verificare gli appuntamenti già presenti.",
        },
        {
          status: 500,
        }
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
        existingAppointments ??
        []
      ).some(
        (
          appointment
        ) => {
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
            requestedStart <
              existingEnd &&
            requestedEnd >
              existingStart
          );
        }
      );

    if (
      hasAppointmentConflict
    ) {
      return NextResponse.json(
        {
          message:
            "La fascia oraria selezionata si sovrappone a un’altra richiesta o prenotazione.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =====================================================
     * LOG
     * =====================================================
     */

    console.log(
      "Creazione appuntamento:",
      {
        patientId:
          user.id,

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

    /*
     * =====================================================
     * CLIENT ADMIN PRIVILEGIATO
     * =====================================================
     *
     * Tutti i controlli di autorizzazione e
     * business logic sono già stati effettuati
     * utilizzando la sessione del paziente.
     *
     * Solo l'INSERT finale usa service role.
     *
     * In questo modo il browser non deve avere
     * accesso INSERT diretto alla tabella
     * appointments.
     * =====================================================
     */

    const supabaseAdmin =
      getSupabaseAdmin();

    /*
     * =====================================================
     * CREAZIONE APPUNTAMENTO
     * =====================================================
     *
     * Il browser non decide:
     *
     * - patient_id
     * - hourly_rate
     * - status iniziale
     *
     * patient_id arriva dalla sessione;
     * hourly_rate dal profilo professionista;
     * status viene imposto dal server.
     * =====================================================
     */

    const {
      data:
        appointment,

      error:
        insertError,
    } = await supabaseAdmin
      .from(
        "appointments"
      )
      .insert({
        patient_id:
          user.id,

        professional_id:
          values.professionalId,

        booking_source:
          values.bookingSource,

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

        service_street_address:
          values.serviceStreetAddress ?? null,

        service_city:
          values.serviceCity ?? null,

        service_province:
          values.serviceProvince ?? null,

        service_postal_code:
          values.servicePostalCode ?? null,

        service_access_notes:
          values.serviceAccessNotes ?? null,

        patient_notes:
          values.patientNotes ?? null,

        status:
          "PENDING",
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
          service_street_address,
          service_city,
          service_province,
          service_postal_code,
          service_access_notes,
          patient_notes,
          status,
          created_at
        `
      )
      .single();

    if (
      insertError
    ) {
      console.error(
        "Errore creazione appuntamento:",
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

      /*
       * =====================================================
       * CONFLITTO ATOMICO DATABASE
       * =====================================================
       *
       * PostgreSQL restituisce 23P01 quando viene
       * violato il vincolo EXCLUDE.
       *
       * Questo può accadere quando due pazienti
       * tentano di prenotare praticamente nello
       * stesso momento la stessa fascia oraria.
       *
       * Il database rappresenta l'ultima barriera
       * contro le doppie prenotazioni.
       * =====================================================
       */

      if (
        insertError.code ===
        "23P01"
      ) {
        return NextResponse.json(
          {
            message:
              "La fascia oraria è stata appena occupata da un’altra richiesta. Scegli un altro orario.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          message:
            "Non è stato possibile salvare la richiesta.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * NOTIFICA AL PROFESSIONISTA
     * =====================================================
     *
     * L'appuntamento è già stato creato correttamente.
     *
     * La notifica è quindi un'operazione secondaria:
     * se dovesse fallire, non annulliamo la richiesta
     * del paziente.
     * =====================================================
     */

    const notificationLink =
      "/dashboard/professional/appointments";

    const formattedAppointmentDate =
      new Intl.DateTimeFormat(
        "it-IT",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      ).format(
        new Date(
          `${values.appointmentDate}T12:00:00`
        )
      );

    const serviceLabel =
      values.serviceType ===
      "HOME_VISIT"
        ? "assistenza domiciliare"
        : "videoconsulto";

    const {
      error:
        notificationError,
    } = await supabaseAdmin
      .from(
        "notifications"
      )
      .insert({
        user_id:
          values.professionalId,

        appointment_id:
          appointment.id,

        review_report_id:
          null,

        type:
          "APPOINTMENT_REQUESTED",

        title:
          "Nuova richiesta di assistenza",

        message:
          `Hai ricevuto una nuova richiesta di ${serviceLabel} ` +
          `per il ${formattedAppointmentDate} alle ${values.appointmentTime}.`,

        link:
          notificationLink,

        read:
          false,
      });

    if (
      notificationError
    ) {
      console.error(
        "Appuntamento creato ma errore creazione notifica professionista:",
        {
          appointmentId:
            appointment.id,

          professionalId:
            values.professionalId,

          message:
            notificationError.message,

          code:
            notificationError.code,

          details:
            notificationError.details,

          hint:
            notificationError.hint,
        }
      );
    }

    /*
     * =====================================================
     * EMAIL TRANSAZIONALE AL PROFESSIONISTA
     * =====================================================
     *
     * L'appuntamento è già stato creato correttamente.
     *
     * Anche l'email è quindi un effetto secondario:
     * un eventuale errore Brevo non deve annullare
     * la prenotazione.
     * =====================================================
     */

    const {
      data:
        emailProfiles,

      error:
        emailProfilesError,
    } = await supabaseAdmin
      .from(
        "profiles"
      )
      .select(
        `
          id,
          first_name,
          last_name,
          email
        `
      )
      .in(
        "id",
        [
          user.id,
          values.professionalId,
        ]
      );

    if (
      emailProfilesError
    ) {
      console.error(
        "Appuntamento creato ma errore lettura profili per email:",
        {
          appointmentId:
            appointment.id,

          message:
            emailProfilesError.message,

          code:
            emailProfilesError.code,

          details:
            emailProfilesError.details,

          hint:
            emailProfilesError.hint,
        }
      );
    } else {
      const patientEmailProfile =
        emailProfiles?.find(
          (profile) =>
            profile.id ===
            user.id
        );

      const professionalEmailProfile =
        emailProfiles?.find(
          (profile) =>
            profile.id ===
            values.professionalId
        );

      const patientName =
        [
          patientEmailProfile
            ?.first_name,
          patientEmailProfile
            ?.last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        "Un paziente";

      const professionalName =
        [
          professionalEmailProfile
            ?.first_name,
          professionalEmailProfile
            ?.last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        "Professionista";

      const professionalEmail =
        professionalEmailProfile
          ?.email
          ?.trim();

      if (
        !professionalEmail
      ) {
        console.error(
          "Appuntamento creato ma email professionista mancante:",
          {
            appointmentId:
              appointment.id,

            professionalId:
              values.professionalId,
          }
        );
      } else {
        const siteUrl =
          process.env
            .NEXT_PUBLIC_SITE_URL
            ?.trim()
            .replace(
              /\/+$/,
              ""
            );

        if (
          !siteUrl
        ) {
          console.error(
            "Appuntamento creato ma NEXT_PUBLIC_SITE_URL non configurata per email:",
            {
              appointmentId:
                appointment.id,
            }
          );
        } else {
          const dashboardUrl =
            `${siteUrl}/dashboard/professional/appointments`;

          const emailTemplate =
            appointmentRequestedTemplate({
              professionalName,

              patientName,

              serviceLabel,

              appointmentDate:
                formattedAppointmentDate,

              appointmentTime:
                values.appointmentTime,

              durationMinutes:
                values.durationMinutes,

              dashboardUrl,
            });

          const emailResult =
            await sendTransactionalEmail({
              to: [
                {
                  email:
                    professionalEmail,

                  name:
                    professionalName,
                },
              ],

              subject:
                emailTemplate.subject,

              htmlContent:
                emailTemplate.htmlContent,

              textContent:
                emailTemplate.textContent,

              eventName:
                "APPOINTMENT_REQUESTED",

              referenceId:
                appointment.id,
            });

          if (
            !emailResult.success
          ) {
            console.error(
              "Appuntamento creato ma email professionista non inviata:",
              {
                appointmentId:
                  appointment.id,

                professionalId:
                  values.professionalId,

                error:
                  emailResult.error,
              }
            );
          }
        }
      }
    }

    /*
     * =====================================================
     * RISPOSTA
     * =====================================================
     */

    return NextResponse.json(
      {
        success:
          true,

        appointment,

        message:
          "Richiesta inviata correttamente. Il professionista dovrà confermarla.",
      },
      {
        status: 201,
      }
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
      {
        status: 500,
      }
    );
  }
}