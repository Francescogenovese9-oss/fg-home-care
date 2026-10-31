import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validations/register";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PAID_SIGNUP_VERSION } from "@/lib/subscriptions/paid-signup";
import { TERMS_VERSION } from "@/lib/legal/versions";

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
    if (values.role === "PROFESSIONAL" && values.subscriptionPlan === "DIRECT" && process.env.FG_DIRECT_PLAN_ENABLED !== "true") {
      return NextResponse.json({ message: "DIRECT è in fase di collaudo e non è ancora disponibile per nuove registrazioni." }, { status: 503 });
    }
    const supabase = await createClient();

    const registrationStarted = Date.now();
    const { data, error } = await supabase.auth.signUp({
      email: values.email.trim().toLowerCase(),
      password: values.password,
      options: {
        data: {
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
          first_name: values.firstName,
          last_name: values.lastName,
          role: values.role,
            city: values.role === "PATIENT" ? values.city || null : null,
            province: values.role === "PATIENT" ? values.province || null : null,
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
          requested_subscription_plan: values.role === "PROFESSIONAL" ? values.subscriptionPlan || "BASIC" : null,
          subscription_plan:
            values.role === "PROFESSIONAL"
              ? "BASIC"
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

    // Never change an existing account returned by duplicate-signup protection.
    // This server-only marker applies solely to newly created paid signups.
    if (values.role === "PROFESSIONAL" && (values.subscriptionPlan === "PREMIUM" || values.subscriptionPlan === "DIRECT") &&
        data.user.identities?.length && Date.parse(data.user.created_at) >= registrationStarted - 1000) {
      const { error: setupError } = await getSupabaseAdmin().auth.admin.updateUserById(data.user.id, {
        app_metadata: { ...data.user.app_metadata, signup_subscription_version: PAID_SIGNUP_VERSION,
          signup_subscription_plan: values.subscriptionPlan, signup_profession: values.profession },
      });
      if (setupError) throw new Error("Impossibile preparare il pagamento dell’abbonamento. Contatta l’assistenza.");
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
