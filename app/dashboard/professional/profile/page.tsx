import { redirect } from "next/navigation";

import ProfessionalDocumentsForm from "@/components/professionals/ProfessionalDocumentsForm";
import ProfessionalProfileForm from "@/components/professionals/ProfessionalProfileForm";
import { createClient } from "@/lib/supabase/server";

export default async function ProfessionalProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Errore lettura ruolo professionista:",
      profileError
    );
  }

  if (profile?.role !== "PROFESSIONAL") {
    redirect("/dashboard/patient");
  }

  const { data: professionalProfile } = await supabase
    .from("professional_profiles")
    .select("profession")
    .eq("user_id", user.id)
    .maybeSingle();
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <a
            href="/dashboard/professional"
            className="mb-5 inline-flex items-center text-sm font-semibold text-slate-600 transition hover:text-blue-700"
          >
            ← Indietro
          </a>

          <p className="text-sm font-semibold text-blue-700">
            FG Home Care
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Completa il tuo profilo professionale
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Inserisci i dati professionali, le aree in cui operi,
            la disponibilità, la tariffa e i documenti necessari
            per la verifica del profilo.
          </p>
        </div>

        <div className="space-y-8">
          <ProfessionalProfileForm />

          <ProfessionalDocumentsForm
            profession={professionalProfile?.profession ?? null}
          />
        </div>
      </div>
    </main>
  );
}