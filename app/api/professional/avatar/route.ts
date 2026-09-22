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
  "image/jpeg",
  "image/png",
  "image/webp",
];

const maxFileSize =
  2 * 1024 * 1024;

type AdminProfile = {
  id: string;
};

async function notifyAdminsAvatarUpdated({
  professionalId,
  professionalName,
}: {
  professionalId: string;
  professionalName: string;
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
      "Avatar aggiornato ma impossibile recuperare gli Admin:",
      adminsError
    );

    return {
      created: 0,
      failed: 0,
    };
  }

  const admins =
    (adminsData ?? []) as AdminProfile[];

  if (
    admins.length ===
    0
  ) {
    console.warn(
      "Avatar aggiornato ma non esistono account ADMIN da notificare."
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

  const notificationMessage =
    professionalName
      ? `${professionalName} ha aggiornato la propria foto profilo.`
      : "Un professionista ha aggiornato la propria foto profilo.";

  let created =
    0;

  let failed =
    0;

  for (
    const admin of admins
  ) {
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
          "PROFESSIONAL_AVATAR_UPDATED",

        title:
          "Foto profilo aggiornata",

        message:
          notificationMessage,

        link:
          notificationLink,

        read:
          false,
      });

    if (
      notificationError
    ) {
      failed +=
        1;

      console.error(
        "Avatar aggiornato ma notifica Admin non creata:",
        {
          adminId:
            admin.id,

          professionalId,

          error:
            notificationError,
        }
      );

      continue;
    }

    created +=
      1;
  }

  return {
    created,
    failed,
  };
}

export async function POST(
  request: NextRequest
) {
  try {
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
        "Errore autenticazione avatar professionista:",
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
      .from(
        "profiles"
      )
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

    if (
      accountProfileError
    ) {
      console.error(
        "Errore verifica ruolo upload avatar:",
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

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          message:
            "Seleziona una foto.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * VALIDAZIONE TIPO FILE
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
            "Formato non supportato. Usa JPG, PNG o WebP.",
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
            "La foto non può superare 2 MB.",
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
      "jpg";

    const filePath =
      `${user.id}/avatar.${extension}`;

    /*
     * =====================================================
     * UPLOAD STORAGE
     * =====================================================
     *
     * L'upload resta con il client utente.
     *
     * In questo modo continuano ad applicarsi
     * le policy Storage legate alla sessione
     * autenticata del professionista.
     * =====================================================
     */

    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          "avatars"
        )
        .upload(
          filePath,
          file,
          {
            upsert:
              true,

            contentType:
              file.type,
          }
        );

    if (
      uploadError
    ) {
      console.error(
        "Errore upload avatar:",
        {
          message:
            uploadError.message,
        }
      );

      return NextResponse.json(
        {
          message:
            uploadError.message ||
            "Impossibile caricare la foto.",
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
     * La scrittura su professional_profiles
     * passa esclusivamente tramite service role.
     * =====================================================
     */

    const supabaseAdmin =
      getSupabaseAdmin();

    /*
     * =====================================================
     * AGGIORNAMENTO PROFILO
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
        avatar_path:
          filePath,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "user_id",
        user.id
      )
      .select(
        `
          user_id,
          avatar_path,
          updated_at
        `
      )
      .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "Errore aggiornamento avatar nel profilo:",
        {
          message:
            updateError.message,

          code:
            updateError.code,

          details:
            updateError.details,

          hint:
            updateError.hint,

          userId:
            user.id,
        }
      );

      return NextResponse.json(
        {
          message:
            "Foto caricata, ma il profilo non è stato aggiornato.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !updatedProfile
    ) {
      console.error(
        "Avatar caricato ma profilo professionista non trovato:",
        {
          userId:
            user.id,
        }
      );

      return NextResponse.json(
        {
          message:
            "Foto caricata, ma il profilo professionale non è stato trovato.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * URL PUBBLICO
     * =====================================================
     */

    const {
      data: {
        publicUrl,
      },
    } =
      supabase.storage
        .from(
          "avatars"
        )
        .getPublicUrl(
          filePath
        );

    /*
     * =====================================================
     * NOTIFICA ADMIN
     * =====================================================
     *
     * Se la notifica fallisce, l'avatar
     * resta comunque aggiornato.
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
      await notifyAdminsAvatarUpdated({
        professionalId:
          user.id,

        professionalName,
      });

    /*
     * =====================================================
     * RISPOSTA
     * =====================================================
     */

    return NextResponse.json({
      success:
        true,

      path:
        filePath,

      publicUrl,

      adminsNotified:
        notificationResult.created,

      adminNotificationsFailed:
        notificationResult.failed,

      message:
        "Foto profilo aggiornata.",
    });
  } catch (error) {
    console.error(
      "Errore API avatar:",
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