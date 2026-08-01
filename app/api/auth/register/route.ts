import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validations/register";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    const validation = registerSchema.safeParse(body);

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

    const { data, error } = await supabase.auth.signUp({
      email: values.email.trim().toLowerCase(),
      password: values.password,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/login`,
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
          role: values.role,
          profession:
            values.role === "PROFESSIONAL"
              ? values.profession || null
              : null,
          registration_number:
            values.role === "PROFESSIONAL"
              ? values.registrationNumber || null
              : null,
          vat_number:
            values.role === "PROFESSIONAL"
              ? values.vatNumber || null
              : null,
        },
      },
    });

    if (error) {
      console.error("Errore Supabase registrazione:", {
        message: error.message,
        status: error.status,
        code: error.code,
      });

      return NextResponse.json(
        {
          message:
            error.message || "Registrazione non riuscita.",
        },
        {
          status:
            typeof error.status === "number"
              ? error.status
              : 400,
        }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        {
          message:
            "Supabase non ha creato l’utente.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        email: data.user.email ?? values.email,
        userId: data.user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Errore API registrazione:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Il server non è riuscito a completare la registrazione.",
      },
      { status: 500 }
    );
  }
}