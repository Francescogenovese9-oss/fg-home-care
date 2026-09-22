import {
  parseRomeDateTime,
} from "@/lib/payments/cancellation-policy";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  appointmentAcceptedTemplate,
} from "@/lib/email/templates/appointment-accepted";

import {
  appointmentRejectedTemplate,
} from "@/lib/email/templates/appointment-rejected";

import {
  appointmentCompletedTemplate,
} from "@/lib/email/templates/appointment-completed";

import {
  sendIdempotentTransactionalEmail,
} from "@/lib/email/send-idempotent-transactional-email";

import {
  sendTransactionalEmail,
} from "@/lib/email/send-transactional-email";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

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

type AppointmentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

type PaymentStatus =
  | "NOT_REQUIRED"
  | "REQUIRES_PAYMENT"
  | "PROCESSING"
  | "PAID"
  | "PAYMENT_FAILED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

type AppointmentUpdatePayload = {
  status: AppointmentStatus;
  professional_notes: string | null;
  updated_at: string;
  payment_status?: PaymentStatus;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    /*
     * =====================================================
     * PARAMETRI ROUTE
     * =====================================================
     */

    const {
      appointmentId,
    } =
      await context.params;

    if (!appointmentId) {
      return NextResponse.json(
        {
          message:
            "Identificativo richiesta mancante.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    let body:
      RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        {
          message:
            "Il contenuto della richiesta non è valido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * VALIDAZIONE AZIONE
     * =====================================================
     */

    if (
      body.action !==
        "ACCEPT" &&
      body.action !==
        "REJECT" &&
      body.action !==
        "COMPLETE"
    ) {
      return NextResponse.json(
        {
          message:
            "Azione richiesta non valida.",
        },
        {
          status: 400,
        }
      );
    }

    const action =
      body.action;

    const professionalNotes =
      body.professionalNotes
        ?.trim() ||
      null;

    /*
     * Per il rifiuto richiediamo
     * sempre una motivazione.
     */

    if (
      action ===
        "REJECT" &&
      !professionalNotes
    ) {
      return NextResponse.json(
        {
          message:
            "Inserisci una motivazione prima di rifiutare la richiesta.",
        },
        {
          status: 400,
        }
      );
    }

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

    if (userError) {
      console.error(
        "Errore autenticazione professionista:",
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
     * VERIFICA RUOLO PROFESSIONISTA
     * =====================================================
     */

    const {
      data:
        accountProfile,

      error:
        profileError,
    } = await supabase
      .from(
        "profiles"
      )
      .select(
        `
          id,
          role
        `
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

    if (
      profileError
    ) {
      console.error(
        "Errore lettura ruolo professionista:",
        profileError
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile verificare il tuo account.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !accountProfile
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
      accountProfile.role !==
      "PROFESSIONAL"
    ) {
      return NextResponse.json(
        {
          message:
            "Questa operazione è riservata ai professionisti.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * LETTURA APPUNTAMENTO
     * =====================================================
     *
     * La lettura avviene con il client autenticato.
     * La RLS deve consentire al professionista
     * di leggere solamente le proprie richieste.
     * =====================================================
     */

    const {
      data:
        appointment,

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
          payment_status,
          appointment_date,
          appointment_time,
          duration_minutes,
          professional_notes
        `
      )
      .eq(
        "id",
        appointmentId
      )
      .eq(
        "professional_id",
        user.id
      )
      .maybeSingle();

    if (
      appointmentError
    ) {
      console.error(
        "Errore lettura richiesta:",
        {
          message:
            appointmentError.message,

          code:
            appointmentError.code,

          details:
            appointmentError.details,

          hint:
            appointmentError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            "Non è stato possibile controllare la richiesta.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !appointment
    ) {
      return NextResponse.json(
        {
          message:
            "Richiesta non trovata oppure non appartenente a questo professionista.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * ACCEPT
     * =====================================================
     */

    if (
      action ===
        "ACCEPT" &&
      appointment.status !==
        "PENDING"
    ) {
      return NextResponse.json(
        {
          message:
            "Puoi accettare soltanto una richiesta ancora in attesa.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * REJECT
     * =====================================================
     */

    if (
      action ===
        "REJECT" &&
      appointment.status !==
        "PENDING"
    ) {
      return NextResponse.json(
        {
          message:
            "Puoi rifiutare soltanto una richiesta ancora in attesa.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * COMPLETE
     * =====================================================
     */

    if (
      action ===
        "COMPLETE" &&
      appointment.status !==
        "ACCEPTED"
    ) {
      return NextResponse.json(
        {
          message:
            "Puoi completare soltanto una prenotazione accettata.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Una prestazione non può essere completata
     * se il pagamento non è stato effettuato.
     *
     * NOT_REQUIRED resta ammesso per compatibilità
     * con eventuali prenotazioni precedenti
     * all'integrazione Stripe.
     */

    if (
      action ===
        "COMPLETE" &&
      appointment
        .payment_status !==
        "PAID" &&
      appointment
        .payment_status !==
        "NOT_REQUIRED"
    ) {
      return NextResponse.json(
        {
          message:
            "La prestazione non può essere completata finché il pagamento non risulta effettuato.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =====================================================
     * COMPLETE - CONTROLLO FINE PRESTAZIONE
     * =====================================================
     */

    if (action === "COMPLETE") {
      if (
        !Number.isInteger(appointment.duration_minutes) ||
        appointment.duration_minutes <= 0
      ) {
        console.error(
          "Durata appuntamento non valida durante COMPLETE:",
          {
            appointmentId: appointment.id,
            durationMinutes: appointment.duration_minutes,
          }
        );

        return NextResponse.json(
          {
            message:
              "La durata della prestazione non è valida.",
          },
          {
            status: 500,
          }
        );
     }

      let appointmentStart: Date;

      try {
        appointmentStart = parseRomeDateTime(
          appointment.appointment_date,
          appointment.appointment_time
        );
      } catch (error) {
        console.error(
          "Data/orario appuntamento non validi durante COMPLETE:",
          {
            appointmentId: appointment.id,
            error:
              error instanceof Error
                ? error.message
                : error,
          }
        );

        return NextResponse.json(
          {
            message:
              "Data o orario della prestazione non validi.",
          },
          {
            status: 500,
          }
        );
      }

      const appointmentEnd = new Date(
        appointmentStart.getTime() +
          appointment.duration_minutes * 60 * 1000
      );

      if (Date.now() < appointmentEnd.getTime()) {
        const formattedEnd = new Intl.DateTimeFormat(
          "it-IT",
          {
            timeZone: "Europe/Rome",
            dateStyle: "short",
            timeStyle: "short",
          }
        ).format(appointmentEnd);

        return NextResponse.json(
          {
            message:
              `La prestazione potrà essere completata soltanto dopo ${formattedEnd}.`,
          },
          {
            status:409,
          }
        );
      }
    }

    /*
     * =====================================================
     * NUOVO STATO APPUNTAMENTO
     * =====================================================
     */

    const nextStatus:
      AppointmentStatus =
      action ===
      "ACCEPT"
        ? "ACCEPTED"
        : action ===
            "REJECT"
          ? "REJECTED"
          : "COMPLETED";

    /*
     * =====================================================
     * NUOVO STATO PAGAMENTO
     * =====================================================
     *
     * ACCEPT
     * → il paziente deve procedere al pagamento.
     *
     * REJECT
     * → la richiesta viene chiusa prima del pagamento.
     *
     * COMPLETE
     * → non modifica payment_status.
     * =====================================================
     */

    const nextPaymentStatus:
      | PaymentStatus
      | undefined =
      action ===
      "ACCEPT"
        ? "REQUIRES_PAYMENT"
        : action ===
            "REJECT"
          ? "CANCELLED"
          : undefined;

    /*
     * =====================================================
     * PAYLOAD UPDATE
     * =====================================================
     */

    const updatePayload:
      AppointmentUpdatePayload =
      {
        status:
          nextStatus,

        professional_notes:
          professionalNotes,

        updated_at:
          new Date()
            .toISOString(),
      };

    if (
      nextPaymentStatus
    ) {
      updatePayload
        .payment_status =
        nextPaymentStatus;
    }

    /*
     * =====================================================
     * CLIENT ADMIN PRIVILEGIATO
     * =====================================================
     *
     * La decisione è stata completamente
     * validata utilizzando l'utente autenticato.
     *
     * L'UPDATE effettivo viene eseguito con
     * service role perché può includere
     * payment_status, che deve restare
     * protetto da scritture dirette client.
     * =====================================================
     */

    const supabaseAdmin =
      getSupabaseAdmin();

    /*
     * =====================================================
     * UPDATE APPUNTAMENTO
     * =====================================================
     *
     * Manteniamo sia professional_id sia lo
     * stato precedente nella WHERE.
     *
     * In questo modo:
     *
     * - non può essere modificato un appointment
     *   appartenente a un altro professionista;
     *
     * - proteggiamo da doppio click;
     *
     * - proteggiamo da richieste concorrenti.
     * =====================================================
     */

    const expectedPreviousStatus:
      AppointmentStatus =
      action === "COMPLETE"
        ? "ACCEPTED"
        : "PENDING";

    const {
      data:
        updatedAppointment,

      error:
        updateError,
    } = await supabaseAdmin
      .from(
        "appointments"
      )
      .update(
        updatePayload
      )
      .eq(
        "id",
        appointmentId
      )
      .eq(
        "professional_id",
        user.id
      )
      .eq(
        "status",
        expectedPreviousStatus
      )
      .select(
        `
          id,
          patient_id,
          professional_id,
          status,
          payment_status,
          professional_notes,
          appointment_date,
          appointment_time,
          updated_at
        `
      )
      .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "Errore aggiornamento richiesta:",
        {
          message:
            updateError.message,

          code:
            updateError.code,

          details:
            updateError.details,

          hint:
            updateError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            updateError.message ||
            "Non è stato possibile aggiornare la richiesta.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Se non riceviamo la riga significa che
     * probabilmente lo stato è cambiato tra
     * lettura e aggiornamento.
     */

    if (
      !updatedAppointment
    ) {
      return NextResponse.json(
        {
          message:
            "La richiesta è già stata modificata. Aggiorna la pagina e riprova.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =====================================================
     * NOTIFICA AL PAZIENTE
     * =====================================================
     *
     * L'aggiornamento dell'appuntamento è già stato
     * completato correttamente.
     *
     * La notifica è un'operazione secondaria:
     * se dovesse fallire, non annulliamo il cambio
     * di stato della prenotazione.
     * =====================================================
     */

    let notificationType:
      string;

    let notificationTitle:
      string;

    let notificationMessage:
      string;

    let notificationLink:
      string;

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
          `${updatedAppointment.appointment_date}T12:00:00`
        )
      );

    const formattedAppointmentTime =
      updatedAppointment.appointment_time.slice(
        0,
        5
      );

    if (
      action ===
      "ACCEPT"
    ) {
      notificationType =
        "APPOINTMENT_ACCEPTED";

      notificationTitle =
        "Richiesta accettata";

      notificationMessage =
        `La tua richiesta per il ${formattedAppointmentDate} alle ${formattedAppointmentTime} ` +
        "è stata accettata. Puoi ora procedere al pagamento.";

      notificationLink =
        `/dashboard/patient/appointments/${appointmentId}/payment`;
    } else if (
      action ===
      "REJECT"
    ) {
      notificationType =
        "APPOINTMENT_REJECTED";

      notificationTitle =
        "Richiesta rifiutata";

      notificationMessage =
        `La tua richiesta per il ${formattedAppointmentDate} alle ${formattedAppointmentTime} ` +
        `è stata rifiutata.${professionalNotes ? ` Motivo: ${professionalNotes}` : ""}`;

      notificationLink =
        "/dashboard/patient/appointments";
    } else {
      notificationType =
        "APPOINTMENT_COMPLETED";

      notificationTitle =
        "Prestazione completata";

      notificationMessage =
        `La prestazione del ${formattedAppointmentDate} alle ${formattedAppointmentTime} ` +
        "è stata contrassegnata come completata.";

      notificationLink =
        "/dashboard/patient/appointments";
    }

    const {
      error:
        notificationError,
    } = await supabaseAdmin
      .from(
        "notifications"
      )
      .insert({
        user_id:
          updatedAppointment.patient_id,

        appointment_id:
          updatedAppointment.id,

        review_report_id:
          null,

        type:
          notificationType,

        title:
          notificationTitle,

        message:
          notificationMessage,

        link:
          notificationLink,

        read:
          false,
      });

    if (
      notificationError
    ) {
      console.error(
        "Stato appuntamento aggiornato ma errore creazione notifica paziente:",
        {
          appointmentId:
            updatedAppointment.id,

          patientId:
            updatedAppointment.patient_id,

          action,

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
     * EMAIL AL PAZIENTE
     * =====================================================
     *
     * L'appuntamento è già stato aggiornato.
     *
     * L'email è quindi un effetto secondario:
     * se Brevo non fosse disponibile, NON annulliamo
     * ACCEPT o REJECT già completati.
     *
     * Per ora inviamo email transazionali soltanto per:
     *
     * - ACCEPT
     * - REJECT
     *
     * COMPLETE verrà collegato in un blocco successivo.
     * =====================================================
     */

    if (
      action ===
        "ACCEPT" ||
      action ===
        "REJECT" ||
      action ===
        "COMPLETE"
    ) {
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
            updatedAppointment.patient_id,
            updatedAppointment.professional_id,
          ]
        );

      if (
        emailProfilesError
      ) {
        console.error(
          "Stato appuntamento aggiornato ma errore lettura profili per email:",
          {
            appointmentId:
              updatedAppointment.id,

            patientId:
              updatedAppointment.patient_id,

            professionalId:
              updatedAppointment.professional_id,

            action,

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
              updatedAppointment.patient_id
          );

        const professionalEmailProfile =
          emailProfiles?.find(
            (profile) =>
              profile.id ===
              updatedAppointment.professional_id
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
          "Paziente";

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

        const patientEmail =
          patientEmailProfile
            ?.email
            ?.trim();

        if (
          !patientEmail
        ) {
          console.error(
            "Stato appuntamento aggiornato ma email paziente mancante:",
            {
              appointmentId:
                updatedAppointment.id,

              patientId:
                updatedAppointment.patient_id,

              action,
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
              "Stato appuntamento aggiornato ma NEXT_PUBLIC_SITE_URL non configurata per email:",
              {
                appointmentId:
                  updatedAppointment.id,

                action,
              }
            );
          } else {
            if (
              action ===
              "ACCEPT"
            ) {
              const paymentUrl =
                `${siteUrl}/dashboard/patient/appointments/${appointmentId}/payment`;

              const emailTemplate =
                appointmentAcceptedTemplate({
                  patientName,

                  professionalName,

                  appointmentDate:
                    formattedAppointmentDate,

                  appointmentTime:
                    formattedAppointmentTime,

                  paymentUrl,
                });

              const emailResult =
                await sendTransactionalEmail({
                  to: [
                    {
                      email:
                        patientEmail,

                      name:
                        patientName,
                    },
                  ],

                  subject:
                    emailTemplate.subject,

                  htmlContent:
                    emailTemplate.htmlContent,

                  textContent:
                    emailTemplate.textContent,

                  eventName:
                    "APPOINTMENT_ACCEPTED",

                  referenceId:
                    updatedAppointment.id,
                });

              if (
                !emailResult.success
              ) {
                console.error(
                  "Richiesta accettata ma email paziente non inviata:",
                  {
                    appointmentId:
                      updatedAppointment.id,

                    patientId:
                      updatedAppointment.patient_id,

                    error:
                      emailResult.error,
                  }
                );
              }
            }

            if (
              action ===
              "REJECT"
            ) {
              const appointmentsUrl =
                `${siteUrl}/dashboard/patient/appointments`;

              const emailTemplate =
                appointmentRejectedTemplate({
                  patientName,

                  professionalName,

                  appointmentDate:
                    formattedAppointmentDate,

                  appointmentTime:
                    formattedAppointmentTime,

                  professionalNotes,

                  appointmentsUrl,
                });

              const emailResult =
                await sendTransactionalEmail({
                  to: [
                    {
                      email:
                        patientEmail,

                      name:
                        patientName,
                    },
                  ],

                  subject:
                    emailTemplate.subject,

                  htmlContent:
                    emailTemplate.htmlContent,

                  textContent:
                    emailTemplate.textContent,

                  eventName:
                    "APPOINTMENT_REJECTED",

                  referenceId:
                    updatedAppointment.id,
                });

              if (
                !emailResult.success
              ) {
                console.error(
                  "Richiesta rifiutata ma email paziente non inviata:",
                  {
                    appointmentId:
                      updatedAppointment.id,

                    patientId:
                      updatedAppointment.patient_id,

                    error:
                      emailResult.error,
                  }
                );
              }
            }

            if (
              action ===
              "COMPLETE"
            ) {
              const appointmentsUrl =
                `${siteUrl}/dashboard/patient/appointments`;

              const emailTemplate =
                appointmentCompletedTemplate({
                  patientName,

                  professionalName,

                  appointmentDate:
                    formattedAppointmentDate,

                  appointmentTime:
                    formattedAppointmentTime,

                  appointmentsUrl,
                });

              const emailResult =
                await sendIdempotentTransactionalEmail({
                  eventKey:
                    `appointment:${updatedAppointment.id}:completed:patient`,

                  eventType:
                    "APPOINTMENT_COMPLETED",

                  to: [
                    {
                      email:
                        patientEmail,

                      name:
                        patientName,
                    },
                  ],

                  subject:
                    emailTemplate.subject,

                  htmlContent:
                    emailTemplate.htmlContent,

                  textContent:
                    emailTemplate.textContent,

                  recipientUserId:
                    updatedAppointment.patient_id,

                  appointmentId:
                    updatedAppointment.id,
                });

              if (
                !emailResult.success
              ) {
                console.error(
                  "Prestazione completata ma email paziente non inviata:",
                  {
                    appointmentId:
                      updatedAppointment.id,

                    patientId:
                      updatedAppointment.patient_id,

                    sent:
                      emailResult.sent,

                    skipped:
                      emailResult.skipped,

                    error:
                      emailResult.error,
                  }
                );
              }
            }
          }
        }
      }
    }

    /*
     * =====================================================
     * MESSAGGIO RISPOSTA
     * =====================================================
     */

    let responseMessage =
      "Richiesta aggiornata correttamente.";

    if (
      action ===
      "ACCEPT"
    ) {
      responseMessage =
        "Richiesta accettata. Il paziente può ora procedere al pagamento.";
    }

    if (
      action ===
      "REJECT"
    ) {
      responseMessage =
        "Richiesta rifiutata correttamente.";
    }

    if (
      action ===
      "COMPLETE"
    ) {
      responseMessage =
        "Prestazione contrassegnata come completata.";
    }

    /*
     * =====================================================
     * RISPOSTA
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      appointment:
        updatedAppointment,

      message:
        responseMessage,
    });
  } catch (error) {
    console.error(
      "Errore API stato appuntamento:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Il server non è riuscito ad aggiornare la richiesta.",
      },
      {
        status: 500,
      }
    );
  }
}