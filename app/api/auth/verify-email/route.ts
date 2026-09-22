import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("email" in body) ||
      !("token" in body)
    ) {
      return NextResponse.json(
        { message: "Dati di verifica non validi." },
        { status: 400 }
      );
    }

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : "";

    if (!email || !/^\d{8}$/.test(token)) {
      return NextResponse.json(
        { message: "Inserisci un codice di verifica valido." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error) {
      console.error("Errore verifica email Supabase:", error.message);

      return NextResponse.json(
        {
          message:
            "Codice non valido o scaduto. Richiedi una nuova registrazione.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Errore API verifica email:", error);

    return NextResponse.json(
      {
        message:
          "Il server non è riuscito a verificare l’indirizzo email.",
      },
      { status: 500 }
    );
  }
}
