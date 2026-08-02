import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const allowedTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const maxFileSize = 6 * 1024 * 1024;

const allowedDocumentTypes = [
  "identity",
  "registration",
  "vat",
] as const;

type DocumentType =
  (typeof allowedDocumentTypes)[number];

const databaseColumns: Record<DocumentType, string> = {
  identity: "identity_document_path",
  registration: "registration_document_path",
  vat: "vat_document_path",
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const documentType = formData.get("documentType");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Seleziona un documento." },
        { status: 400 }
      );
    }

    if (
      typeof documentType !== "string" ||
      !allowedDocumentTypes.includes(
        documentType as DocumentType
      )
    ) {
      return NextResponse.json(
        { message: "Tipo di documento non valido." },
        { status: 400 }
      );
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          message:
            "Formato non supportato. Usa PDF, JPG o PNG.",
        },
        { status: 400 }
      );
    }

    if (file.size > maxFileSize) {
      return NextResponse.json(
        {
          message:
            "Il documento non può superare 6 MB.",
        },
        { status: 400 }
      );
    }

    const typedDocument =
      documentType as DocumentType;

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "pdf";

    const filePath =
      `${user.id}/${typedDocument}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("professional-documents")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          message:
            uploadError.message ||
            "Impossibile caricare il documento.",
        },
        { status: 400 }
      );
    }

    const column = databaseColumns[typedDocument];

    const { error: updateError } = await supabase
      .from("professional_profiles")
      .update({
        [column]: filePath,
        documents_submitted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        {
          message:
            "Documento caricato, ma il profilo non è stato aggiornato.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      path: filePath,
    });
  } catch (error) {
    console.error("Errore upload documento:", error);

    return NextResponse.json(
      { message: "Errore interno del server." },
      { status: 500 }
    );
  }
}