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

    const now =
      new Date().toISOString();

    const verificationStatus =
      body.action === "APPROVE"
        ? "APPROVED"
        : "REJECTED";

    const {
      data: updatedDocument,
      error: updateError,
    } = await supabaseAdmin
      .from("professional_documents")
      .update({
        verification_status:
          verificationStatus,
        rejection_reason:
          body.action === "REJECT"
            ? rejectionReason
            : null,
        verified_at:
          now,
        verified_by:
          adminUser.id,
        updated_at:
          now,
      })
      .eq("id", documentId)
      .eq("professional_id", userId)
      .select(
        `
          id,
          document_type,
          verification_status,
          rejection_reason,
          verified_at,
          verified_by,
          updated_at
        `
      )
      .single();

    if (updateError) {
      console.error(
        "Errore aggiornamento documento professionale:",
        updateError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile aggiornare la verifica del documento.",
        },
        {
          status: 500,
        }
      );
    }

    let profileAutoApproved = false;

    const { data: professionalProfile } = await supabaseAdmin
      .from("professional_profiles")
      .select("profession, profile_completed, documents_submitted")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: documents } = await supabaseAdmin
      .from("professional_documents")
      .select("document_type, verification_status")
      .eq("professional_id", userId);

    const professionCategory =
      professionalProfile && isProfession(professionalProfile.profession)
        ? getProfessionCategory(professionalProfile.profession)
        : null;

    const identityApproved =
      documents?.some(
        (document) =>
          document.document_type === "identity" &&
          document.verification_status === "APPROVED"
      ) ?? false;

    const registrationRequired =
      professionCategory !== "CARE_ASSISTANCE";

      const registrationApproved =
        documents?.some(
          (document) =>
            document.document_type === "registration" &&
            document.verification_status === "APPROVED"
        ) ?? false;

      const cvApproved =
        documents?.some(
          (document) =>
            document.document_type === "cv" &&
            document.verification_status === "APPROVED"
        ) ?? false;

      const canAutoApprove =
        Boolean(professionalProfile?.profile_completed) &&
        Boolean(professionalProfile?.documents_submitted) &&
        identityApproved &&
        (!registrationRequired || registrationApproved) &&
        cvApproved;

      const mustRevokeApproval =
        body.action === "REJECT" &&
        (
          updatedDocument.document_type === "identity" ||
          updatedDocument.document_type === "cv" ||
          (
            registrationRequired &&
            updatedDocument.document_type === "registration"
          )
        );
    if (mustRevokeApproval) {
      const { error: revokeError } = await supabaseAdmin
        .from("professional_profiles")
        .update({
          verification_status: "REJECTED",
          verified: false,
          published: false,
          verification_notes:
            rejectionReason || "Documento obbligatorio rifiutato.",
          verified_at: now,
          verified_by: adminUser.id,
          updated_at: now,
        })
        .eq("user_id", userId);

      if (revokeError) {
        console.error(
          "Errore revoca automatica approvazione profilo:",
          revokeError
        );
      }
    }

    if (body.action === "APPROVE" && canAutoApprove) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from("professional_profiles")
        .update({
          verification_status: "APPROVED",
          verification_notes: null,
          verified_at: now,
          verified_by: adminUser.id,
          verified: true,
          published: true,
          updated_at: now,
        })
        .eq("user_id", userId);

      if (profileUpdateError) {
        console.error(
          "Errore approvazione automatica profilo:",
          profileUpdateError
        );
      } else {
        profileAutoApproved = true;
      }
    }

    return NextResponse.json(
      {
        success: true,
        document: updatedDocument,
        profileAutoApproved,
      },
      {
        status: 200,
      }
    );
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
