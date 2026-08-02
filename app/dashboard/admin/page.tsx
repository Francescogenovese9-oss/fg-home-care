import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
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

  if (profile?.role !== "ADMIN") {
    redirect("/dashboard/patient");
  }

  const { count: pendingCount } = await supabase
    .from("professional_profiles")
    .select("user_id", {
      count: "exact",
      head: true,
    })
    .eq("verification_status", "PENDING");

  const displayName =
    [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ") || "Amministratore";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Dashboard amministratore
            </h1>
          </div>

          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">
            Benvenuto
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {displayName}
          </h2>

          <p className="mt-3 max-w-2xl text-slate-600">
            Da questa area puoi verificare i
            professionisti, controllare i documenti e
            autorizzare la pubblicazione dei profili.
          </p>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-amber-700">
              In attesa
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900">
              {pendingCount ?? 0}
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Profili professionali da controllare.
            </p>

            <Link
              href="/dashboard/admin/professionals?status=PENDING"
              className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Verifica professionisti
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Utenti
            </p>

            <h3 className="mt-3 text-xl font-bold text-slate-900">
              Gestione account
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              La gestione completa degli account sarà
              aggiunta in uno sprint successivo.
            </p>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Piattaforma
            </p>

            <h3 className="mt-3 text-xl font-bold text-slate-900">
              Prenotazioni e servizi
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Qui saranno visualizzati i dati operativi
              della piattaforma.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}