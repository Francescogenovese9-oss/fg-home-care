import { syncApprovedSignupSubscription } from "@/lib/subscriptions/complete-paid-signup";
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
import { getProfessionCategory, isProfession } from "@/lib/professions";

type DocumentReviewAction =
  | "APPROVE"
  | "REJECT";

type DocumentReviewBody = {
  action?: DocumentReviewAction;
  rejectionReason?: string;
  expectedStoragePath?: string;
};

type RouteContext = {
  params: Promise<{
    userId: string;
    documentId: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      userId,
      documentId,
    } = await context.params;

    const supabase =
      await createClient();

    const {
      data: {
        user: adminUser,
      },
      error: adminUserError,
    } = await supabase.auth.getUser();

    if (adminUserError) {
      console.error(
        "Errore autenticazione amministratore:",
        adminUserError
      );
    }

    if (!adminUser) {
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
      data: adminProfile,
      error: adminProfileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", adminUser.id)
      .maybeSingle();

    if (adminProfileError) {
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

    if (adminProfile?.role !== "ADMIN") {
      return NextResponse.json(
        {
          message:
            "Non sei autorizzato a verificare i documenti professionali.",
        },
        {
          status: 403,
        }
      );
    }

    let body: DocumentReviewBody;

    try {
      body =
        (await request.json()) as DocumentReviewBody;
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

    if (
      body.action !== "APPROVE" &&
      body.action !== "REJECT"
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

    if (typeof body.expectedStoragePath !== "string" || !body.expectedStoragePath) {
      return NextResponse.json({ message: "Versione documento mancante: aggiorna la pagina." }, { status: 400 });
    }

    const rejectionReason =
      body.rejectionReason?.trim() || null;

    if (
      body.action === "REJECT" &&
      !rejectionReason
    ) {
      return NextResponse.json(
        {
          message:
            "Inserisci una motivazione prima di rifiutare il documento.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      rejectionReason &&
      rejectionReason.length > 1500
    ) {
      return NextResponse.json(
        {
          message:
            "La motivazione non può superare 1500 caratteri.",
        },
        {
          status: 400,
        }
      );
    }

    const supabaseAdmin =
      getSupabaseAdmin();

    const {
      data: professionalDocument,
      error: readError,
    } = await supabaseAdmin
      .from("professional_documents")
      .select(
        `
          id,
          professional_id,
          document_type,
          verification_status
        `
      )
      .eq("id", documentId)
      .eq("professional_id", userId)
      .maybeSingle();

    if (readError) {
      console.error(
        "Errore lettura documento professionale:",
        readError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile leggere il documento professionale.",
        },
        {
          status: 500,
        }
      );
    }

    if (!professionalDocument) {
      return NextResponse.json(
        {
          message:
            "Documento professionale non trovato.",
        },
        {
          status: 404,
        }
      );
    }

    // Il database aggiorna documento e profilo nella stessa transazione.
    const { data: reviewResult, error: reviewError } = await supabaseAdmin
      .rpc("admin_review_professional_document_atomic", {
        p_professional_id: userId,
        p_document_id: documentId,
        p_admin_id: adminUser.id,
        p_action: body.action,
        p_rejection_reason: rejectionReason,
        p_expected_storage_path: body.expectedStoragePath,
      });

    if (reviewError) {
      console.error("Errore revisione atomica documento:", reviewError);
      const stale = reviewError.code === "40001";
      return NextResponse.json(
        { message: stale ? "Il documento è cambiato. Aggiorna la pagina e riesaminalo." : "Impossibile completare la verifica del documento." },
        { status: stale ? 409 : 500 }
      );
    }

    try { await syncApprovedSignupSubscription(userId); }
    catch (syncError) { console.error("Riconciliazione piano dopo verifica:", syncError); }

    return NextResponse.json(reviewResult, { status: 200 });
  } catch (error) {
    console.error(
      "Errore inatteso verifica documento professionale:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Errore interno del server.",
      },
      {
        status: 500,
      }
    );
  }
}
