import {
  NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const reviewReplySchema = z.object({
  reviewId: z
    .string()
    .uuid(
      "Recensione non valida."
    ),

  reply: z
    .string()
    .trim()
    .min(
      1,
      "Inserisci una risposta."
    )
    .max(
      1500,
      "La risposta non può superare 1.500 caratteri."
    ),
});

type RequestBody = z.infer<
  typeof reviewReplySchema
>;

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

    const validation =
      reviewReplySchema.safeParse(
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
            "Risposta non valida.",
        },
        {
          status: 400,
        }
      );
    }

    const values: RequestBody =
      validation.data;

    const supabase =
      await createClient();

    /*
     * =====================================================
     * UTENTE
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
        "Errore autenticazione risposta recensione:",
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
     * RUOLO
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
        "Errore verifica ruolo risposta recensione:",
        profileError
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
      "PROFESSIONAL"
    ) {
      return NextResponse.json(
        {
          message:
            "Solo il professionista può rispondere alle recensioni.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * RECENSIONE
     * =====================================================
     */

    const {
      data: review,
      error:
        reviewError,
    } = await supabase
      .from("reviews")
      .select(
        `
          id,
          appointment_id,
          patient_id,
          professional_id,
          moderation_status
        `
      )
      .eq(
        "id",
        values.reviewId
      )
      .maybeSingle();

    if (reviewError) {
      console.error(
        "Errore lettura recensione:",
        reviewError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare la recensione.",
        },
        {
          status: 500,
        }
      );
    }

    if (!review) {
      return NextResponse.json(
        {
          message:
            "Recensione non trovata.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * PROPRIETÀ RECENSIONE
     * =====================================================
     */

    if (
      review.professional_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          message:
            "Non puoi rispondere a questa recensione.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Non permettiamo risposte nuove
     * su recensioni nascoste.
     */
    if (
      review.moderation_status ===
      "HIDDEN"
    ) {
      return NextResponse.json(
        {
          message:
            "Non puoi rispondere a una recensione nascosta.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =====================================================
     * CONTROLLO RISPOSTA ESISTENTE
     * =====================================================
     */

    const {
      data:
        existingReply,

      error:
        existingReplyError,
    } = await supabase
      .from(
        "review_replies"
      )
      .select(
        `
          id,
          review_id,
          reply
        `
      )
      .eq(
        "review_id",
        review.id
      )
      .maybeSingle();

    if (
      existingReplyError
    ) {
      console.error(
        "Errore controllo risposta esistente:",
        existingReplyError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile controllare la risposta esistente.",
        },
        {
          status: 500,
        }
      );
    }

    const now =
      new Date().toISOString();

    const professionalName =
      [
        profile.first_name,
        profile.last_name,
      ]
        .filter(Boolean)
        .join(" ");

    /*
     * =====================================================
     * MODIFICA RISPOSTA
     * =====================================================
     */

    if (existingReply) {
      const {
        data:
          updatedReply,

        error:
          updateError,
      } = await supabase
        .from(
          "review_replies"
        )
        .update({
          reply:
            values.reply,

          updated_at:
            now,
        })
        .eq(
          "id",
          existingReply.id
        )
        .eq(
          "professional_id",
          user.id
        )
        .select(
          `
            id,
            review_id,
            professional_id,
            reply,
            created_at,
            updated_at
          `
        )
        .single();

      if (updateError) {
        console.error(
          "Errore aggiornamento risposta:",
          updateError
        );

        return NextResponse.json(
          {
            message:
              updateError.message ||
              "Impossibile aggiornare la risposta.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * =================================================
       * NOTIFICA PAZIENTE
       * risposta aggiornata
       * =================================================
       */

      const {
        error:
          notificationError,
      } = await supabase
        .from(
          "notifications"
        )
        .insert({
          user_id:
            review.patient_id,

          appointment_id:
            review.appointment_id,

          type:
            "REVIEW_REPLY_UPDATED",

          title:
            "Risposta aggiornata alla tua recensione",

          message:
            professionalName
              ? `${professionalName} ha aggiornato la risposta alla tua recensione.`
              : "Il professionista ha aggiornato la risposta alla tua recensione.",

          link:
            "/dashboard/patient/appointments",

          read:
            false,
        });

      if (
        notificationError
      ) {
        console.error(
          "Risposta aggiornata ma notifica paziente non creata:",
          notificationError
        );
      }

      return NextResponse.json({
        success: true,

        reply:
          updatedReply,

        notificationCreated:
          !notificationError,

        message:
          "Risposta aggiornata.",
      });
    }

    /*
     * =====================================================
     * NUOVA RISPOSTA
     * =====================================================
     */

    const {
      data:
        createdReply,

      error:
        insertError,
    } = await supabase
      .from(
        "review_replies"
      )
      .insert({
        review_id:
          review.id,

        professional_id:
          user.id,

        reply:
          values.reply,
      })
      .select(
        `
          id,
          review_id,
          professional_id,
          reply,
          created_at,
          updated_at
        `
      )
      .single();

    if (insertError) {
      console.error(
        "Errore pubblicazione risposta recensione:",
        insertError
      );

      return NextResponse.json(
        {
          message:
            insertError.message ||
            "Impossibile pubblicare la risposta.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * NOTIFICA PAZIENTE - SPRINT 5.3B
     * =====================================================
     */

    const {
      error:
        notificationError,
    } = await supabase
      .from(
        "notifications"
      )
      .insert({
        user_id:
          review.patient_id,

        appointment_id:
          review.appointment_id,

        type:
          "REVIEW_REPLY_RECEIVED",

        title:
          "Risposta alla tua recensione",

        message:
          professionalName
            ? `${professionalName} ha risposto alla tua recensione.`
            : "Il professionista ha risposto alla tua recensione.",

        link:
          "/dashboard/patient/appointments",

        read:
          false,
      });

    /*
     * La risposta resta valida anche
     * se la notifica non viene creata.
     */
    if (
      notificationError
    ) {
      console.error(
        "Risposta pubblicata ma notifica paziente non creata:",
        notificationError
      );
    }

    /*
     * =====================================================
     * RISPOSTA API
     * =====================================================
     */

    return NextResponse.json(
      {
        success: true,

        reply:
          createdReply,

        notificationCreated:
          !notificationError,

        message:
          "Risposta pubblicata.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Errore API risposta recensione:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Il server non è riuscito a salvare la risposta.",
      },
      {
        status: 500,
      }
    );
  }
}