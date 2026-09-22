import {
  NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const reportSchema = z.object({
  reviewId: z
    .string()
    .uuid(
      "Recensione non valida."
    ),

  reason: z.enum([
    "INAPPROPRIATE",
    "FALSE_INFORMATION",
    "PERSONAL_DATA",
    "OFFENSIVE",
    "OTHER",
  ]),

  details: z
    .string()
    .trim()
    .max(
      1500,
      "La descrizione non può superare 1.500 caratteri."
    )
    .optional()
    .default(""),
});

type RequestBody = z.infer<
  typeof reportSchema
>;

function getReasonLabel(
  reason: RequestBody["reason"]
) {
  switch (reason) {
    case "FALSE_INFORMATION":
      return "informazioni false o fuorvianti";

    case "PERSONAL_DATA":
      return "presenza di dati personali o sanitari";

    case "OFFENSIVE":
      return "contenuto offensivo";

    case "OTHER":
      return "altro motivo";

    case "INAPPROPRIATE":
    default:
      return "contenuto non appropriato";
  }
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
      reportSchema.safeParse(
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
            "Segnalazione non valida.",
        },
        {
          status: 400,
        }
      );
    }

    const values: RequestBody =
      validation.data;

    /*
     * =====================================================
     * SUPABASE UTENTE
     * =====================================================
     *
     * Questo client mantiene la sessione
     * dell'utente autenticato.
     *
     * Lo utilizziamo per:
     *
     * - autenticazione;
     * - verifica ruolo;
     * - lettura recensione;
     * - controllo segnalazioni esistenti.
     *
     * NON viene utilizzato per creare
     * direttamente la segnalazione.
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
        "Errore autenticazione segnalazione recensione:",
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
     * PROFILO PROFESSIONISTA
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
        "Errore controllo ruolo segnalazione:",
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
            "Solo il professionista può segnalare una recensione ricevuta.",
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
          rating,
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
        "Errore lettura recensione da segnalare:",
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
     * CONTROLLO PROPRIETÀ RECENSIONE
     * =====================================================
     *
     * Il professionista può segnalare
     * esclusivamente recensioni ricevute
     * sul proprio profilo.
     * =====================================================
     */

    if (
      review.professional_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          message:
            "Non puoi segnalare questa recensione.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * CONTROLLO SEGNALAZIONE APERTA
     * =====================================================
     */

    const {
      data:
        existingReport,

      error:
        existingReportError,
    } = await supabase
      .from(
        "review_reports"
      )
      .select(
        `
          id,
          status
        `
      )
      .eq(
        "review_id",
        review.id
      )
      .eq(
        "reporter_id",
        user.id
      )
      .eq(
        "status",
        "OPEN"
      )
      .maybeSingle();

    if (
      existingReportError
    ) {
      console.error(
        "Errore controllo segnalazione esistente:",
        existingReportError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile controllare le segnalazioni esistenti.",
        },
        {
          status: 500,
        }
      );
    }

    if (existingReport) {
      return NextResponse.json(
        {
          message:
            "Hai già inviato una segnalazione per questa recensione.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =====================================================
     * CLIENT ADMIN
     * =====================================================
     *
     * Da questo punto iniziano le operazioni
     * privilegiate.
     *
     * La service role viene utilizzata per:
     *
     * - creare review_reports;
     * - recuperare gli Admin;
     * - creare le notifiche di sistema.
     *
     * Tutti i controlli di autorizzazione sono
     * già stati effettuati sopra utilizzando
     * la sessione reale dell'utente.
     * =====================================================
     */

    const supabaseAdmin =
      getSupabaseAdmin();

    /*
     * =====================================================
     * CREAZIONE SEGNALAZIONE SERVER-SIDE
     * =====================================================
     *
     * L'utente autenticato non deve avere
     * bisogno del privilegio INSERT diretto
     * sulla tabella review_reports.
     *
     * review_id e reporter_id vengono determinati
     * dal server dopo i controlli precedenti.
     * =====================================================
     */

    const {
      data: report,
      error:
        insertError,
    } = await supabaseAdmin
      .from(
        "review_reports"
      )
      .insert({
        review_id:
          review.id,

        reporter_id:
          user.id,

        reason:
          values.reason,

        details:
          values.details ||
          null,
      })
      .select(
        `
          id,
          review_id,
          reporter_id,
          reason,
          details,
          status,
          created_at
        `
      )
      .single();

    if (insertError) {
      console.error(
        "Errore inserimento segnalazione recensione:",
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
            "Impossibile inviare la segnalazione.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * RECUPERO ADMIN
     * =====================================================
     */

    const {
      data:
        adminsData,

      error:
        adminsError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        `
          id,
          first_name,
          last_name
        `
      )
      .eq(
        "role",
        "ADMIN"
      );

    if (adminsError) {
      console.error(
        "Segnalazione creata ma impossibile recuperare gli Admin:",
        adminsError
      );
    }

    const admins =
      adminsData ??
      [];

    /*
     * =====================================================
     * CONTENUTO NOTIFICA
     * =====================================================
     */

    const professionalName =
      [
        profile.first_name,
        profile.last_name,
      ]
        .filter(Boolean)
        .join(" ");

    const reasonLabel =
      getReasonLabel(
        values.reason
      );

    /*
     * =====================================================
     * LINK DIRETTO SEGNALAZIONE
     * =====================================================
     */

    const notificationLink =
      `/dashboard/admin/reviews?reportId=${encodeURIComponent(
        report.id
      )}`;

    /*
     * =====================================================
     * ANTI-DUPLICATO NOTIFICHE ADMIN
     * =====================================================
     *
     * Ogni Admin riceve una sola notifica
     * REVIEW_REPORT_OPENED relativa alla
     * specifica segnalazione.
     *
     * Utilizziamo il link come identificatore
     * della segnalazione, mantenendo il
     * comportamento attuale dell'applicazione.
     * =====================================================
     */

    let adminsNotified =
      0;

    let notificationsSkipped =
      0;

    let notificationsFailed =
      0;

    for (
      const admin of admins
    ) {
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
          "id"
        )
        .eq(
          "user_id",
          admin.id
        )
        .eq(
          "type",
          "REVIEW_REPORT_OPENED"
        )
        .eq(
          "link",
          notificationLink
        )
        .maybeSingle();

      if (
        existingNotificationError
      ) {
        console.error(
          "Errore controllo duplicato notifica Admin:",
          {
            adminId:
              admin.id,

            reportId:
              report.id,

            error:
              existingNotificationError,
          }
        );

        /*
         * Non creiamo una notifica alla cieca
         * se il controllo anti-duplicato fallisce.
         */

        notificationsFailed +=
          1;

        continue;
      }

      if (
        existingNotification
      ) {
        notificationsSkipped +=
          1;

        continue;
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
            admin.id,

          appointment_id:
            review.appointment_id ??
            null,

          type:
            "REVIEW_REPORT_OPENED",

          title:
            "Nuova segnalazione recensione",

          message:
            professionalName
              ? `${professionalName} ha segnalato una recensione per ${reasonLabel}.`
              : `Un professionista ha segnalato una recensione per ${reasonLabel}.`,

          link:
            notificationLink,

          read:
            false,
        });

      if (
        notificationError
      ) {
        notificationsFailed +=
          1;

        console.error(
          "Segnalazione creata ma notifica Admin non inserita:",
          {
            adminId:
              admin.id,

            reportId:
              report.id,

            error:
              notificationError,
          }
        );

        continue;
      }

      adminsNotified +=
        1;
    }

    if (
      admins.length ===
      0
    ) {
      console.warn(
        "Segnalazione creata ma non esistono account ADMIN da notificare."
      );
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

        report,

        adminsFound:
          admins.length,

        adminsNotified,

        notificationsSkipped,

        notificationsFailed,

        notificationLink,

        message:
          "Segnalazione inviata all'amministratore.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Errore API segnalazione recensione:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Non è stato possibile inviare la segnalazione.",
      },
      {
        status: 500,
      }
    );
  }
}