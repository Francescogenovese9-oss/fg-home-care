"use client";
import { useState } from "react";
import Link from "next/link";
import ProfessionalPlanCard from "./ProfessionalPlanCard";
import type { PaidSignupPlan } from "@/lib/subscriptions/paid-signup";
import { TERMS_VERSION, DIRECT_TERMS_VERSION } from "@/lib/legal/versions";

export default function SignupSubscriptionCheckout({ plan, doctor, existingSubscription }: {
  plan: PaidSignupPlan; doctor: boolean; existingSubscription: boolean;
}) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    setLoading(true); setError("");
    try {
      const endpoint = existingSubscription ? "/api/stripe/subscription/portal" : plan === "DIRECT" ? "/api/stripe/subscription/direct/checkout" : "/api/stripe/subscription/checkout";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupTermsAccepted: accepted, signupTermsVersion: TERMS_VERSION,
          directTermsAccepted: accepted, directTermsVersion: DIRECT_TERMS_VERSION }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.message || "Impossibile aprire il pagamento. Riprova.");
      window.location.assign(result.url);
    } catch (err) { setError(err instanceof Error ? err.message : "Pagamento non disponibile. Riprova."); setLoading(false); }
  }
  return <ProfessionalPlanCard plan={plan} doctor={doctor} selected badge="Il piano che hai scelto">
    <p className="text-sm leading-6 text-slate-700">Il primo canone viene addebitato alla conferma del pagamento e l’abbonamento si rinnova ogni mese fino alla disdetta. La verifica dei documenti è successiva: il pagamento non equivale all’approvazione del profilo. Il prezzo della prestazione è separato dal canone. IVA eventualmente dovuta e totale sono indicati nel Checkout prima dell’ordine.</p>
    {existingSubscription ? <p className="mt-3 text-sm text-slate-600">C’è già un abbonamento associato al tuo account. Gestiscilo nel portale senza crearne un secondo, poi torna qui e verifica la conferma del pagamento.</p> : <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-slate-700">
      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={accepted} onChange={event => setAccepted(event.target.checked)} />
      <span>Ho letto e accetto i <Link href="/termini-e-condizioni" target="_blank" className="font-semibold text-blue-800 underline">Termini e condizioni</Link>{plan === "DIRECT" ? <> e le <Link href="/condizioni-direct" target="_blank" className="font-semibold text-blue-800 underline">Condizioni DIRECT</Link></> : null}, compresi canone dalla data di pagamento, rinnovo mensile e verifica professionale successiva.</span>
    </label>}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    <button type="button" onClick={checkout} disabled={loading || (!existingSubscription && !accepted)} className="mt-4 w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Apertura del pagamento…" : existingSubscription ? "Gestisci il pagamento esistente" : "Continua al pagamento dell’abbonamento"}</button>
  </ProfessionalPlanCard>;
}
