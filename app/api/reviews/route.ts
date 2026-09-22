import {
  NextRequest,
  NextResponse,
} from "next/server";

import { reviewSchema } from "@/lib/validations/review";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest
) {
  try {
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

    /*
     * =====================================================
     * VALIDAZIONE
     * =====================================================
     */

    const validation =
      reviewSchema.safeParse(
        body
      );

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error
              .issues[0]
              ?.message ??
            "Recensione non valida.",
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

    if (userError) {
      console.error(
        "Errore autenticazione recensione:",
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
     * PROFILO PAZIENTE
     * =====================================================
     */

    const {
      data: profile,
      error:
        profileError,
    } = await supabase
      .from("profiles")
      .select(
        `
          role,
          first_name,
          last_name
        `
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

    if (profileError) {
      console.error(
        "Errore lettura profilo paziente recensione:",
        {
          message:
            profileError.message,
          code:
            profileError.code,
          details:
            profileError.details,
          hint:
            profileError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare il tuo account.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      profile?.role !==
      "PATIENT"
    ) {
      return NextResponse.json(
        {
          message:
            "Solo i pazienti possono lasciare recensioni.",
        },
        {
          status: 403,
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
      .from("appointments")
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
        values.appointmentId
      )
      .maybeSingle();

    if (
      appointmentError
    ) {
      console.error(
        "Errore lettura appuntamento recensione:",
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
            "Impossibile verificare la prestazione.",
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
            "Prestazione non trovata.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * CONTROLLO PROPRIETÀ
     * =====================================================
     */

    if (
      appointment.patient_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          message:
            "Non puoi recensire questa prestazione.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * PRESTAZIONE COMPLETATA
     * =====================================================
     */

    if (
      appointment.status !==
      "COMPLETED"
    ) {
      return NextResponse.json(
        {
          message:
            "Puoi recensire soltanto una prestazione completata.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =====================================================
     * PAGAMENTO COMPLETATO
     * =====================================================
     */

    if (
      appointment.payment_status !==
      "PAID"
    ) {
      return NextResponse.json(
        {
          message:
            "La recensione è disponibile solo per prestazioni regolarmente pagate.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =====================================================
     * UNA RECENSIONE PER APPUNTAMENTO
     * =====================================================
     */

    const {
      data:
        existingReview,

      error:
        existingReviewError,
    } = await supabase
      .from("reviews")
      .select(
        "id"
      )
      .eq(
        "appointment_id",
        appointment.id
      )
      .maybeSingle();

    if (
      existingReviewError
    ) {
      console.error(
        "Errore controllo recensione esistente:",
        {
          message:
            existingReviewError.message,
          code:
            existingReviewError.code,
          details:
            existingReviewError.details,
          hint:
            existingReviewError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare se la prestazione è già stata recensita.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      existingReview
    ) {
      return NextResponse.json(
        {
          message:
            "Hai già recensito questa prestazione.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =====================================================
     * CREAZIONE RECENSIONE
     * =====================================================
     */

    const {
      data: review,
      error:
        insertError,
    } = await supabase
      .from("reviews")
      .insert({
        appointment_id:
          appointment.id,

        patient_id:
          user.id,

        professional_id:
          appointment.professional_id,

        rating:
          values.rating,

        comment:
          values.comment ||
          null,
      })
      .select(
        `
          id,
          appointment_id,
          patient_id,
          professional_id,
          rating,
          comment,
          moderation_status,
          created_at
        `
      )
      .single();

    if (insertError) {
      console.error(
        "Errore inserimento recensione:",
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
            "Impossibile salvare la recensione.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * CLIENT ADMIN
     * =====================================================
     *
     * Le notifiche sono eventi di sistema.
     * Non vengono create con la sessione del paziente.
     */

    const supabaseAdmin =
      getSupabaseAdmin();

    /*
     * =====================================================
     * ANTI-DUPLICATO NOTIFICA - SPRINT 5.3E
     * =====================================================
     *
     * Per REVIEW_RECEIVED una prestazione può generare
     * una sola notifica verso il professionista.
     */

    const {
      data:
        existingNotification,

      error:
        existingNotificationError,
    } = await supabaseAdmin
      .from(
        "notifications"
      )
      .select(
        `
          id,
          user_id,
          appointment_id,
          type
        `
      )
      .eq(
        "user_id",
        appointment.professional_id
      )
      .eq(
        "appointment_id",
        appointment.id
      )
      .eq(
        "type",
        "REVIEW_RECEIVED"
      )
      .maybeSingle();

    if (
      existingNotificationError
    ) {
      console.error(
        "Errore controllo duplicato notifica recensione:",
        {
          message:
            existingNotificationError.message,

          code:
            existingNotificationError.code,

          details:
            existingNotificationError.details,

          hint:
            existingNotificationError.hint,

          appointmentId:
            appointment.id,

          professionalId:
            appointment.professional_id,
        }
      );
    }

    /*
     * =====================================================
     * PREPARAZIONE NOTIFICA
     * =====================================================
     */

    const patientName =
      [
        profile.first_name,
        profile.last_name,
      ]
        .filter(Boolean)
        .join(" ");

    const notificationMessage =
      patientName
        ? `${patientName} ha pubblicato una recensione da ${values.rating} stelle.`
        : `Hai ricevuto una nuova recensione da ${values.rating} stelle.`;

    /*
     * Link diretto alla recensione.
     */
    const notificationLink =
      `/dashboard/professional/reviews?reviewId=${encodeURIComponent(
        review.id
      )}`;

    let notificationCreated =
      false;

    let notificationSkipped =
      false;

    let notificationId:
      string | null =
      null;

    /*
     * =====================================================
     * CREAZIONE NOTIFICA
     * =====================================================
     */

    if (
      existingNotification
    ) {
      notificationSkipped =
        true;

      notificationId =
        existingNotification.id;

      console.log(
        "Notifica REVIEW_RECEIVED già esistente, creazione saltata:",
        {
          notificationId:
            existingNotification.id,

          appointmentId:
            appointment.id,

          professionalId:
            appointment.professional_id,
        }
      );
    } else {
      const {
        data:
          createdNotification,

        error:
          notificationError,
      } = await supabaseAdmin
        .from(
          "notifications"
        )
        .insert({
          user_id:
            appointment.professional_id,

          appointment_id:
            appointment.id,

          type:
            "REVIEW_RECEIVED",

          title:
            "Nuova recensione",

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
            title,
            message,
            link,
            read,
            created_at
          `
        )
        .single();

      if (
        notificationError
      ) {
        console.error(
          "Recensione pubblicata ma notifica professionista non creata:",
          {
            message:
              notificationError.message,

            code:
              notificationError.code,

            details:
              notificationError.details,

            hint:
              notificationError.hint,

            professionalId:
              appointment.professional_id,

            appointmentId:
              appointment.id,

            reviewId:
              review.id,
          }
        );
      } else {
        notificationCreated =
          true;

        notificationId =
          createdNotification.id;

        console.log(
          "Notifica REVIEW_RECEIVED creata:",
          {
            notificationId:
              createdNotification.id,

            professionalId:
              createdNotification.user_id,

            reviewId:
              review.id,

            link:
              createdNotification.link,
          }
        );
      }
    }

    /*
     * =====================================================
     * RISPOSTA
     * =====================================================
     */

    return NextResponse.json(
      {
        success: true,

        review,

        notificationCreated,

        notificationSkipped,

        notificationId,

        message:
          "Recensione pubblicata.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Errore API recensione:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Il server non è riuscito a salvare la recensione.",
      },
      {
        status: 500,
      }
    );
  }
}