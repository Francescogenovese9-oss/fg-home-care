import Link from "next/link";

import ProfessionalCard from "@/components/professionals/ProfessionalCard";
import { createClient } from "@/lib/supabase/server";

const professionalsPerPage = 6;

type SortValue =
  | "recent"
  | "price-asc"
  | "price-desc";

type SearchParams = {
  profession?: string | string[];
  city?: string | string[];
  province?: string | string[];
  service?: string | string[];
  sort?: string | string[];
  page?: string | string[];
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

function getPositiveInteger(value: string) {
  const parsedValue = Number.parseInt(value, 10);

  if (
    Number.isNaN(parsedValue) ||
    parsedValue < 1
  ) {
    return 1;
  }

  return parsedValue;
}

function getSortValue(value: string): SortValue {
  if (
    value === "price-asc" ||
    value === "price-desc"
  ) {
    return value;
  }

  return "recent";
}

function createPageUrl(
  currentParams: {
    profession: string;
    city: string;
    province: string;
    service: string;
    sort: SortValue;
  },
  page: number
) {
  const params = new URLSearchParams();

  if (currentParams.profession) {
    params.set(
      "profession",
      currentParams.profession
    );
  }

  if (currentParams.city) {
    params.set("city", currentParams.city);
  }

  if (currentParams.province) {
    params.set(
      "province",
      currentParams.province
    );
  }

  if (currentParams.service) {
    params.set(
      "service",
      currentParams.service
    );
  }

  if (currentParams.sort !== "recent") {
    params.set("sort", currentParams.sort);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString
    ? `/professionisti?${queryString}`
    : "/professionisti";
}

export default async function ProfessionalsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const profession = getSingleValue(
    params.profession
  );

  const city = getSingleValue(params.city);

  const province = getSingleValue(
    params.province
  ).toUpperCase();

  const service = getSingleValue(
    params.service
  );

  const sort = getSortValue(
    getSingleValue(params.sort)
  );

  const requestedPage = getPositiveInteger(
    getSingleValue(params.page)
  );

  const supabase = await createClient();

  let query = supabase
    .from("public_professionals")
    .select("*", {
      count: "exact",
    });

  if (profession) {
    query = query.ilike(
      "profession",
      `%${profession}%`
    );
  }

  if (city) {
    query = query.ilike(
      "city",
      `%${city}%`
    );
  }

  if (province) {
    query = query.ilike(
      "province",
      `%${province}%`
    );
  }

  if (service === "home") {
    query = query.eq(
      "home_visits",
      true
    );
  }

  if (service === "video") {
    query = query.eq(
      "video_consultations",
      true
    );
  }

  if (sort === "price-asc") {
    query = query.order("hourly_rate", {
      ascending: true,
      nullsFirst: false,
    });
  } else if (sort === "price-desc") {
    query = query.order("hourly_rate", {
      ascending: false,
      nullsFirst: false,
    });
  } else {
    query = query.order("updated_at", {
      ascending: false,
    });
  }

  /*
   * Ordinamento secondario stabile.
   * Evita che profili con la stessa tariffa
   * cambino posizione tra una pagina e l'altra.
   */
  query = query.order("user_id", {
    ascending: true,
  });

  const countStart =
    (requestedPage - 1) *
    professionalsPerPage;

  const countEnd =
    countStart +
    professionalsPerPage -
    1;

  const {
    data,
    error,
    count,
  } = await query.range(
    countStart,
    countEnd
  );

  if (error) {
    console.error(
      "Errore ricerca professionisti:",
      error
    );
  }

  const totalProfessionals = count ?? 0;

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalProfessionals /
        professionalsPerPage
    )
  );

  /*
   * Se viene richiesta una pagina superiore
   * al totale, mostriamo l'ultima disponibile.
   */
  const currentPage = Math.min(
    requestedPage,
    totalPages
  );

  let professionalRows =
    (data ?? []) as PublicProfessional[];

  /*
   * Se l'URL chiedeva una pagina non esistente,
   * ripetiamo la query sull'ultima pagina.
   */
  if (
    requestedPage > totalPages &&
    totalProfessionals > 0
  ) {
    const correctedStart =
      (currentPage - 1) *
      professionalsPerPage;

    const correctedEnd =
      correctedStart +
      professionalsPerPage -
      1;

    let correctedQuery = supabase
      .from("public_professionals")
      .select("*");

    if (profession) {
      correctedQuery =
        correctedQuery.ilike(
          "profession",
          `%${profession}%`
        );
    }

    if (city) {
      correctedQuery =
        correctedQuery.ilike(
          "city",
          `%${city}%`
        );
    }

    if (province) {
      correctedQuery =
        correctedQuery.ilike(
          "province",
          `%${province}%`
        );
    }

    if (service === "home") {
      correctedQuery =
        correctedQuery.eq(
          "home_visits",
          true
        );
    }

    if (service === "video") {
      correctedQuery =
        correctedQuery.eq(
          "video_consultations",
          true
        );
    }

    if (sort === "price-asc") {
      correctedQuery =
        correctedQuery.order(
          "hourly_rate",
          {
            ascending: true,
            nullsFirst: false,
          }
        );
    } else if (
      sort === "price-desc"
    ) {
      correctedQuery =
        correctedQuery.order(
          "hourly_rate",
          {
            ascending: false,
            nullsFirst: false,
          }
        );
    } else {
      correctedQuery =
        correctedQuery.order(
          "updated_at",
          {
            ascending: false,
          }
        );
    }

    const {
      data: correctedData,
    } = await correctedQuery
      .order("user_id", {
        ascending: true,
      })
      .range(
        correctedStart,
        correctedEnd
      );

    professionalRows =
      (correctedData ??
        []) as PublicProfessional[];
  }

  const professionals =
    professionalRows.map(
      (professional) => {
        let avatarUrl: string | null =
          null;

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
    profession ||
      city ||
      province ||
      service
  );

  const firstResult =
    totalProfessionals === 0
      ? 0
      : (currentPage - 1) *
          professionalsPerPage +
        1;

  const lastResult = Math.min(
    currentPage *
      professionalsPerPage,
    totalProfessionals
  );

  const currentUrlParams = {
    profession,
    city,
    province,
    service,
    sort,
  };

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
            Professionisti verificati
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Trova assistenza sanitaria qualificata vicino a te
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Confronta profili, disponibilità e tariffe dei
            professionisti approvati da FG Home Care.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            action="/professionisti"
            method="get"
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-6"
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
                Servizio
              </label>

              <select
                id="service"
                name="service"
                defaultValue={service}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  Tutti
                </option>

                <option value="home">
                  Domiciliare
                </option>

                <option value="video">
                  Videoconsulto
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="sort"
                className="text-sm font-semibold text-slate-800"
              >
                Ordina per
              </label>

              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="recent">
                  Più recenti
                </option>

                <option value="price-asc">
                  Tariffa crescente
                </option>

                <option value="price-desc">
                  Tariffa decrescente
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
                Rimuovi filtri
              </Link>
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Risultati verificati
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Professionisti disponibili
              </h2>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700">
                {totalProfessionals}{" "}
                {totalProfessionals === 1
                  ? "professionista"
                  : "professionisti"}
              </p>

              {totalProfessionals > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Risultati {firstResult}–
                  {lastResult}
                </p>
              )}
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-8 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700"
            >
              Non è stato possibile caricare i
              professionisti.
            </div>
          ) : professionals.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h3 className="text-xl font-bold text-slate-900">
                Nessun professionista trovato
              </h3>

              <p className="mt-3 text-slate-600">
                Prova a modificare professione, città,
                provincia o servizio.
              </p>

              <Link
                href="/professionisti"
                className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Mostra tutti
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
                {professionals.map(
                  (professional) => (
                    <ProfessionalCard
                      key={
                        professional.user_id
                      }
                      professional={
                        professional
                      }
                    />
                  )
                )}
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label="Paginazione professionisti"
                  className="mt-10 flex flex-wrap items-center justify-center gap-3"
                >
                  {currentPage > 1 ? (
                    <Link
                      href={createPageUrl(
                        currentUrlParams,
                        currentPage - 1
                      )}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      ← Precedente
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
                      ← Precedente
                    </span>
                  )}

                  {Array.from(
                    {
                      length: totalPages,
                    },
                    (_, index) =>
                      index + 1
                  ).map((pageNumber) => (
                    <Link
                      key={pageNumber}
                      href={createPageUrl(
                        currentUrlParams,
                        pageNumber
                      )}
                      aria-current={
                        pageNumber ===
                        currentPage
                          ? "page"
                          : undefined
                      }
                      className={
                        pageNumber ===
                        currentPage
                          ? "flex h-10 min-w-10 items-center justify-center rounded-xl bg-blue-700 px-3 text-sm font-bold text-white"
                          : "flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      }
                    >
                      {pageNumber}
                    </Link>
                  ))}

                  {currentPage < totalPages ? (
                    <Link
                      href={createPageUrl(
                        currentUrlParams,
                        currentPage + 1
                      )}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Successiva →
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
                      Successiva →
                    </span>
                  )}
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}