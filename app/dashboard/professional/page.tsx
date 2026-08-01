import Link from "next/link";
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
            <p className="text-sm font-semibold text-blue-700">
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
          <p className="text-sm font-semibold text-blue-700">
            Benvenuto
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {displayName}
          </h2>

          <p className="mt-3 max-w-2xl text-slate-600">
            Gestisci il tuo profilo professionale, inserisci i
            servizi offerti, la disponibilità, la tariffa e il
            territorio in cui effettui assistenza domiciliare.
          </p>

          <Link
            href="/dashboard/professional/profile"
            className="mt-8 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
          >
            Completa il profilo professionale
          </Link>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Profilo
            </p>

            <h3 className="mt-2 text-xl font-bold text-slate-900">
              Dati professionali
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Inserisci professione, specializzazione, numero
              d’iscrizione all’albo, Partita IVA e descrizione
              delle tue esperienze.
            </p>

            <Link
              href="/dashboard/professional/profile"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Modifica profilo
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Disponibilità
            </p>

            <h3 className="mt-2 text-xl font-bold text-slate-900">
              Agenda e reperibilità
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Imposta i giorni e gli orari in cui sei disponibile
              per assistenza domiciliare o videoconsulto.
            </p>

            <span className="mt-5 inline-flex text-sm font-medium text-slate-400">
              Funzione in preparazione
            </span>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Prenotazioni
            </p>

            <h3 className="mt-2 text-xl font-bold text-slate-900">
              Richieste ricevute
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Qui potrai visualizzare, accettare o rifiutare le
              richieste di assistenza inviate dagli utenti.
            </p>

            <span className="mt-5 inline-flex text-sm font-medium text-slate-400">
              Funzione in preparazione
            </span>
          </article>
        </section>

        <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <h3 className="text-lg font-bold text-slate-900">
            Completa il profilo prima della pubblicazione
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Il profilo sarà visibile nella ricerca solo dopo il
            completamento dei dati e la verifica da parte di
            FG Home Care.
          </p>
        </section>
      </div>
    </main>
  );
}