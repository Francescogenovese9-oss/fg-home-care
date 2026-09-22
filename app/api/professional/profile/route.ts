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

import {
  professionalProfileSchema,
} from "@/lib/validations/professional-profile";

type AdminProfile = {
  id: string;
};

async function notifyAdminsProfileUpdated({
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
      "Profilo aggiornato ma impossibile recuperare gli Admin:",
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
      "Profilo aggiornato ma non esistono account ADMIN da notificare."
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
      ? `${professionalName} ha modificato il proprio profilo professionale.`
      : "Un professionista ha modificato il proprio profilo professionale.";

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
          "PROFESSIONAL_PROFILE_UPDATED",

        title:
          "Profilo professionista aggiornato",

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
        "Profilo aggiornato ma notifica Admin non creata:",
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

export async function GET() {
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
        "Errore autenticazione lettura profilo professionista:",
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
     * VERIFICA RUOLO
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
        "role"
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
        "Errore verifica ruolo professionista:",
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
     * LETTURA PROFILO PROFESSIONALE
     * =====================================================
     *
     * La lettura resta con il client autenticato.
     * La RLS determina quali righe può leggere.
     * =====================================================
     */

    const {
      data,
      error,
    } = await supabase
      .from(
        "professional_profiles"
      )
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (error) {
      console.error(
        "Errore lettura profilo professionista:",
        error
      );

      return NextResponse.json(
        {
          message:
            "Impossibile leggere il profilo.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      profile:
        data,
    });
  } catch (error) {
    console.error(
      "Errore API profilo professionista:",
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

export async function PUT(
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
      professionalProfileSchema.safeParse(
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
            "I dati inseriti non sono validi.",
        },
        {
          status: 400,
        }
      );
    }

    const values =
      validation.data;

    /*
     * =====================================================
     * CLIENT UTENTE
     * =====================================================
     *
     * Viene utilizzato esclusivamente per:
     *
     * - autenticazione;
     * - controllo ruolo;
     * - letture autorizzate.
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
        "Errore autenticazione aggiornamento profilo professionista:",
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
     * VERIFICA RUOLO
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

    if (
      accountProfileError
    ) {
      console.error(
        "Errore verifica ruolo aggiornamento profilo:",
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
     * CONTROLLO PROFILO ESISTENTE
     * =====================================================
     *
     * Questa lettura resta con il client utente.
     * =====================================================
     */

    const {
      data:
        existingProfile,

      error:
        existingProfileError,
    } = await supabase
      .from(
        "professional_profiles"
      )
      .select(
        "user_id"
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (
      existingProfileError
    ) {
      console.error(
        "Errore verifica profilo professionista esistente:",
        existingProfileError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare il profilo professionale.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =====================================================
     * PAYLOAD PROFILO
     * =====================================================
     *
     * IMPORTANTE:
     *
     * Il payload contiene esclusivamente i campi
     * che il professionista può modificare.
     *
     * Non accettiamo dal body:
     *
     * - verified
     * - published
     * - verification_status
     * - verification_notes
     * - verified_by
     * - verified_at
     * - campi Stripe
     * - percorsi documenti
     * =====================================================
     */

    const profilePayload = {
      profession:
        values.profession,

      specialization:
        values.specialization ||
        null,

      registration_number:
        values.registrationNumber ||
        null,

      vat_number:
        values.vatNumber ||
        null,

      bio:
        values.bio ||
        null,

      city:
        values.city,

      province:
        values.province,

      postal_code:
        values.postalCode,

      service_radius_km:
        values.serviceRadiusKm,

      hourly_rate:
        values.hourlyRate,

      available_weekdays:
        values.availableWeekdays,

      available_from:
        values.availableFrom ||
        null,

      available_to:
        values.availableTo ||
        null,

      home_visits:
        values.homeVisits,

      video_consultations:
        values.videoConsultations,

      profile_completed:
        true,

      updated_at:
        new Date().toISOString(),
    };

    /*
     * =====================================================
     * CLIENT ADMIN
     * =====================================================
     *
     * Da questo punto le scritture su
     * professional_profiles vengono eseguite
     * esclusivamente con service role.
     *
     * L'identità e il ruolo dell'utente sono già
     * stati verificati sopra.
     * =====================================================
     */

    const supabaseAdmin =
      getSupabaseAdmin();

    let savedProfile:
      Record<string, unknown>;

    /*
     * =====================================================
     * UPDATE PROFILO ESISTENTE
     * =====================================================
     */

    if (
      existingProfile
    ) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from(
          "professional_profiles"
        )
        .update(
          profilePayload
        )
        .eq(
          "user_id",
          user.id
        )
        .select()
        .single();

      if (error) {
        console.error(
          "Errore aggiornamento profilo professionista:",
          {
            message:
              error.message,

            code:
              error.code,

            details:
              error.details,

            hint:
              error.hint,

            userId:
              user.id,
          }
        );

        return NextResponse.json(
          {
            message:
              error.message ||
              "Impossibile aggiornare il profilo.",
          },
          {
            status: 400,
          }
        );
      }

      savedProfile =
        data as Record<
          string,
          unknown
        >;
    } else {
      /*
       * ===================================================
       * CREAZIONE PROFILO
       * ===================================================
       */

      const {
        data,
        error,
      } = await supabaseAdmin
        .from(
          "professional_profiles"
        )
        .insert({
          user_id:
            user.id,

          subscription_plan:
            "BASIC",

          ...profilePayload,
        })
        .select()
        .single();

      if (error) {
        console.error(
          "Errore creazione profilo professionista:",
          {
            message:
              error.message,

            code:
              error.code,

            details:
              error.details,

            hint:
              error.hint,

            userId:
              user.id,
          }
        );

        return NextResponse.json(
          {
            message:
              error.message ||
              "Impossibile creare il profilo.",
          },
          {
            status: 400,
          }
        );
      }

      savedProfile =
        data as Record<
          string,
          unknown
        >;
    }

    /*
     * =====================================================
     * NOTIFICA ADMIN
     * =====================================================
     *
     * La modifica del profilo è già stata salvata.
     *
     * Un eventuale errore nella creazione della
     * notifica non deve annullare il salvataggio.
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
      await notifyAdminsProfileUpdated({
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

      profile:
        savedProfile,

      adminsNotified:
        notificationResult.created,

      adminNotificationsFailed:
        notificationResult.failed,

      message:
        existingProfile
          ? "Profilo aggiornato correttamente."
          : "Profilo creato correttamente.",
    });
  } catch (error) {
    console.error(
      "Errore API aggiornamento profilo:",
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