import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let email = "";
  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && "email" in body && typeof body.email === "string") {
      email = body.email.trim().toLowerCase();
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ message: "Inserisci un indirizzo email valido." }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      console.error("Errore reinvio codice registrazione:", error.message);
      if (error.status === 429 || /rate limit|security purposes|too many/i.test(error.message)) {
        return NextResponse.json({ message: "Hai richiesto troppi codici. Attendi qualche minuto e riprova." }, { status: 429 });
      }
      return NextResponse.json({ message: "Impossibile richiedere il reinvio al momento. Riprova più tardi." }, { status: 503 });
    }
    return NextResponse.json({ success: true, message: "Richiesta inviata. Controlla la posta in arrivo e lo spam." });
  } catch {
    return NextResponse.json({ message: "Impossibile elaborare la richiesta. Riprova." }, { status: 500 });
  }
}
