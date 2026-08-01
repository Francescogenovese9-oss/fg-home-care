import { redirect } from "next/navigation";

import ProfessionalProfileForm from "@/components/professional/ProfessionalProfileForm";
import { createClient } from "@/lib/supabase/server";

export default async function ProfessionalProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "PROFESSIONAL") {
    redirect("/dashboard/patient");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-700">
            FG Home Care
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Completa il tuo profilo
          </h1>

          <p className="mt-2 text-slate-600">
            Inserisci le informazioni professionali che saranno
            utilizzate nella tua scheda.
          </p>
        </div>

        <ProfessionalProfileForm />
      </div>
    </main>
  );
}