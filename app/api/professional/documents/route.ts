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

const allowedTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const maxFileSize =
  6 * 1024 * 1024;

const allowedDocumentTypes = [
  "identity",
  "registration",
  "vat",
    "cv",
] as const;

type DocumentType =
  (typeof allowedDocumentTypes)[number];

type AdminProfile = {
  id: string;
};

const databaseColumns: Partial<Record<
  DocumentType,
  string
>> = {
  identity:
    "identity_document_path",

  registration:
    "registration_document_path",

  vat:
    "vat_document_path",
};

function getDocumentLabel(
  documentType: DocumentType
) {
  switch (documentType) {
    case "identity":
      return "documento di identità";

    case "registration":
      return "documento di iscrizione professionale";

    case "vat":
      return "documento relativo alla partita IVA";


      case "cv":
        return "curriculum vitae";
    default:
      return "documento professionale";
  }
}

async function notifyAdminsDocumentUploaded({
  professionalId,
  professionalName,
  documentType,
}: {
  professionalId: string;
  professionalName: string;
  documentType: DocumentType;
}) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data: adminsData,
    error: adminsError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "ADMIN");

  if (adminsError) {
    console.error(
      "Documento caricato ma impossibile recuperare gli Admin:",
      adminsError
    );

    return {
      created: 0,
      failed: 0,
    };
  }

  const admins =
    (adminsData ??
      []) as AdminProfile[];

  if (admins.length === 0) {
    console.warn(
      "Documento caricato ma non esistono account ADMIN da notificare."
    );

    return {
      created: 0,
      failed: 0,
    };
  }

  const notificationLink =
    `/dashboard/admin/professionals/${encodeURIComponent(
      professionalId
    )}`;

  const documentLabel =
    getDocumentLabel(
      documentType
    );

  const notificationMessage =
    professionalName
      ? `${professionalName} ha caricato o aggiornato il ${documentLabel}.`
      : `Un professionista ha caricato o aggiornato il ${documentLabel}.`;

  let created = 0;
  let failed = 0;

  for (const admin of admins) {
    const {
      error:
        notificationError,
    } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id:
          admin.id,

        appointment_id:
          null,

        review_report_id:
          null,

        type:
          "PROFESSIONAL_DOCUMENT_UPLOADED",

        title:
          "Documento professionista aggiornato",

        message:
          notificationMessage,

        link:
          notificationLink,

        read:
          false,
      });

    if (notificationError) {
      failed += 1;

      console.error(
        "Documento caricato ma notifica Admin non creata:",
        {
          adminId:
            admin.id,

          professionalId,

          documentType,

          error:
            notificationError,
        }
      );

      continue;
    }

    created += 1;
  }

  return {
    created,
    failed,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          message: "Utente non autenticato.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: accountProfile,
      error: accountProfileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (accountProfileError) {
      console.error(
        "Errore verifica ruolo lettura documenti:",
        accountProfileError
      );

      return NextResponse.json(
        {
          message: "Impossibile verificare il tuo account.",
        },
        {
          status: 500,
        }
      );
    }

    if (accountProfile?.role !== "PROFESSIONAL") {
      return NextResponse.json(
        {
          message: "Accesso riservato ai professionisti.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: documents,
      error: documentsError,
    } = await supabase
      .from("professional_documents")
      .select(
        `
          id,
          document_type,
          original_filename,
          mime_type,
          file_size,
          verification_status,
            is_public,          rejection_reason,
          expires_at,
          uploaded_at,
          updated_at
        `
      )
      .eq("professional_id", user.id)
      .order("uploaded_at", {
        ascending: false,
      });

    if (documentsError) {
      console.error(
        "Errore lettura documenti professionista:",
        documentsError
      );

      return NextResponse.json(
        {
          message: "Impossibile recuperare i documenti.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      documents: documents ?? [],
    });
  } catch (error) {
    console.error(
      "Errore recupero documenti professionista:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Errore interno del server.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * SUPABASE
     * =====================================================
     *
     * supabase:
     * client autenticato dell'utente.
     *
     * supabaseAdmin:
     * utilizzato esclusivamente per
     * operazioni server-side privilegiate.
     * =====================================================
     */

    const supabase =
      await createClient();

    const supabaseAdmin =
      getSupabaseAdmin();

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
        "Errore autenticazione upload documento professionista:",
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
        accountProfileError,
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

    if (accountProfileError) {
      console.error(
        "Errore verifica ruolo upload documento:",
        accountProfileError
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
      accountProfile?.role !==
      "PROFESSIONAL"
    ) {
      return NextResponse.json(
        {
          message:
            "Accesso riservato ai professionisti.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * FORM DATA
     * =====================================================
     */

    const formData =
      await request.formData();

    const file =
      formData.get(
        "file"
      );


    const isPublicValue =
      formData.get("isPublic");
    const documentType =
      formData.get(
        "documentType"
      );

    /*
     * =====================================================
     * VALIDAZIONE FILE
     * =====================================================
     */

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          message:
            "Seleziona un documento.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * VALIDAZIONE TIPO DOCUMENTO
     * =====================================================
     */

    if (
      typeof documentType !==
        "string" ||
      !allowedDocumentTypes.includes(
        documentType as DocumentType
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Tipo di documento non valido.",
        },
        {
          status: 400,
        }
      );
    }


    const typedDocument =
      documentType as DocumentType;

    const cvIsPublic =
      typedDocument === "cv" &&
      isPublicValue === "true";

    /*
     * =====================================================
     * VALIDAZIONE MIME TYPE
     * =====================================================
     */

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Formato non supportato. Usa PDF, JPG o PNG.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * VALIDAZIONE DIMENSIONE
     * =====================================================
     */

    if (
      file.size >
      maxFileSize
    ) {
      return NextResponse.json(
        {
          message:
            "Il documento non può superare 6 MB.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * ESTENSIONE FILE
     * =====================================================
     */

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "pdf";

    const filePath =
      `${user.id}/${typedDocument}.${extension}`;

    /*
     * =====================================================
     * UPLOAD STORAGE
     * =====================================================
     *
     * Manteniamo qui il client autenticato.
     * Le policy Storage devono continuare
     * a controllare che il professionista
     * possa scrivere soltanto nella propria
     * cartella.
     * =====================================================
     */

    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          "professional-documents"
        )
        .upload(
          filePath,
          file,
          {
            upsert: true,

            contentType:
              file.type,
          }
        );

    if (uploadError) {
      console.error(
        "Errore upload documento professionista:",
        {
          message:
            uploadError.message,
        }
      );

      return NextResponse.json(
        {
          message:
            uploadError.message ||
            "Impossibile caricare il documento.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * METADATI DOCUMENTO
     * =====================================================
     */

    const now = new Date().toISOString();

    const {
      data: savedDocument,
      error: documentDatabaseError,
    } = await supabaseAdmin
      .from("professional_documents")
      .upsert(
        {
          professional_id: user.id,
          document_type: typedDocument,
          storage_path: filePath,
          original_filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          is_public: cvIsPublic,
          verification_status: "PENDING",
          rejection_reason: null,
          uploaded_at: now,
          verified_at: null,
          verified_by: null,
          updated_at: now,
        },
        {
          onConflict: "professional_id,document_type",
        }
      )
      .select(
        `
          id,
          professional_id,
          document_type,
          storage_path,
          original_filename,
          mime_type,
          file_size,
          verification_status,
            is_public,          rejection_reason,
          expires_at,
          uploaded_at,
          verified_at,
          verified_by,
          updated_at
        `
      )
      .single();

    if (documentDatabaseError) {
      console.error(
        "Errore salvataggio metadati documento:",
        documentDatabaseError
      );

      return NextResponse.json(
        {
          message:
            "Documento caricato, ma non è stato possibile registrarne i dati.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =====================================================
     * COLONNA DATABASE
     * =====================================================
     */

    const column =
      databaseColumns[
        typedDocument
      ];

    /*
     * =====================================================
     * AGGIORNAMENTO PROFILO
     * =====================================================
     *
     * Scrittura server-side.
     *
     * Dopo l'hardening l'utente authenticated
     * non dovrà possedere UPDATE diretto su
     * professional_profiles.
     *
     * L'identità dell'utente è già stata
     * verificata sopra tramite auth.getUser().
     * =====================================================
     */

    const {
      data:
        updatedProfile,

      error:
        updateError,
    } = await supabaseAdmin
      .from(
        "professional_profiles"
      )
      .update({
        ...(column
          ? {
              [column]: filePath,
            }
          : {}),
        documents_submitted: true,
        updated_at: new Date().toISOString(),
      })      .eq(
        "user_id",
        user.id
      )
      .select(
        `
          user_id,
          identity_document_path,
          registration_document_path,
          vat_document_path,
          documents_submitted,
          updated_at
        `
      )
      .maybeSingle();

    if (updateError) {
      console.error(
        "Errore aggiornamento documento nel profilo:",
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
            "Documento caricato, ma il profilo non è stato aggiornato.",
        },
        {
          status: 500,
        }
      );
    }

    if (!updatedProfile) {
      console.error(
        "Documento caricato ma professional_profiles non trovato:",
        {
          professionalId:
            user.id,

          documentType:
            typedDocument,

          filePath,
        }
      );

      return NextResponse.json(
        {
          message:
            "Documento caricato, ma il profilo professionale non è stato trovato.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * NOTIFICA ADMIN
     * =====================================================
     *
     * La modifica è già stata salvata.
     * Se la notifica fallisce, non annulliamo
     * l'upload del documento.
     * =====================================================
     */

    const professionalName =
      [
        accountProfile.first_name,
        accountProfile.last_name,
      ]
        .filter(Boolean)
        .join(" ");

    const notificationResult =
      await notifyAdminsDocumentUploaded({
        professionalId:
          user.id,

        professionalName,

        documentType:
          typedDocument,
      });

    /*
     * =====================================================
     * RISPOSTA
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      path:
        filePath,

      documentType:
        typedDocument,

      document:
        savedDocument,

      profile:
        updatedProfile,

      adminsNotified:
        notificationResult.created,

      adminNotificationsFailed:
        notificationResult.failed,

      message:
        "Documento caricato correttamente.",
    });
  } catch (error) {
    console.error(
      "Errore upload documento:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Errore interno del server.",
      },
      {
        status: 500,
      }
    );
  }
}
export async function PATCH(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (
      userError ||
      !user
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

    const {
      data: accountProfile,
      error: accountProfileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (accountProfileError) {
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
      accountProfile?.role !==
      "PROFESSIONAL"
    ) {
      return NextResponse.json(
        {
          message:
            "Accesso riservato ai professionisti.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as {
        documentType?: string;
        isPublic?: boolean;
      };

    if (
      body.documentType !==
      "cv"
    ) {
      return NextResponse.json(
        {
          message:
            "La visibilità può eere modificata solo per il Curriculum Vitae.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof body.isPublic !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          message:
            "Valore di visibilità non valdo.",
        },
        {
          status: 400,
        }
      );
    }

    const supabaseAdmin =
      getSupabaseAdmin();

    const {
      data: updatedDocument,
      error: updateError,
    } = await supabaseAdmin
      .from(
        "professional_documents"
      )
      .update({
        is_public:
          body.isPublic,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "professional_id",
        user.id
      )
      .eq(
        "document_type",
        "cv"
      )
      .select(
        `
          id,
          document_type,
          is_public,
          verification_status,
          updated_at
        `
      )
      .maybeSingle();

    if (updateError) {
      console.error(
        "Errore aggiornamento visibilità CV:",
        updateError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile aggiornare la visibilità del Curriculum Vitae.",
        },
        {
          status: 500,
        }
      );
    }

    if (!updatedDocument) {
      return NextResponse.json(
        {
          message:
            "Curriculum Vitae non trovato.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      document:
        updatedDocument,
    });
  } catch (error) {
    console.error(
      "Errore aggiornamento visibilità CV:",
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
