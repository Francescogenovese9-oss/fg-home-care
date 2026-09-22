import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";
import { getProfessionCategory, isProfession } from "@/lib/professions";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

type ReviewAction =
  | "APPROVE"
  | "REJECT";

type ReviewBody = {
  action?: ReviewAction;
  notes?: string;
};

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    /*
     * =====================================================
     * PARAMETRI
     * =====================================================
     */

    const {
      userId,
    } =
      await context.params;

    /*
     * =====================================================
     * CLIENT UTENTE
     * =====================================================
     */

    const supabase =
      await createClient();

    /*
     * =====================================================
     * AUTENTICAZIONE ADMIN
     * =====================================================
     */

    const {
      data: {
        user:
          adminUser,
      },

      error:
        adminUserError,
    } =
      await supabase.auth.getUser();

    if (
      adminUserError
    ) {
      console.error(
        "Errore autenticazione amministratore:",
        adminUserError
      );
    }

    if (
      !adminUser
    ) {
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
      data:
        adminProfile,

      error:
        adminProfileError,
    } = await supabase
      .from(
        "profiles"
      )
      .select(
        "role"
      )
      .eq(
        "id",
        adminUser.id
      )
      .maybeSingle();

    if (
      adminProfileError
    ) {
      console.error(
        "Errore lettura profilo amministratore:",
        adminProfileError
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
      adminProfile?.role !==
      "ADMIN"
    ) {
      return NextResponse.json(
        {
          message:
            "Non sei autorizzato a verificare i professionisti.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    let body:
      ReviewBody;

    try {
      body =
        (await request.json()) as ReviewBody;
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
     * VALIDAZIONE AZIONE
     * =====================================================
     */

    if (
      body.action !==
        "APPROVE" &&
      body.action !==
        "REJECT"
    ) {
      return NextResponse.json(
        {
          message:
            "Azione di verifica non valida.",
        },
        {
          status: 400,
        }
      );
    }

    const notes =
      body.notes
        ?.trim() ||
      null;

    if (
      body.action ===
        "REJECT" &&
      !notes
    ) {
      return NextResponse.json(
        {
          message:
            "Inserisci una motivazione prima di rifiutare il profilo.",
        },
        {
          status: 400,
        }
      );
    }

    const verificationStatus =
      body.action ===
      "APPROVE"
        ? "APPROVED"
        : "REJECTED";

    /*
     * =====================================================
     * CLIENT ADMIN PRIVILEGIATO
     * =====================================================
     */

    const supabaseAdmin =
      getSupabaseAdmin();

    /*
     * =====================================================
     * LETTURA PROFILO PROFESSIONALE
     * =====================================================
     */

    const {
      data:
        professionalProfile,

      error:
        readError,
    } = await supabaseAdmin
      .from(
        "professional_profiles"
      )
      .select(
        `
          user_id,
          profession,
          profile_completed,
          documents_submitted,
          verification_status,
          verified,
          published
        `
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

    if (
      readError
    ) {
      console.error(
        "Errore lettura professionista:",
        readError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile leggere il profilo professionale.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !professionalProfile
    ) {
      return NextResponse.json(
        {
          message:
            "Profilo professionale non trovato.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * CONTROLLO COMPLETEZZA
     * =====================================================
     */

    if (
      body.action ===
        "APPROVE" &&
      (
        !professionalProfile
          .profile_completed ||
        !professionalProfile
          .documents_submitted
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Il profilo non può essere approvato finché dati e documenti non sono completi.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * CONTROLLO DOCUMENTI APPROVATI
     * =====================================================
     */

    if (body.action === "APPROVE") {
      const professionCategory =
        isProfession(professionalProfile.profession)
          ? getProfessionCategory(professionalProfile.profession)
          : null;

      const {
        data: professionalDocuments,
        error: documentsReadError,
      } = await supabaseAdmin
        .from("professional_documents")
        .select(
          `
            document_type,
            verification_status
          `
        )
        .eq("professional_id", userId);

      if (documentsReadError) {
        console.error(
          "Errore lettura documenti professionali:",
          documentsReadError
        );

        return NextResponse.json(
          {
            message:
              "Impossibile verificare lo stato dei documenti professionali.",
          },
          {
            status: 500,
          }
        );
      }

      const identityApproved =
        professionalDocuments?.some(
          (document) =>
            document.document_type === "identity" &&
            document.verification_status === "APPROVED"
        ) ?? false;

      const registrationRequired =
        professionCategory !== "CARE_ASSISTANCE";

      const registrationApproved =
        professionalDocuments?.some(
          (document) =>
            document.document_type === "registration" &&
            document.verification_status === "APPROVED"
        ) ?? false;

        const cvApproved =
          professionalDocuments?.some(
            (document) =>
              document.document_type === "cv" &&
              document.verification_status === "APPROVED"
          ) ?? false;

      if (!identityApproved) {
        return NextResponse.json(
          {
            message:
              "Il documento di identità deve essere approvato prima di approvare il professionista.",
          },
          {
            status: 400,
          }
        );
      }

        if (
          registrationRequired &&
          !registrationApproved
        ) {
          return NextResponse.json(
            {
              message:
                professionCategory === "HEALTH_OPERATOR"
                  ? "La qualifica OSS deve essere approvata prima di approvare il professionista."
                  : "Il documento professionale deve essere approvato prima di approvare il professionista.",
            },
            {
              status: 400,
            }
          );
        }

        if (!cvApproved) {
          return NextResponse.json(
            {
              message:
                "Il Curriculum Vitae deve essere approvato prima di approvare il professionista.",
            },
            {
              status: 400,
            }
          );
        }    }

    /*
     * =====================================================
     * AGGIORNAMENTO VERIFICA
     * =====================================================
     */

    const now =
      new Date()
        .toISOString();

    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "professional_profiles"
      )
      .update({
        verification_status:
          verificationStatus,

        verification_notes:
          notes,

        verified_at:
          now,

        verified_by:
          adminUser.id,

        verified:
          body.action ===
          "APPROVE",

        published:
          body.action ===
          "APPROVE",

        updated_at:
          now,
      })
      .eq(
        "user_id",
        userId
      )
      .select(
        `
          user_id,
          profession,
          verification_status,
          verification_notes,
          verified,
          verified_at,
          verified_by,
          published
        `
      )
      .single();

    if (
      error
    ) {
      console.error(
        "Errore aggiornamento verifica:",
        {
          message:
            error.message,

          code:
            error.code,

          details:
            error.details,

          hint:
            error.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            error.message ||
            "Impossibile aggiornare la verifica.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * NOTIFICA PROFESSIONISTA
     * =====================================================
     *
     * La decisione Admin è già stata salvata.
     * Un eventuale errore di notifica non deve
     * annullare la verifica.
     * =====================================================
     */

    const notificationType =
      body.action ===
      "APPROVE"
        ? "PROFESSIONAL_PROFILE_APPROVED"
        : "PROFESSIONAL_PROFILE_REJECTED";

    const notificationTitle =
      body.action ===
      "APPROVE"
        ? "Modifiche approvate"
        : "Modifiche da rivedere";

    const baseMessage =
      body.action ===
      "APPROVE"
        ? "L'amministratore ha verificato e approvato le modifiche al tuo profilo professionale."
        : "L'amministratore ha verificato il tuo profilo e non ha approvato le modifiche.";

    const notificationMessage =
      notes
        ? `${baseMessage} Nota amministratore: ${notes}`
        : baseMessage;

    const notificationLink =
      "/dashboard/professional/profile";

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
          userId,

        appointment_id:
          null,

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
      })
      .select(
        `
          id,
          type,
          link
        `
      )
      .single();

    if (
      notificationError
    ) {
      console.error(
        "Verifica professionista completata ma notifica non creata:",
        {
          professionalId:
            userId,

          action:
            body.action,

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

    return NextResponse.json({
      success: true,

      profile:
        data,

      notificationCreated:
        !notificationError,

      notificationId:
        notification
          ?.id ??
        null,

      notificationType,

      notificationLink,

      message:
        body.action ===
        "APPROVE"
          ? "Professionista approvato correttamente."
          : "Profilo rifiutato correttamente.",
    });
  } catch (error) {
    console.error(
      "Errore API revisione professionista:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Il server non è riuscito a completare la verifica.",
      },
      {
        status: 500,
      }
    );
  }
}
