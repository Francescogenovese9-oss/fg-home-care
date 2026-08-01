import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginBody;

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        {
          message: "Inserisci email e password.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      console.error("Errore login Supabase:", {
        message: error.message,
        status: error.status,
        code: error.code,
      });

      const message =
        error.message === "Email not confirmed"
          ? "Devi prima confermare il tuo indirizzo email."
          : "Email o password non corrette.";

      return NextResponse.json(
        { message },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        {
          message: "Accesso non riuscito.",
        },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

    if (profileError) {
      console.error("Errore lettura profilo:", profileError);
    }

    return NextResponse.json({
      success: true,
      role: profile?.role ?? "PATIENT",
    });
  } catch (error) {
    console.error("Errore API login:", error);

    return NextResponse.json(
      {
        message:
          "Il server non è riuscito a completare l’accesso.",
      },
      { status: 500 }
    );
  }
}