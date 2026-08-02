import Link from "next/link";

import ProfessionalCard from "@/components/professionals/ProfessionalCard";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  profession?: string | string[];
  city?: string | string[];
  province?: string | string[];
  service?: string | string[];
};

type PageProps = {
  searchParams: Promise<SearchParams>;
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

function getSingleValue(
  value: string | string[] | undefined
) {
  return Array.isArray(value)
    ? value[0]?.trim() ?? ""
    : value?.trim() ?? "";
}

export default async function ProfessionalsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const profession = getSingleValue(
    params.profession
  );

  const city = getSingleValue(params.city);
  const province = getSingleValue(params.province)
    .toUpperCase();

  const service = getSingleValue(params.service);

  const supabase = await createClient();

  let query = supabase
    .from("public_professionals")
    .select("*")
    .order("updated_at", {
      ascending: false,
    });

  if (profession) {
    query = query.ilike(
      "profession",
      `%${profession}%`
    );
  }

  if (city) {
    query = query.ilike("city", `%${city}%`);
  }

  if (province) {
    query = query.ilike(
      "province",
      `%${province}%`
    );
  }

  if (service === "home") {
    query = query.eq("home_visits", true);
  }

  if (service === "video") {
    query = query.eq(
      "video_consultations",
      true
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "Errore ricerca professionisti:",
      error
    );
  }

  const professionalRows =
    (data ?? []) as PublicProfessional[];

  const professionals = professionalRows.map(
    (professional) => {
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
  );

  const hasActiveFilters = Boolean(
    profession || city || province || service
  );

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
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-blue-700"
            >
              Accedi
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Registrati
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b bg-gradient-to-b from-blue-50 to-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-sm font-semibold text-blue-700">
            Assistenza sanitaria domiciliare
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Trova il professionista sanitario più adatto
            alle tue esigenze
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Cerca professionisti verificati disponibili per
            assistenza domiciliare e videoconsulti.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            action="/professionisti"
            method="get"
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-5"
          >
            <div className="space-y-2">
              <label
                htmlFor="profession"
                className="text-sm font-semibold text-slate-800"
              >
                Professione
              </label>

              <input
                id="profession"
                name="profession"
                type="text"
                defaultValue={profession}
                placeholder="Es. Infermiere"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="city"
                className="text-sm font-semibold text-slate-800"
              >
                Città
              </label>

              <input
                id="city"
                name="city"
                type="text"
                defaultValue={city}
                placeholder="Es. Cosenza"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="province"
                className="text-sm font-semibold text-slate-800"
              >
                Provincia
              </label>

              <input
                id="province"
                name="province"
                type="text"
                maxLength={2}
                defaultValue={province}
                placeholder="Es. CS"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="service"
                className="text-sm font-semibold text-slate-800"
              >
                Tipo di servizio
              </label>

              <select
                id="service"
                name="service"
                defaultValue={service}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  Tutti i servizi
                </option>

                <option value="home">
                  Assistenza domiciliare
                </option>

                <option value="video">
                  Videoconsulto
                </option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Cerca
              </button>
            </div>
          </form>

          {hasActiveFilters && (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <Link
                href="/professionisti"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                Rimuovi tutti i filtri
              </Link>
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Risultati
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Professionisti disponibili
              </h2>
            </div>

            <p className="text-sm text-slate-600">
              {professionals.length}{" "}
              {professionals.length === 1
                ? "professionista trovato"
                : "professionisti trovati"}
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-8 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700"
            >
              Non è stato possibile caricare i
              professionisti. Controlla la vista pubblica
              e i permessi Supabase.
            </div>
          ) : professionals.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h3 className="text-xl font-bold text-slate-900">
                Nessun professionista trovato
              </h3>

              <p className="mt-3 text-slate-600">
                Prova a modificare città, professione o
                tipo di servizio.
              </p>

              <Link
                href="/professionisti"
                className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Mostra tutti
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {professionals.map((professional) => (
                <ProfessionalCard
                  key={professional.user_id}
                  professional={professional}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}