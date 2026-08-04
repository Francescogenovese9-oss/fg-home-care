import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};

type PublicProfessional = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;

  profession: string;
  specialization: string | null;
  bio: string | null;

  city: string | null;
  province: string | null;
  postal_code: string | null;

  service_radius_km: number;
  hourly_rate: number | null;

  available_weekdays: string[];
  available_from: string | null;
  available_to: string | null;

  home_visits: boolean;
  video_consultations: boolean;

  avatar_path: string | null;

  verification_status: "APPROVED";
  published: boolean;

  created_at: string;
  updated_at: string;
};

type PublicProfessionalWithAvatar =
  PublicProfessional & {
    avatarUrl: string | null;
  };

const weekdayLabels: Record<string, string> = {
  MONDAY: "Lunedì",
  TUESDAY: "Martedì",
  WEDNESDAY: "Mercoledì",
  THURSDAY: "Giovedì",
  FRIDAY: "Venerdì",
  SATURDAY: "Sabato",
  SUNDAY: "Domenica",
};

function getFullName(
  firstName: string | null,
  lastName: string | null
) {
  return (
    [firstName, lastName]
      .filter(Boolean)
      .join(" ") || "Professionista sanitario"
  );
}

function formatTime(value: string | null) {
  return value?.slice(0, 5) || "Non indicato";
}

function formatLocation(
  city: string | null,
  province: string | null,
  postalCode?: string | null
) {
  return (
    [city, province, postalCode]
      .filter(Boolean)
      .join(", ") || "Località non indicata"
  );
}

async function getProfessional(
  userId: string
): Promise<PublicProfessionalWithAvatar | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("public_professionals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Errore lettura professionista pubblico:",
      error
    );

    return null;
  }

  if (!data) {
    return null;
  }

  const professional =
    data as PublicProfessional;

  let avatarUrl: string | null = null;

  if (professional.avatar_path) {
    const {
      data: { publicUrl },
    } = supabase.storage
      .from("avatars")
      .getPublicUrl(
        professional.avatar_path
      );

    avatarUrl = publicUrl;
  }

  return {
    ...professional,
    avatarUrl,
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { userId } = await params;

  const professional =
    await getProfessional(userId);

  if (!professional) {
    return {
      title:
        "Professionista non trovato | FG Home Care",
      description:
        "Il profilo professionale richiesto non è disponibile.",
    };
  }

  const fullName = getFullName(
    professional.first_name,
    professional.last_name
  );

  const location = formatLocation(
    professional.city,
    professional.province
  );

  const description =
    professional.bio?.trim().slice(0, 155) ||
    `${professional.profession} disponibile a ${location} tramite FG Home Care.`;

  return {
    title: `${fullName} – ${professional.profession} | FG Home Care`,
    description,
  };
}

export default async function ProfessionalPublicPage({
  params,
}: PageProps) {
  const { userId } = await params;

  const professional =
    await getProfessional(userId);

  if (!professional) {
    notFound();
  }

  const fullName = getFullName(
    professional.first_name,
    professional.last_name
  );

  const location = formatLocation(
    professional.city,
    professional.province,
    professional.postal_code
  );

  const availableDays =
    professional.available_weekdays ?? [];

  const bookingUrl = `/professionisti/${professional.user_id}/prenota`;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-xl font-bold text-blue-900"
          >
            FG Home Care
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/professionisti"
              className="text-sm font-semibold text-slate-700 hover:text-blue-700"
            >
              Professionisti
            </Link>

            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-blue-700"
            >
              Accedi
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Registrati
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <Link
            href="/professionisti"
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            ← Torna ai professionisti
          </Link>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center">
            <div className="shrink-0">
              {professional.avatarUrl ? (
                <img
                  src={professional.avatarUrl}
                  alt={`Foto profilo di ${fullName}`}
                  className="h-40 w-40 rounded-3xl border-4 border-white object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-3xl border-4 border-white bg-blue-100 text-5xl font-bold text-blue-800 shadow-lg">
                  {fullName
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  {fullName}
                </h1>

                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  <span aria-hidden="true">
                    ✓
                  </span>
                  Professionista verificato
                </span>
              </div>

              <p className="mt-4 text-2xl font-semibold text-blue-700">
                {professional.profession}
              </p>

              {professional.specialization && (
                <p className="mt-2 text-lg text-slate-600">
                  {
                    professional.specialization
                  }
                </p>
              )}

              <p className="mt-4 text-slate-600">
                {location}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {professional.home_visits && (
                  <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
                    Assistenza domiciliare
                  </span>
                )}

                {professional.video_consultations && (
                  <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-800">
                    Videoconsulto
                  </span>
                )}
              </div>
            </div>

            <aside className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:max-w-sm">
              <p className="text-sm font-semibold text-slate-500">
                Tariffa indicativa
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {professional.hourly_rate !==
                null
                  ? `${Number(
                      professional.hourly_rate
                    ).toFixed(2)} €`
                  : "Da concordare"}
              </p>

              {professional.hourly_rate !==
                null && (
                <p className="mt-1 text-sm text-slate-500">
                  per ora
                </p>
              )}

              <Link
                href={bookingUrl}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
              >
                Richiedi assistenza
              </Link>

              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Accedi o registrati per
                inviare una richiesta al
                professionista.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Presentazione professionale
            </h2>

            <p className="mt-5 whitespace-pre-line leading-8 text-slate-600">
              {professional.bio ||
                "Il professionista non ha ancora inserito una descrizione dettagliata."}
            </p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Servizi disponibili
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <article
                className={
                  professional.home_visits
                    ? "rounded-2xl border border-green-200 bg-green-50 p-6"
                    : "rounded-2xl border border-slate-200 bg-slate-50 p-6 opacity-60"
                }
              >
                <h3 className="text-lg font-bold text-slate-900">
                  Assistenza domiciliare
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {professional.home_visits
                    ? "Disponibile per prestazioni e assistenza direttamente al domicilio dell’utente."
                    : "Il professionista non offre attualmente assistenza domiciliare."}
                </p>
              </article>

              <article
                className={
                  professional.video_consultations
                    ? "rounded-2xl border border-purple-200 bg-purple-50 p-6"
                    : "rounded-2xl border border-slate-200 bg-slate-50 p-6 opacity-60"
                }
              >
                <h3 className="text-lg font-bold text-slate-900">
                  Videoconsulto
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {professional.video_consultations
                    ? "Disponibile per consulenze e valutazioni professionali a distanza."
                    : "Il professionista non offre attualmente videoconsulti."}
                </p>
              </article>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Disponibilità settimanale
            </h2>

            {availableDays.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {availableDays.map(
                  (day) => (
                    <span
                      key={day}
                      className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
                    >
                      {weekdayLabels[day] ??
                        day}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="mt-5 text-slate-600">
                Nessun giorno specificato.
              </p>
            )}

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">
                Fascia oraria indicativa
              </p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {formatTime(
                  professional.available_from
                )}{" "}
                –{" "}
                {formatTime(
                  professional.available_to
                )}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Come funziona la richiesta
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <article className="rounded-2xl bg-slate-50 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                  1
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                  Scegli il servizio
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Seleziona assistenza
                  domiciliare o videoconsulto,
                  in base ai servizi disponibili.
                </p>
              </article>

              <article className="rounded-2xl bg-slate-50 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                  2
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                  Indica data e orario
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Scegli un giorno compatibile
                  con la disponibilità del
                  professionista.
                </p>
              </article>

              <article className="rounded-2xl bg-slate-50 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                  3
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                  Attendi la conferma
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  La richiesta sarà confermata
                  dopo l’accettazione da parte
                  del professionista.
                </p>
              </article>
            </div>

            <Link
              href={bookingUrl}
              className="mt-7 inline-flex rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800"
            >
              Inizia la richiesta
            </Link>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Area di intervento
            </h2>

            <dl className="mt-5 space-y-5">
              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Località principale
                </dt>

                <dd className="mt-1 font-semibold text-slate-900">
                  {location}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Raggio massimo
                </dt>

                <dd className="mt-1 font-semibold text-slate-900">
                  {
                    professional.service_radius_km
                  }{" "}
                  km
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Dettagli economici
            </h2>

            <dl className="mt-5 space-y-5">
              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Tariffa oraria
                </dt>

                <dd className="mt-1 text-xl font-bold text-slate-900">
                  {professional.hourly_rate !==
                  null
                    ? `${Number(
                        professional.hourly_rate
                      ).toFixed(2)} €`
                    : "Da concordare"}
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-xs leading-5 text-slate-500">
              La tariffa mostrata è
              indicativa. Eventuali costi
              aggiuntivi dovranno essere
              comunicati prima della conferma
              della prestazione.
            </p>
          </section>

          <section className="rounded-3xl border border-green-200 bg-green-50 p-6">
            <h2 className="text-lg font-bold text-green-900">
              Profilo verificato
            </h2>

            <p className="mt-3 text-sm leading-6 text-green-800">
              FG Home Care ha controllato i
              dati e i documenti professionali
              caricati dall’operatore.
            </p>
          </section>

          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <h2 className="text-lg font-bold text-blue-900">
              Hai bisogno di assistenza?
            </h2>

            <p className="mt-3 text-sm leading-6 text-blue-800">
              Invia una richiesta indicando il
              servizio, la data, l’orario e una
              breve descrizione delle tue
              esigenze.
            </p>

            <Link
              href={bookingUrl}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Invia una richiesta
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}