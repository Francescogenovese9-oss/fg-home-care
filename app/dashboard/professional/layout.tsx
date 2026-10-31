import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completePaidSignup, syncApprovedSignupSubscription } from "@/lib/subscriptions/complete-paid-signup";
import { getSignupPlan } from "@/lib/subscriptions/paid-signup";

export default async function ProfessionalLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (getSignupPlan(user)) {
    if (!await completePaidSignup(user)) redirect("/onboarding/subscription");
    try { await syncApprovedSignupSubscription(user.id); }
    catch (error) { console.error("Riconciliazione abbonamento dopo verifica:", error); }
    const { data: professional } = await supabase.from("professional_profiles").select("verification_status").eq("user_id", user.id).maybeSingle();
    if (professional && professional.verification_status !== "APPROVED") return <>
      <div className="mx-auto mt-6 max-w-6xl rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">Canone {getSignupPlan(user)} ricevuto. Completa il profilo e carica i documenti: la visibilità e le prenotazioni saranno disponibili dopo l’approvazione. Il canone decorre dal pagamento. Puoi gestire il rinnovo dalla sezione Abbonamento.</div>
      {children}
    </>;
  }
  return children;
}
