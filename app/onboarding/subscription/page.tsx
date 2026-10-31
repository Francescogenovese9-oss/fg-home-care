import LogoutButton from "@/components/auth/LogoutButton";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignupPlan } from "@/lib/subscriptions/paid-signup";
import { completePaidSignup } from "@/lib/subscriptions/complete-paid-signup";
import { isProfession } from "@/lib/professions";
import { isDoctorProfession } from "@/lib/subscriptions/direct-plan";
import SignupSubscriptionCheckout from "@/components/payments/SignupSubscriptionCheckout";

export default async function SignupSubscriptionPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const plan = getSignupPlan(user);
  if (!plan) redirect("/dashboard/professional");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "PROFESSIONAL") redirect("/login");
  if (await completePaidSignup(user)) redirect("/dashboard/professional/profile");
  const { data: professional } = await supabase.from("professional_profiles")
    .select("stripe_subscription_id, subscription_status").eq("user_id", user.id).maybeSingle();
  const { payment } = await searchParams;
  const profession = user.app_metadata.signup_profession;
  const existing = Boolean(professional?.stripe_subscription_id && ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"].includes(professional.subscription_status ?? ""));
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
    <div className="flex items-center justify-between gap-4"><Link href="/" className="font-bold text-blue-900">FG Home Care</Link><LogoutButton /></div>
    <p className="mt-8 text-sm font-semibold text-emerald-800">Email confermata · Ultimo passaggio della registrazione</p>
    <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Completa il tuo abbonamento {plan}</h1>
    <p className="mb-6 mt-3 leading-7 text-slate-600">Hai scelto un piano a pagamento. Completa il primo canone per accedere alla tua area professionale; poi potrai caricare i documenti per la verifica del profilo.</p>
    {payment === "success" || existing ? <div role="status" className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">Stiamo attendendo la conferma del pagamento da Stripe. Il ritorno su questa pagina non conferma da solo l’addebito. <Link href="/onboarding/subscription" className="font-bold underline">Verifica di nuovo</Link> tra qualche istante. Se il pagamento non è riuscito, usa il portale qui sotto.</div> : null}
    {payment === "canceled" ? <p role="status" className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">Checkout interrotto. La registrazione del piano a pagamento non è ancora completa: puoi riprendere da qui.</p> : null}
    <SignupSubscriptionCheckout plan={plan} doctor={typeof profession === "string" && isProfession(profession) && isDoctorProfession(profession)} existingSubscription={existing} />
    <p className="mt-6 text-sm leading-6 text-slate-600">Per assistenza, rettifica della qualifica o chiusura dell’account: <a className="text-blue-800 underline" href="mailto:info@fghomecare.it">info@fghomecare.it</a>. Puoi ritrovare questo passaggio accedendo con la tua email.</p>
  </main>;
}
