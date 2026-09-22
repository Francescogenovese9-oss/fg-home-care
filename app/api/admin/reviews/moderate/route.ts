import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { z } from "zod";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  import {
    getSupabaseAdmin,
  } from "@/lib/supabase/admin";
  
  const moderationSchema =
    z.object({
      reportId: z
        .string()
        .uuid(
          "Segnalazione non valida."
        ),
  
      action: z.enum([
        "HIDE",
        "RESTORE",
        "DISMISS",
      ]),
  
      adminNotes: z
        .string()
        .trim()
        .max(
          1500,
          "La nota amministrativa non può superare 1.500 caratteri."
        )
        .optional()
        .default(""),
    });
  
  type ModerationAction =
    | "HIDE"
    | "RESTORE"
    | "DISMISS";
  
  type NotificationContent = {
    type: string;
    title: string;
    message: string;
  };
  
  type NotificationResult = {
    created: boolean;
    skipped: boolean;
    notificationId:
      | string
      | null;
  };
  
  function getNotificationContent(
    action: ModerationAction
  ): NotificationContent {
    switch (action) {
      case "HIDE":
        return {
          type:
            "REVIEW_REPORT_RESOLVED_HIDDEN",
  
          title:
            "Recensione nascosta",
  
          message:
            "La recensione che hai segnalato è stata verificata e nascosta dall'amministratore.",
        };
  
      case "RESTORE":
        return {
          type:
            "REVIEW_REPORT_RESTORED",
  
          title:
            "Recensione ripristinata",
  
          message:
            "La recensione precedentemente moderata è stata ripristinata dall'amministratore.",
        };
  
      case "DISMISS":
      default:
        return {
          type:
            "REVIEW_REPORT_DISMISSED",
  
          title:
            "Segnalazione archiviata",
  
          message:
            "La tua segnalazione è stata valutata. La recensione resterà pubblicata.",
        };
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
  
      const validation =
        moderationSchema.safeParse(
          body
        );
  
      if (!validation.success) {
        return NextResponse.json(
          {
            message:
              validation.error
                .issues[0]
                ?.message ??
              "Dati di moderazione non validi.",
          },
          {
            status: 400,
          }
        );
      }
  
      const {
        reportId,
        action,
        adminNotes,
      } =
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
          "Errore autenticazione moderazione recensione:",
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
       * VERIFICA RUOLO ADMIN
       * =====================================================
       */
  
      const {
        data: profile,
        error:
          profileError,
      } = await supabase
        .from("profiles")
        .select(
          "role"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();
  
      if (profileError) {
        console.error(
          "Errore controllo ruolo Admin moderazione:",
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
        "ADMIN"
      ) {
        return NextResponse.json(
          {
            message:
              "Operazione riservata all'amministratore.",
          },
          {
            status: 403,
          }
        );
      }
  
      /*
       * =====================================================
       * CLIENT ADMIN
       * =====================================================
       */
  
      const supabaseAdmin =
        getSupabaseAdmin();
  
      /*
       * =====================================================
       * SEGNALAZIONE
       * =====================================================
       */
  
      const {
        data: report,
        error:
          reportError,
      } = await supabaseAdmin
        .from(
          "review_reports"
        )
        .select(
          `
            id,
            review_id,
            reporter_id,
            status,
            reason
          `
        )
        .eq(
          "id",
          reportId
        )
        .maybeSingle();
  
      if (reportError) {
        console.error(
          "Errore lettura segnalazione moderazione:",
          reportError
        );
  
        return NextResponse.json(
          {
            message:
              "Impossibile leggere la segnalazione.",
          },
          {
            status: 500,
          }
        );
      }
  
      if (!report) {
        return NextResponse.json(
          {
            message:
              "Segnalazione non trovata.",
          },
          {
            status: 404,
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
      } = await supabaseAdmin
        .from("reviews")
        .select(
          `
            id,
            appointment_id,
            professional_id,
            patient_id,
            moderation_status
          `
        )
        .eq(
          "id",
          report.review_id
        )
        .maybeSingle();
  
      if (reviewError) {
        console.error(
          "Errore lettura recensione moderazione:",
          reviewError
        );
  
        return NextResponse.json(
          {
            message:
              "Impossibile leggere la recensione.",
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
       * SNAPSHOT DATI
       * =====================================================
       */
  
      const reviewId =
        review.id;
  
      const professionalId =
        review.professional_id;
  
      const appointmentId =
        review.appointment_id;
  
      const reviewReportId =
        report.id;
  
      /*
       * =====================================================
       * COERENZA SEGNALAZIONE
       * =====================================================
       */
  
      if (
        report.reporter_id !==
        professionalId
      ) {
        console.error(
          "Segnalazione incoerente:",
          {
            reportId:
              report.id,
  
            reporterId:
              report.reporter_id,
  
            professionalId,
          }
        );
  
        return NextResponse.json(
          {
            message:
              "La segnalazione non è coerente con la recensione.",
          },
          {
            status: 409,
          }
        );
      }
  
      /*
       * =====================================================
       * LINK DIRETTO
       * =====================================================
       */
  
      const notificationLink =
        `/dashboard/professional/reviews?reviewId=${encodeURIComponent(
          reviewId
        )}`;
  
      /*
       * =====================================================
       * NOTIFICA PROFESSIONISTA
       * =====================================================
       */
  
      async function notifyProfessional(
        notificationAction:
          ModerationAction
      ): Promise<NotificationResult> {
        const content =
          getNotificationContent(
            notificationAction
          );
  
        /*
         * =================================================
         * CONTROLLO ANTI-DUPLICATO
         * =================================================
         *
         * La chiave logica è:
         *
         * user_id
         * + review_report_id
         * + type
         *
         * In questo modo due report diversi
         * sulla stessa recensione restano
         * eventi distinti.
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
            "id"
          )
          .eq(
            "user_id",
            professionalId
          )
          .eq(
            "review_report_id",
            reviewReportId
          )
          .eq(
            "type",
            content.type
          )
          .maybeSingle();
  
        if (
          existingNotificationError
        ) {
          console.error(
            "Errore controllo duplicato notifica moderazione:",
            {
              action:
                notificationAction,
  
              reviewId,
  
              reviewReportId,
  
              professionalId,
  
              error:
                existingNotificationError,
            }
          );
  
          return {
            created: false,
            skipped: false,
            notificationId:
              null,
          };
        }
  
        if (
          existingNotification
        ) {
          console.log(
            "Notifica moderazione già esistente, creazione saltata:",
            {
              notificationId:
                existingNotification.id,
  
              action:
                notificationAction,
  
              reviewId,
  
              reviewReportId,
            }
          );
  
          return {
            created: false,
            skipped: true,
            notificationId:
              existingNotification.id,
          };
        }
  
        /*
         * =================================================
         * MESSAGGIO
         * =================================================
         */
  
        const finalMessage =
          adminNotes
            ? `${content.message} Nota Admin: ${adminNotes}`
            : content.message;
  
        /*
         * =================================================
         * INSERT NOTIFICA
         * =================================================
         */
  
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
              professionalId,
  
            appointment_id:
              appointmentId ??
              null,
  
            review_report_id:
              reviewReportId,
  
            type:
              content.type,
  
            title:
              content.title,
  
            message:
              finalMessage,
  
            link:
              notificationLink,
  
            read:
              false,
          })
          .select(
            "id"
          )
          .single();
  
        if (
          notificationError
        ) {
          console.error(
            "Moderazione completata ma notifica professionista non creata:",
            {
              action:
                notificationAction,
  
              reviewId,
  
              reviewReportId,
  
              professionalId,
  
              error:
                notificationError,
            }
          );
  
          return {
            created: false,
            skipped: false,
            notificationId:
              null,
          };
        }
  
        return {
          created: true,
          skipped: false,
          notificationId:
            createdNotification.id,
        };
      }
  
      const now =
        new Date().toISOString();
  
      /*
       * =====================================================
       * HIDE
       * =====================================================
       */
  
      if (
        action ===
        "HIDE"
      ) {
        const {
          error:
            reviewUpdateError,
        } = await supabaseAdmin
          .from("reviews")
          .update({
            moderation_status:
              "HIDDEN",
  
            moderation_reason:
              adminNotes ||
              "Recensione nascosta dopo verifica amministrativa.",
  
            moderated_at:
              now,
  
            moderated_by:
              user.id,
          })
          .eq(
            "id",
            reviewId
          );
  
        if (
          reviewUpdateError
        ) {
          console.error(
            "Errore nascondimento recensione:",
            reviewUpdateError
          );
  
          return NextResponse.json(
            {
              message:
                "Impossibile nascondere la recensione.",
            },
            {
              status: 500,
            }
          );
        }
  
        const {
          error:
            reportUpdateError,
        } = await supabaseAdmin
          .from(
            "review_reports"
          )
          .update({
            status:
              "RESOLVED",
  
            resolved_at:
              now,
  
            resolved_by:
              user.id,
  
            admin_notes:
              adminNotes ||
              null,
          })
          .eq(
            "id",
            report.id
          );
  
        if (
          reportUpdateError
        ) {
          console.error(
            "Errore chiusura segnalazione:",
            reportUpdateError
          );
  
          return NextResponse.json(
            {
              message:
                "Recensione nascosta, ma impossibile aggiornare correttamente la segnalazione.",
            },
            {
              status: 500,
            }
          );
        }
  
        const notificationResult =
          await notifyProfessional(
            "HIDE"
          );
  
        return NextResponse.json({
          success: true,
  
          notificationCreated:
            notificationResult.created,
  
          notificationSkipped:
            notificationResult.skipped,
  
          notificationId:
            notificationResult.notificationId,
  
          notificationLink,
  
          reviewReportId,
  
          message:
            "Recensione nascosta.",
        });
      }
  
      /*
       * =====================================================
       * RESTORE
       * =====================================================
       */
  
      if (
        action ===
        "RESTORE"
      ) {
        const {
          error:
            reviewUpdateError,
        } = await supabaseAdmin
          .from("reviews")
          .update({
            moderation_status:
              "PUBLISHED",
  
            moderation_reason:
              null,
  
            moderated_at:
              now,
  
            moderated_by:
              user.id,
          })
          .eq(
            "id",
            reviewId
          );
  
        if (
          reviewUpdateError
        ) {
          console.error(
            "Errore ripristino recensione:",
            reviewUpdateError
          );
  
          return NextResponse.json(
            {
              message:
                "Impossibile ripristinare la recensione.",
            },
            {
              status: 500,
            }
          );
        }
  
        const {
          error:
            reportUpdateError,
        } = await supabaseAdmin
          .from(
            "review_reports"
          )
          .update({
            status:
              "DISMISSED",
  
            resolved_at:
              now,
  
            resolved_by:
              user.id,
  
            admin_notes:
              adminNotes ||
              "Recensione ripristinata.",
          })
          .eq(
            "id",
            report.id
          );
  
        if (
          reportUpdateError
        ) {
          console.error(
            "Errore aggiornamento segnalazione dopo ripristino:",
            reportUpdateError
          );
  
          return NextResponse.json(
            {
              message:
                "Recensione ripristinata, ma impossibile aggiornare correttamente la segnalazione.",
            },
            {
              status: 500,
            }
          );
        }
  
        const notificationResult =
          await notifyProfessional(
            "RESTORE"
          );
  
        return NextResponse.json({
          success: true,
  
          notificationCreated:
            notificationResult.created,
  
          notificationSkipped:
            notificationResult.skipped,
  
          notificationId:
            notificationResult.notificationId,
  
          notificationLink,
  
          reviewReportId,
  
          message:
            "Recensione ripristinata.",
        });
      }
  
      /*
       * =====================================================
       * DISMISS
       * =====================================================
       */
  
      const {
        error:
          dismissError,
      } = await supabaseAdmin
        .from(
          "review_reports"
        )
        .update({
          status:
            "DISMISSED",
  
          resolved_at:
            now,
  
          resolved_by:
            user.id,
  
          admin_notes:
            adminNotes ||
            "Segnalazione respinta.",
        })
        .eq(
          "id",
          report.id
        );
  
      if (
        dismissError
      ) {
        console.error(
          "Errore archiviazione segnalazione:",
          dismissError
        );
  
        return NextResponse.json(
          {
            message:
              "Impossibile archiviare la segnalazione.",
          },
          {
            status: 500,
          }
        );
      }
  
      const notificationResult =
        await notifyProfessional(
          "DISMISS"
        );
  
      return NextResponse.json({
        success: true,
  
        notificationCreated:
          notificationResult.created,
  
        notificationSkipped:
          notificationResult.skipped,
  
        notificationId:
          notificationResult.notificationId,
  
        notificationLink,
  
        reviewReportId,
  
        message:
          "Segnalazione archiviata. La recensione resta pubblicata.",
      });
    } catch (error) {
      console.error(
        "Errore moderazione recensione:",
        error
      );
  
      return NextResponse.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "Impossibile completare la moderazione.",
        },
        {
          status: 500,
        }
      );
    }
  }