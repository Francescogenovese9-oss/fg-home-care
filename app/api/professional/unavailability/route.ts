import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { unavailabilitySchema } from "@/lib/validations/unavailability";

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "PROFESSIONAL") {
      return NextResponse.json(
        {
          message:
            "Accesso riservato ai professionisti.",
        },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("professional_unavailability")
      .select("*")
      .eq("professional_id", user.id)
      .gte(
        "unavailable_date",
        new Date().toISOString().slice(0, 10)
      )
      .order("unavailable_date", {
        ascending: true,
      })
      .order("start_time", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Errore lettura indisponibilità:",
        error
      );

      return NextResponse.json(
        {
          message:
            "Impossibile caricare le indisponibilità.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      unavailability: data ?? [],
    });
  } catch (error) {
    console.error(
      "Errore API indisponibilità:",
      error
    );

    return NextResponse.json(
      {
        message: "Errore interno del server.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    const validation =
      unavailabilitySchema.safeParse(body);

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
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "PROFESSIONAL") {
      return NextResponse.json(
        {
          message:
            "Accesso riservato ai professionisti.",
        },
        { status: 403 }
      );
    }

    const { data: overlapping } = await supabase
      .from("professional_unavailability")
      .select("id")
      .eq("professional_id", user.id)
      .eq(
        "unavailable_date",
        values.unavailableDate
      )
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        {
          message:
            "Esiste già un’indisponibilità per la data selezionata.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("professional_unavailability")
      .insert({
        professional_id: user.id,
        unavailable_date:
          values.unavailableDate,
        all_day: values.allDay,
        start_time: values.allDay
          ? null
          : values.startTime || null,
        end_time: values.allDay
          ? null
          : values.endTime || null,
        reason: values.reason || null,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Errore salvataggio indisponibilità:",
        error
      );

      return NextResponse.json(
        {
          message:
            error.message ||
            "Impossibile salvare l’indisponibilità.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        unavailability: data,
        message:
          "Indisponibilità salvata correttamente.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Errore creazione indisponibilità:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Il server non è riuscito a salvare l’indisponibilità.",
      },
      { status: 500 }
    );
  }
}