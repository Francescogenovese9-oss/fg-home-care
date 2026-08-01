import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { professionalProfileSchema } from "@/lib/validations/professional-profile";

export async function GET() {
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

    const { data: accountProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (accountProfile?.role !== "PROFESSIONAL") {
      return NextResponse.json(
        { message: "Accesso riservato ai professionisti." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("professional_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Errore lettura profilo professionista:", error);

      return NextResponse.json(
        { message: "Impossibile leggere il profilo." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      profile: data,
    });
  } catch (error) {
    console.error("Errore API profilo professionista:", error);

    return NextResponse.json(
      { message: "Errore interno del server." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    const validation =
      professionalProfileSchema.safeParse(body);

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

    const { data: accountProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (accountProfile?.role !== "PROFESSIONAL") {
      return NextResponse.json(
        { message: "Accesso riservato ai professionisti." },
        { status: 403 }
      );
    }

    const values = validation.data;

    const { data, error } = await supabase
      .from("professional_profiles")
      .upsert(
        {
          user_id: user.id,

          profession: values.profession,
          specialization: values.specialization || null,
          registration_number:
            values.registrationNumber || null,
          vat_number: values.vatNumber || null,

          bio: values.bio || null,
          city: values.city,
          province: values.province,
          postal_code: values.postalCode,

          service_radius_km: values.serviceRadiusKm,
          hourly_rate: values.hourlyRate,

          available_weekdays: values.availableWeekdays,
          available_from: values.availableFrom || null,
          available_to: values.availableTo || null,

          home_visits: values.homeVisits,
          video_consultations: values.videoConsultations,

          profile_completed: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error(
        "Errore salvataggio profilo professionista:",
        error
      );

      return NextResponse.json(
        {
          message:
            error.message ||
            "Impossibile salvare il profilo.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: data,
    });
  } catch (error) {
    console.error("Errore API aggiornamento profilo:", error);

    return NextResponse.json(
      { message: "Errore interno del server." },
      { status: 500 }
    );
  }
}