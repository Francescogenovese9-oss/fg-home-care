import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";

export default async function ProfessionalDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "PROFESSIONAL") {
    redirect("/dashboard/patient");
  }

  const displayName =
    [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ") || "Professionista";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Dashboard professionista
            </h1>
          </div>

          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-blue-700">
            Benvenuto
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {displayName}
          </h2>

          <p className="mt-3 text-slate-600">
            Completa il tuo profilo e prepara la pubblicazione
            dei tuoi servizi.
          </p>
        </section>
      </div>
    </main>
  );
}