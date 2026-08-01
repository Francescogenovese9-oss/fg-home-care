import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";

export default async function PatientDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "PROFESSIONAL") {
    redirect("/dashboard/professional");
  }

  if (profile?.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  const displayName =
    [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ") || "Utente";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Dashboard paziente
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
            Da questa area potrai cercare professionisti,
            gestire le prenotazioni e controllare i tuoi
            appuntamenti.
          </p>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Cerca un professionista
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Trova infermieri, OSS, fisioterapisti e altri
              professionisti nella tua zona.
            </p>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Le mie prenotazioni
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Controlla gli appuntamenti programmati e quelli
              già completati.
            </p>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Il mio profilo
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Aggiorna i tuoi dati personali e le informazioni
              di contatto.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}