import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

import { getAiCareGuidance } from "@/lib/care-guidance/ai-guidance";
import { detectCareGuidanceRedFlags } from "@/lib/care-guidance/red-flags";
import { getRuleBasedCareGuidance } from "@/lib/care-guidance/rule-based-guidance";
import { trackCareGuidanceUse } from "@/lib/care-guidance/track-event";

type CareGuidanceRequest = {
  message?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Errore autenticazione assistenza personalizzata:", userError);
  }

  if (!user) {
    return NextResponse.json(
      { error: "Devi accedere come paziente per utilizzare questo servizio." },
      { status: 401 }
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
      "Errore verifica ruolo assistenza personalizzata:",
      accountProfileError
    );

    return NextResponse.json(
      { error: "Impossibile verificare il tuo account." },
      { status: 500 }
    );
  }

  if (accountProfile?.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Questo servizio è riservato ai pazienti registrati." },
      { status: 403 }
    );
  }

  let body: CareGuidanceRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Richiesta non valida.",
      },
      { status: 400 }
    );
  }

  const message = body.message?.trim();

  if (!message) {
    return NextResponse.json(
      {
        error: "Descrivi la tua esigenza.",
      },
      { status: 400 }
    );
  }

  if (message.length > 2000) {
    return NextResponse.json(
      {
        error: "La descrizione è troppo lunga.",
      },
      { status: 400 }
    );
  }

  const redFlagResult =
    detectCareGuidanceRedFlags(message);

  if (redFlagResult.urgent) {
    await trackCareGuidanceUse(user.id, "RED_FLAG");

    return NextResponse.json({
      type: "URGENT",
      result: {
        urgency: "URGENT",
        assistanceType: "Possibile urgenza sanitaria",
        summary:
          "Quello che hai descritto potrebbe richiedere una valutazione sanitaria urgente.",
        professionals: [],
        safetyMessage:
          "Non utilizzare FG Home Care per gestire una possibile emergenza. Contatta subito i servizi sanitari di emergenza o recati al pronto soccorso.",
      },
    });
  }

  const aiResult = await getAiCareGuidance(message);

  if (aiResult) {
    await trackCareGuidanceUse(user.id, "AI");
    console.log("Care Guidance source: AI");
    if (aiResult.urgency === "URGENT") {
      return NextResponse.json({
        type: "URGENT",
        source: "AI",
        result: {
          ...aiResult,
          safetyMessage:
            "Non utilizzare FG Home Care per gestire una possibile emergenza. Contatta subito i servizi sanitari di emergenza o recati al pronto soccorso.",
        },
      });
    }

    return NextResponse.json({
      type: "GUIDANCE",
      source: "AI",
      result: aiResult,
    });
  }

  const ruleBasedResult =
    getRuleBasedCareGuidance(message);

  if (ruleBasedResult) {
    await trackCareGuidanceUse(user.id, "RULE_BASED");
    console.log("Care Guidance source: RULE_BASED");
    return NextResponse.json({
      type: "GUIDANCE",
      source: "RULE_BASED",
      result: ruleBasedResult,
    });
  }

  await trackCareGuidanceUse(user.id, "NO_MATCH");

  return NextResponse.json({
    type: "NO_MATCH",
    result: null,
  });
}
