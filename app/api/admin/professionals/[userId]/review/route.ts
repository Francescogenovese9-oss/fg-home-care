import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type ReviewAction = "APPROVE" | "REJECT";

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
    const { userId } = await context.params;

    const supabase = await createClient();

    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser();

    if (!adminUser) {
      return NextResponse.json(
        {
          message: "Utente non autenticato.",
        },
        { status: 401 }
      );
    }

    const { data: adminProfile, error: adminProfileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", adminUser.id)
        .maybeSingle();

    if (adminProfileError) {
      console.error(
        "Errore lettura profilo amministratore:",
        adminProfileError
      );
    }

    if (adminProfile?.role !== "ADMIN") {
      return NextResponse.json(
        {
          message:
            "Non sei autorizzato a verificare i professionisti.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as ReviewBody;

    if (
      body.action !== "APPROVE" &&
      body.action !== "REJECT"
    ) {
      return NextResponse.json(
        {
          message: "Azione di verifica non valida.",
        },
        { status: 400 }
      );
    }

    const notes = body.notes?.trim() || null;

    if (body.action === "REJECT" && !notes) {
      return NextResponse.json(
        {
          message:
            "Inserisci una motivazione prima di rifiutare il profilo.",
        },
        { status: 400 }
      );
    }

    const verificationStatus =
      body.action === "APPROVE"
        ? "APPROVED"
        : "REJECTED";

    const { data: professionalProfile, error: readError } =
      await supabase
        .from("professional_profiles")
        .select(
          `
            user_id,
            profile_completed,
            documents_submitted
          `
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (readError) {
      console.error(
        "Errore lettura professionista:",
        readError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile leggere il profilo professionale.",
        },
        { status: 500 }
      );
    }

    if (!professionalProfile) {
      return NextResponse.json(
        {
          message: "Profilo professionale non trovato.",
        },
        { status: 404 }
      );
    }

    if (
      body.action === "APPROVE" &&
      (!professionalProfile.profile_completed ||
        !professionalProfile.documents_submitted)
    ) {
      return NextResponse.json(
        {
          message:
            "Il profilo non può essere approvato finché dati e documenti non sono completi.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("professional_profiles")
      .update({
        verification_status: verificationStatus,
        verification_notes: notes,
        verified_at: new Date().toISOString(),
        verified_by: adminUser.id,
        verified:
          body.action === "APPROVE",
        published:
          body.action === "APPROVE",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select(
        `
          user_id,
          verification_status,
          verification_notes,
          verified,
          verified_at,
          verified_by,
          published
        `
      )
      .single();

    if (error) {
      console.error(
        "Errore aggiornamento verifica:",
        error
      );

      return NextResponse.json(
        {
          message:
            error.message ||
            "Impossibile aggiornare la verifica.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: data,
      message:
        body.action === "APPROVE"
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
          "Il server non è riuscito a completare la verifica.",
      },
      { status: 500 }
    );
  }
}