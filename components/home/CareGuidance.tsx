"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CareGuidanceResult } from "@/lib/care-guidance/types";

type ApiResponse = {
  type?: "URGENT" | "GUIDANCE" | "NO_MATCH";
  result?: CareGuidanceResult | null;
  error?: string;
};

export default function CareGuidance() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [patientCity, setPatientCity] = useState("");
  const [result, setResult] = useState<CareGuidanceResult | null>(null);
  const [responseType, setResponseType] = useState<ApiResponse["type"]>();
  const [authStatus, setAuthStatus] = useState<
    "CHECKING" | "ANONYMOUS" | "PATIENT" | "OTHER"
  >("CHECKING");

  useEffect(() => {
    const supabase = createClient();

    async function loadAuthStatus() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAuthStatus("ANONYMOUS");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, city")
        .eq("id", user.id)
        .maybeSingle();

      setPatientCity(profile?.role === "PATIENT" ? profile.city?.trim() || "" : "");
      setAuthStatus(profile?.role === "PATIENT" ? "PATIENT" : "OTHER");
    }

    void loadAuthStatus();
  }, []);


  async function handleSubmit() {
    const value = message.trim();

    if (!value) {
      setError("Descrivi prima la tua esigenza.");
      return;
    }

    if (authStatus === "CHECKING") {
      setError("Sto verificando il tuo account. Riprova tra un momento.");
      return;
    }

    if (authStatus === "ANONYMOUS") {
      setError("");
      setShowAuthPrompt(true);
      return;
    }

    if (authStatus !== "PATIENT") {
      setShowAuthPrompt(false);
      setError("Questo servizio è riservato ai pazienti registrati.");
      return;
    }

    setShowAuthPrompt(false);

    setError("");
    setResult(null);
    setResponseType(undefined);
    setIsLoading(true);

    try {
      const response = await fetch("/api/care-guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value }),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(data.error ?? "Non è stato possibile analizzare la richiesta.");
        return;
      }

      setResponseType(data.type);
      setResult(data.result ?? null);
    } catch {
      setError("Si è verificato un errore. Riprova tra poco.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm md:p-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Assistenza personalizzata
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
              Dicci di cosa hai bisogno
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
              Descrivi la tua esigenza o i sintomi che stai riscontrando.
              FG Home Care ti aiuta a individuare il tipo di assistenza e i
              professionisti più indicati.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-3xl">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Es. Ho dolore alla schiena da alcuni giorni oppure mia madre ha bisogno di assistenza dopo un intervento..."
              className="w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              type="button"
              className="mt-4 w-full rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
            >
              {isLoading ? "Sto analizzando..." : "Scopri chi può aiutarti"}
            </button>

            {showAuthPrompt && <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5"><h3 className="text-lg font-bold text-slate-900">Scopri chi può aiutarti</h3><p className="mt-2 text-sm leading-6 text-slate-700">Registrati come paziente per usare gratuitamente questo servizio. Registrazione e utilizzo di FG Home Care sono gratuiti per i pazienti.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><a href="/register" className="rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white">Registrati gratis</a><a href="/login" className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-center text-sm font-semibold text-blue-700">Accedi</a></div></div>}

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {responseType === "URGENT" && result && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                <h3 className="text-lg font-bold text-red-800">
                  {result.assistanceType}
                </h3>
                <p className="mt-2 text-sm leading-6 text-red-800">
                  {result.summary}
                </p>
                {result.safetyMessage && (
                  <p className="mt-3 text-sm font-semibold leading-6 text-red-900">
                    {result.safetyMessage}
                  </p>
                )}
              </div>
            )}

            {responseType === "GUIDANCE" && result && (
              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="text-lg font-bold text-slate-900">
                  {result.assistanceType}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {result.summary}
                </p>

                <div className="mt-4 space-y-3">
                  {result.professionals.map((professional) => (
                    <a
                      key={professional.profession + "|" + (professional.specialization || "")}
                        href={`/professionisti?profession=${encodeURIComponent(professional.profession === "Medico specialista" && professional.specialization ? professional.specialization : professional.profession)}${patientCity ? "&city=" + encodeURIComponent(patientCity) : ""}&source=care`}
                      className="block rounded-xl border border-blue-100 bg-white p-4 transition hover:border-blue-300"
                    >
                        <p className="font-semibold text-blue-700">
                          {professional.specialization
                            ? professional.profession + " - " + professional.specialization
                            : professional.profession}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {professional.reason}
                        </p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {responseType === "NO_MATCH" && (
              <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                Non siamo riusciti a individuare automaticamente il professionista più adatto. Prova a descrivere meglio la tua esigenza o i sintomi.
              </p>
            )}

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Assistenza personalizzata gratuita per i pazienti registrati.
              FG Home Care non formula diagnosi e non sostituisce il parere di
              un professionista sanitario. In caso di emergenza, rivolgiti ai
              servizi sanitari di emergenza.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
