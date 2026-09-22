import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { patientProfileSchema } from "@/lib/validations/patient-profile";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Errore autenticazione lettura profilo paziente:",
        userError
      );
    }

    if (!user) {
      return NextResponse.json(
        { message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, role, city, province")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Errore lettura profilo paziente:",
        profileError
      );

      return NextResponse.json(
        { message: "Impossibile recuperare il profilo." },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "PATIENT") {
      return NextResponse.json(
        { message: "Accesso non autorizzato." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      profile: {
        firstName: profile.first_name ?? "",
        lastName: profile.last_name ?? "",
        email: profile.email ?? user.email ?? "",
        city: profile.city ?? "",
        province: profile.province ?? "",
      },
    });
  } catch (error) {
    console.error(
      "Errore API lettura profilo paziente:",
      error
    );

    return NextResponse.json(
      { message: "Errore interno del server." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Richiesta non valida." },
        { status: 400 }
      );
    }

    const validation = patientProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error.issues[0]?.message ??
            "I dati inseriti non sono validi.",
        },
        { status: 400 }
      );
    }

    const values = validation.data;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Errore autenticazione aggiornamento profilo paziente:",
        userError
      );
    }

    if (!user) {
      return NextResponse.json(
        { message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const { data: accountProfile, error: accountProfileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (accountProfileError) {
      console.error(
        "Errore verifica ruolo paziente:",
        accountProfileError
      );

      return NextResponse.json(
        { message: "Impossibile verificare il tuo account." },
        { status: 500 }
      );
    }

    if (!accountProfile || accountProfile.role !== "PATIENT") {
      return NextResponse.json(
        { message: "Accesso non autorizzato." },
        { status: 403 }
      );
    }

    const { data: updatedProfile, error: updateError } =
      await supabase
        .from("profiles")
        .update({
          first_name: values.firstName,
          last_name: values.lastName,
          city: values.city,
          province: values.province,
        })
        .eq("id", user.id)
        .select(
          "first_name, last_name, email, city, province"
        )
        .single();

    if (updateError) {
      console.error(
        "Errore aggiornamento profilo paziente:",
        updateError
      );

      return NextResponse.json(
        { message: "Impossibile aggiornare il profilo." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Profilo aggiornato correttamente.",
      profile: {
        firstName: updatedProfile.first_name,
        lastName: updatedProfile.last_name,
        email: updatedProfile.email ?? user.email ?? "",
        city: updatedProfile.city,
        province: updatedProfile.province,
      },
    });
  } catch (error) {
    console.error(
      "Errore API aggiornamento profilo paziente:",
      error
    );

    return NextResponse.json(
      { message: "Errore interno del server." },
      { status: 500 }
    );
  }
}
