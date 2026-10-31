"use client";

import Link from "next/link";
import ProfessionalPlanCard, { type ProfessionalPlan } from "@/components/payments/ProfessionalPlanCard";
import { DIRECT_TERMS_VERSION } from "@/lib/legal/versions";

import {
  useState,
} from "react";

type Props = {
  plan: "BASIC" | "PREMIUM" | "DIRECT";
  directPurchaseEnabled: boolean;
  pendingPaidPlan?: "PREMIUM" | "DIRECT" | null;
  profession?: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  verificationApproved: boolean;
};

export default function ProfessionalSubscriptionCard({
  plan,
  directPurchaseEnabled,
  pendingPaidPlan,
  profession,
  status,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  verificationApproved,
}: Props) {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");
  const [directTermsAccepted, setDirectTermsAccepted] = useState(false);

  const isDirect = plan === "DIRECT" && status === "active";
  const directDoctor = ["Medico chirurgo", "Medico di medicina generale / Medico di base", "Medico specialista"].includes(profession || "");

  const isPremium =
    plan === "PREMIUM" &&
    status === "active";

  const periodEndFormatted =
    currentPeriodEnd
      ? new Intl.DateTimeFormat(
          "it-IT",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }
        ).format(
          new Date(
            currentPeriodEnd
          )
        )
      : null;

  async function openStripe(
    endpoint: string
  ) {
    try {
      const directCheckout = endpoint === "/api/stripe/subscription/direct/checkout";
      if (directCheckout && !directTermsAccepted) {
        setError("Leggi e accetta le condizioni DIRECT prima di continuare.");
        return;
      }
      setLoading(true);
      setError("");

      const response =
        await fetch(
          endpoint,
          {
            method: "POST",
            ...(directCheckout ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ directTermsAccepted: true, directTermsVersion: DIRECT_TERMS_VERSION }),
            } : {}),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.url
      ) {
        throw new Error(
          data.message ||
            "Operazione non disponibile."
        );
      }

      window.location.href =
        data.url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Si è verificato un errore."
      );

      setLoading(false);
    }
  }

  const currentPlan: ProfessionalPlan = pendingPaidPlan || (isDirect ? "DIRECT" : isPremium ? "PREMIUM" : "BASIC");
  const paidPlanActive = Boolean(pendingPaidPlan) || isDirect || isPremium;
  const buttonClass = "rounded-xl bg-blue-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section aria-labelledby="subscription-plans-heading" className="mt-8 space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-700">Piani professionali</p>
        <h2 id="subscription-plans-heading" className="mt-2 text-2xl font-bold tracking-tight text-blue-950 sm:text-3xl">Scegli come far crescere la tua attività</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Confronta canoni, strumenti e commissioni. Il tuo piano attuale è <strong className="text-slate-900">{currentPlan}</strong>.</p>
      </div>
      {paidPlanActive && cancelAtPeriodEnd ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-semibold text-amber-900">Disdetta programmata</p>
        <p className="mt-2 text-sm leading-6 text-amber-800">Il piano {currentPlan} rimane attivo {periodEndFormatted ? `fino al ${periodEndFormatted}` : "fino alla fine del periodo già pagato"}.</p>
      </div> : null}
      {!verificationApproved ? <p className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">Puoi confrontare i piani. Visibilità e prenotazioni richiedono l’approvazione del profilo professionale. Nelle nuove registrazioni con Premium o DIRECT il canone viene pagato prima della verifica e decorre dal pagamento.</p> : null}
      {error ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      <div className="space-y-5">
        {(["BASIC", "PREMIUM", "DIRECT"] as ProfessionalPlan[]).map((option) => (
          <ProfessionalPlanCard key={option} plan={option} doctor={directDoctor} selected={currentPlan === option}
            badge={currentPlan === option ? "Piano attuale" : option === "PREMIUM" ? "Continuità e vantaggi" : option === "DIRECT" ? "Zero commissioni" : "Senza canone"}>
            {option === "BASIC" ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">{paidPlanActive ? "Per tornare a Basic, gestisci la disdetta del tuo abbonamento. I vantaggi restano disponibili fino alla scadenza prevista." : "Il tuo profilo utilizza Basic, senza canone mensile."}</p>
              <button type="button" className={`${buttonClass} shrink-0`} disabled={loading || !paidPlanActive}
                onClick={() => openStripe("/api/stripe/subscription/portal")}>{loading ? "Apertura…" : paidPlanActive ? "Gestisci il passaggio a Basic" : "Il tuo piano attuale"}</button>
            </div> : paidPlanActive ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">{currentPlan === option ? "Controlla rinnovo, metodo di pagamento e disdetta dal portale di fatturazione." : "Hai già un abbonamento attivo. Gestiscilo prima di sottoscrivere un altro piano."}</p>
              <button type="button" className={`${buttonClass} shrink-0`} disabled={loading}
                onClick={() => openStripe("/api/stripe/subscription/portal")}>{loading ? "Apertura…" : "Gestisci abbonamento"}</button>
            </div> : option === "PREMIUM" ? <div className="space-y-3">
              <p className="text-xs leading-5 text-slate-500">Canone base al netto dell’IVA eventualmente dovuta. Rinnovo automatico mensile, con disdetta dal portale di fatturazione. Totale e condizioni sono mostrati prima della conferma.</p>
              <button type="button" className={`${buttonClass} bg-indigo-700 hover:bg-indigo-800`} disabled={loading || !verificationApproved}
                onClick={() => openStripe("/api/stripe/subscription/checkout")}>{loading ? "Apertura…" : "Attiva Premium"}</button>
              <Link href="/termini-e-condizioni" target="_blank" rel="noopener noreferrer" className="ml-4 inline-block text-xs font-semibold text-indigo-800 underline">Termini del piano</Link>
            </div> : <div className="space-y-3">
              <p className="text-xs leading-5 text-slate-500">Canone base al netto dell’IVA eventualmente dovuta. Rinnovo automatico mensile; disdetta ordinaria a fine periodo. Totale mostrato prima della conferma in Stripe. Nessun numero minimo di prenotazioni garantito.</p>
              <label className="flex items-start gap-3 text-sm leading-6 text-slate-700" htmlFor="acceptDirectTerms">
                <input id="acceptDirectTerms" type="checkbox" checked={directTermsAccepted} onChange={(event) => setDirectTermsAccepted(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-emerald-800" />
                <span>Ho letto e accetto le <Link href="/condizioni-direct" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline">condizioni DIRECT</Link>, inclusi canone e rinnovo mensile. Ho preso visione dell’<Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-800 underline">Informativa Privacy</Link>. Confermerò l’abbonamento con obbligo di pagamento in Stripe.</span>
              </label>
              <button type="button" className={`${buttonClass} bg-emerald-800 hover:bg-emerald-900`} disabled={loading || !verificationApproved || !directPurchaseEnabled || !directTermsAccepted}
                onClick={() => openStripe("/api/stripe/subscription/direct/checkout")}>{loading ? "Apertura…" : directPurchaseEnabled ? "Attiva DIRECT" : "DIRECT non disponibile"}</button>
            </div>}
          </ProfessionalPlanCard>
        ))}
      </div>
    </section>
  );
}
