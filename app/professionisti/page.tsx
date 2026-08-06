import type { Metadata } from "next";
import Link from "next/link";

import ProfessionalCard from "@/components/professionals/ProfessionalCard";
import ProfessionalsPagination from "@/components/professionals/ProfessionalsPagination";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title:
    "Professionisti sanitari domiciliari | FG Home Care",
  description:
    "Trova infermieri, OSS, fisioterapisti e altri professionisti sanitari verificati disponibili per assistenza domiciliare e videoconsulti.",
  alternates: {
    canonical: "/professionisti",
  },
  openGraph: {
    title:
      "Professionisti sanitari domiciliari | FG Home Care",
    description:
      "Cerca professionisti sanitari verificati disponibili nella tua zona.",
    type: "website",
    siteName: "FG Home Care",
  },
  twitter: {
    card: "summary",
    title:
      "Professionisti sanitari domiciliari | FG Home Care",
    description:
      "Trova professionisti sanitari verificati disponibili per assistenza domiciliare e videoconsulti.",
  },
};

type SearchParams = {
  query?: string | string[];
  profession?: string | string[];
  city?: string | string[];
  province?: string | string[];
  service?: string | string[];
  maxRate?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

type PublicProfessionalRecord = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;

  profession: string;
  specialization: string | null;
  bio: string | null;

  city: string | null;
  province: string | null;

  hourly_rate: number | null;
  service_radius_km: number;

  home_visits: boolean;
  video_consultations: boolean;

  available_weekdays: string[] | null;
  avatar_path: string | null;

  updated_at: string;
};

type ProfessionalCardData = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;

  profession: string;
  specialization: string | null;
  bio: string | null;

  city: string | null;
  province: string | null;

  hourly_rate: number | null;
  service_radius_km: number;

  home_visits: boolean;
  video_consultations: boolean;

  available_weekdays: string[];
  avatarUrl: string | null;
};

const PROFESSIONALS_PER_PAGE = 9;

const serviceOptions = [
  {
    value: "",
    label: "Tutti i servizi",
  },
  {
    value: "HOME_VISIT",
    label: "Assistenza domiciliare",
  },
  {
    value: "VIDEO_CONSULTATION",
    label: "Videoconsulto",
  },
];

const sortingOptions = [
  {
    value: "recent",
    label: "Più recenti",
  },
  {
    value: "price-asc",
    label: "Tariffa crescente",
  },
  {
    value: "price-desc",
    label: "Tariffa decrescente",
  },
  {
    value: "name-asc",
    label: "Nome A–Z",
  },
];

function getSingleValue(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizePage(value: string) {
  const parsedPage = Number.parseInt(value, 10);

  if (
    !Number.isFinite(parsedPage) ||
    parsedPage < 1
  ) {
    return 1;
  }

  return parsedPage;
}

function normalizeMaximumRate(value: string) {
  if (!value) {
    return null;
  }

  const parsedRate = Number(value);

  if (
    !Number.isFinite(parsedRate) ||
    parsedRate < 0
  ) {
    return null;
  }

  return parsedRate;
}

function sanitizeSearchTerm(value: string) {
  return value
    .replaceAll(",", " ")
    .replaceAll("(", " ")
    .replaceAll(")", " ")
    .trim();
}

function createPageUrl(
  currentParameters: URLSearchParams,
  page: number
) {
  const parameters = new URLSearchParams(
    currentParameters
  );

  if (page <= 1) {
    parameters.delete("page");
  } else {
    parameters.set("page", String(page));
  }

  const queryString = parameters.toString();

  return queryString
    ? `/professionisti?${queryString}`
    : "/professionisti";
}

function createRemoveFilterUrl(
  currentParameters: URLSearchParams,
  filterName: string
) {
  const parameters = new URLSearchParams(
    currentParameters
  );

  parameters.delete(filterName);
  parameters.delete("page");

  const queryString = parameters.toString();

  return queryString
    ? `/professionisti?${queryString}`
    : "/professionisti";
}

export default async function ProfessionalsPage({
  searchParams,
}: PageProps) {
  const parameters = await searchParams;

  const query = normalizeText(
    getSingleValue(parameters.query)
  );

  const profession = normalizeText(
    getSingleValue(parameters.profession)
  );

  const city = normalizeText(
    getSingleValue(parameters.city)
  );

  const province = normalizeText(
    getSingleValue(parameters.province)
  ).toUpperCase();

  const service = getSingleValue(
    parameters.service
  );

  const maximumRate = normalizeMaximumRate(
    getSingleValue(parameters.maxRate)
  );

  const sort =
    getSingleValue(parameters.sort) ||
    "recent";

  const requestedPage = normalizePage(
    getSingleValue(parameters.page)
  );

  const currentUrlParameters =
    new URLSearchParams();

  if (query) {
    currentUrlParameters.set(
      "query",
      query
    );
  }

  if (profession) {
    currentUrlParameters.set(
      "profession",
      profession
    );
  }

  if (city) {
    currentUrlParameters.set(
      "city",
      city
    );
  }

  if (province) {
    currentUrlParameters.set(
      "province",
      province
    );
  }

  if (service) {
    currentUrlParameters.set(
      "service",
      service
    );
  }

  if (maximumRate !== null) {
    currentUrlParameters.set(
      "maxRate",
      String(maximumRate)
    );
  }

  if (sort && sort !== "recent") {
    currentUrlParameters.set(
      "sort",
      sort
    );
  }

  const supabase = await createClient();

  let professionalsQuery = supabase
    .from("public_professionals")
    .select(
      `
        user_id,
        first_name,
        last_name,
        profession,
        specialization,
        bio,
        city,
        province,
        hourly_rate,
        service_radius_km,
        home_visits,
        video_consultations,
        available_weekdays,
        avatar_path,
        updated_at
      `,
      {
        count: "exact",
      }
    );

  if (query) {
    const sanitizedQuery =
      sanitizeSearchTerm(query);

    if (sanitizedQuery) {
      professionalsQuery =
        professionalsQuery.or(
          [
            `first_name.ilike.%${sanitizedQuery}%`,
            `last_name.ilike.%${sanitizedQuery}%`,
            `profession.ilike.%${sanitizedQuery}%`,
            `specialization.ilike.%${sanitizedQuery}%`,
            `bio.ilike.%${sanitizedQuery}%`,
            `city.ilike.%${sanitizedQuery}%`,
            `province.ilike.%${sanitizedQuery}%`,
          ].join(",")
        );
    }
  }

  if (profession) {
    professionalsQuery =
      professionalsQuery.ilike(
        "profession",
        `%${profession}%`
      );
  }

  if (city) {
    professionalsQuery =
      professionalsQuery.ilike(
        "city",
        `%${city}%`
      );
  }

  if (province) {
    professionalsQuery =
      professionalsQuery.ilike(
        "province",
        province
      );
  }

  if (service === "HOME_VISIT") {
    professionalsQuery =
      professionalsQuery.eq(
        "home_visits",
        true
      );
  }

  if (
    service === "VIDEO_CONSULTATION"
  ) {
    professionalsQuery =
      professionalsQuery.eq(
        "video_consultations",
        true
      );
  }

  if (maximumRate !== null) {
    professionalsQuery =
      professionalsQuery.lte(
        "hourly_rate",
        maximumRate
      );
  }

  switch (sort) {
    case "price-asc":
      professionalsQuery =
        professionalsQuery
          .order("hourly_rate", {
            ascending: true,
            nullsFirst: false,
          })
          .order("user_id", {
            ascending: true,
          });
      break;

    case "price-desc":
      professionalsQuery =
        professionalsQuery
          .order("hourly_rate", {
            ascending: false,
            nullsFirst: false,
          })
          .order("user_id", {
            ascending: true,
          });
      break;

    case "name-asc":
      professionalsQuery =
        professionalsQuery
          .order("last_name", {
            ascending: true,
            nullsFirst: false,
          })
          .order("first_name", {
            ascending: true,
            nullsFirst: false,
          })
          .order("user_id", {
            ascending: true,
          });
      break;

    default:
      professionalsQuery =
        professionalsQuery
          .order("updated_at", {
            ascending: false,
          })
          .order("user_id", {
            ascending: true,
          });
      break;
  }

  /*
   * Eseguiamo inizialmente la query con la pagina
   * richiesta. Se la pagina supera il totale,
   * ripeteremo la lettura usando l’ultima pagina.
   */
  const requestedStart =
    (requestedPage - 1) *
    PROFESSIONALS_PER_PAGE;

  const requestedEnd =
    requestedStart +
    PROFESSIONALS_PER_PAGE -
    1;

  const {
    data: initialProfessionalsData,
    count,
    error: initialProfessionalsError,
  } = await professionalsQuery.range(
    requestedStart,
    requestedEnd
  );

  if (initialProfessionalsError) {
    console.error(
      "Errore caricamento professionisti:",
      {
        message:
          initialProfessionalsError.message,
        code: initialProfessionalsError.code,
        details:
          initialProfessionalsError.details,
        hint: initialProfessionalsError.hint,
      }
    );
  }

  const totalProfessionals = count ?? 0;

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalProfessionals /
        PROFESSIONALS_PER_PAGE
    )
  );

  const currentPage = Math.min(
    requestedPage,
    totalPages
  );

  let professionalsData =
    initialProfessionalsData;

  let professionalsError =
    initialProfessionalsError;

  /*
   * Se è stato richiesto un numero di pagina troppo
   * alto, recuperiamo automaticamente l’ultima pagina.
   */
  if (
    !initialProfessionalsError &&
    requestedPage > totalPages &&
    totalProfessionals > 0
  ) {
    const lastPageStart =
      (totalPages - 1) *
      PROFESSIONALS_PER_PAGE;

    const lastPageEnd =
      lastPageStart +
      PROFESSIONALS_PER_PAGE -
      1;

    let lastPageQuery = supabase
      .from("public_professionals")
      .select(
        `
          user_id,
          first_name,
          last_name,
          profession,
          specialization,
          bio,
          city,
          province,
          hourly_rate,
          service_radius_km,
          home_visits,
          video_consultations,
          available_weekdays,
          avatar_path,
          updated_at
        `
      );

    if (query) {
      const sanitizedQuery =
        sanitizeSearchTerm(query);

      if (sanitizedQuery) {
        lastPageQuery = lastPageQuery.or(
          [
            `first_name.ilike.%${sanitizedQuery}%`,
            `last_name.ilike.%${sanitizedQuery}%`,
            `profession.ilike.%${sanitizedQuery}%`,
            `specialization.ilike.%${sanitizedQuery}%`,
            `bio.ilike.%${sanitizedQuery}%`,
            `city.ilike.%${sanitizedQuery}%`,
            `province.ilike.%${sanitizedQuery}%`,
          ].join(",")
        );
      }
    }

    if (profession) {
      lastPageQuery =
        lastPageQuery.ilike(
          "profession",
          `%${profession}%`
        );
    }

    if (city) {
      lastPageQuery =
        lastPageQuery.ilike(
          "city",
          `%${city}%`
        );
    }

    if (province) {
      lastPageQuery =
        lastPageQuery.ilike(
          "province",
          province
        );
    }

    if (service === "HOME_VISIT") {
      lastPageQuery = lastPageQuery.eq(
        "home_visits",
        true
      );
    }

    if (
      service === "VIDEO_CONSULTATION"
    ) {
      lastPageQuery = lastPageQuery.eq(
        "video_consultations",
        true
      );
    }

    if (maximumRate !== null) {
      lastPageQuery = lastPageQuery.lte(
        "hourly_rate",
        maximumRate
      );
    }

    switch (sort) {
      case "price-asc":
        lastPageQuery = lastPageQuery
          .order("hourly_rate", {
            ascending: true,
            nullsFirst: false,
          })
          .order("user_id", {
            ascending: true,
          });
        break;

      case "price-desc":
        lastPageQuery = lastPageQuery
          .order("hourly_rate", {
            ascending: false,
            nullsFirst: false,
          })
          .order("user_id", {
            ascending: true,
          });
        break;

      case "name-asc":
        lastPageQuery = lastPageQuery
          .order("last_name", {
            ascending: true,
            nullsFirst: false,
          })
          .order("first_name", {
            ascending: true,
            nullsFirst: false,
          })
          .order("user_id", {
            ascending: true,
          });
        break;

      default:
        lastPageQuery = lastPageQuery
          .order("updated_at", {
            ascending: false,
          })
          .order("user_id", {
            ascending: true,
          });
        break;
    }

    const {
      data: lastPageData,
      error: lastPageError,
    } = await lastPageQuery.range(
      lastPageStart,
      lastPageEnd
    );

    professionalsData = lastPageData;
    professionalsError = lastPageError;

    if (lastPageError) {
      console.error(
        "Errore caricamento ultima pagina:",
        lastPageError
      );
    }
  }

  const professionalRecords =
    (professionalsData ??
      []) as PublicProfessionalRecord[];

  const professionals: ProfessionalCardData[] =
    professionalRecords.map(
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
          user_id: professional.user_id,
          first_name:
            professional.first_name,
          last_name:
            professional.last_name,

          profession:
            professional.profession,
          specialization:
            professional.specialization,
          bio: professional.bio,

          city: professional.city,
          province:
            professional.province,

          hourly_rate:
            professional.hourly_rate,
          service_radius_km:
            professional.service_radius_km,

          home_visits:
            professional.home_visits,
          video_consultations:
            professional.video_consultations,

          available_weekdays:
            professional.available_weekdays ??
            [],

          avatarUrl,
        };
      }
    );

  const activeFiltersCount = [
    query,
    profession,
    city,
    province,
    service,
    maximumRate !== null
      ? String(maximumRate)
      : "",
  ].filter(Boolean).length;

  const firstDisplayedResult =
    totalProfessionals === 0
      ? 0
      : (currentPage - 1) *
          PROFESSIONALS_PER_PAGE +
        1;

  const lastDisplayedResult = Math.min(
    currentPage *
      PROFESSIONALS_PER_PAGE,
    totalProfessionals
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

          <nav className="flex flex-wrap items-center gap-4">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Home
            </Link>

            <Link
              href="/login"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
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
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            La salute a casa tua
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Trova il professionista sanitario
            adatto alle tue esigenze
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Cerca professionisti verificati
            disponibili per assistenza
            domiciliare e videoconsulti nella
            tua zona.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
              Professionisti verificati
            </span>

            <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              Prenotazione online
            </span>

            <span className="rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700">
              Assistenza e videoconsulto
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Ricerca avanzata
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Filtra i professionisti
              </h2>
            </div>

            {activeFiltersCount > 0 && (
              <Link
                href="/professionisti"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Azzera filtri
              </Link>
            )}
          </div>

          <form
            action="/professionisti"
            method="get"
            className="mt-6 space-y-5"
          >
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2 lg:col-span-2">
                <label
                  htmlFor="query"
                  className="text-sm font-semibold text-slate-800"
                >
                  Nome, professione o
                  specializzazione
                </label>

                <input
                  id="query"
                  name="query"
                  type="search"
                  defaultValue={query}
                  placeholder="Es. infermiere, fisioterapista, Mario Rossi"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  {serviceOptions.map(
                    (option) => (
                      <option
                        key={
                          option.value ||
                          "all"
                        }
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="maxRate"
                  className="text-sm font-semibold text-slate-800"
                >
                  Tariffa massima oraria
                </label>

                <input
                  id="maxRate"
                  name="maxRate"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={
                    maximumRate ?? ""
                  }
                  placeholder="Es. 50"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="sort"
                  className="text-sm font-semibold text-slate-800"
                >
                  Ordina risultati
                </label>

                <select
                  id="sort"
                  name="sort"
                  defaultValue={sort}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  {sortingOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Cerca professionisti
              </button>

              {activeFiltersCount > 0 && (
                <Link
                  href="/professionisti"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancella ricerca
                </Link>
              )}
            </div>
          </form>
        </section>

        {activeFiltersCount > 0 && (
          <section className="mt-6 flex flex-wrap items-center gap-2">
            <p className="mr-1 text-sm font-semibold text-slate-600">
              Filtri attivi:
            </p>

            {query && (
              <Link
                href={createRemoveFilterUrl(
                  currentUrlParameters,
                  "query"
                )}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Ricerca: {query} ×
              </Link>
            )}

            {profession && (
              <Link
                href={createRemoveFilterUrl(
                  currentUrlParameters,
                  "profession"
                )}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Professione: {profession} ×
              </Link>
            )}

            {city && (
              <Link
                href={createRemoveFilterUrl(
                  currentUrlParameters,
                  "city"
                )}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Città: {city} ×
              </Link>
            )}

            {province && (
              <Link
                href={createRemoveFilterUrl(
                  currentUrlParameters,
                  "province"
                )}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Provincia: {province} ×
              </Link>
            )}

            {service && (
              <Link
                href={createRemoveFilterUrl(
                  currentUrlParameters,
                  "service"
                )}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                {service ===
                "HOME_VISIT"
                  ? "Assistenza domiciliare"
                  : "Videoconsulto"}{" "}
                ×
              </Link>
            )}

            {maximumRate !== null && (
              <Link
                href={createRemoveFilterUrl(
                  currentUrlParameters,
                  "maxRate"
                )}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Massimo {maximumRate} € ×
              </Link>
            )}
          </section>
        )}

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Professionisti disponibili
              </p>

              <h2 className="mt-1 text-3xl font-bold text-slate-900">
                Risultati della ricerca
              </h2>
            </div>

            {!professionalsError &&
              totalProfessionals > 0 && (
                <p className="text-sm text-slate-500">
                  Visualizzati{" "}
                  <strong>
                    {firstDisplayedResult}–
                    {lastDisplayedResult}
                  </strong>{" "}
                  di{" "}
                  <strong>
                    {totalProfessionals}
                  </strong>
                </p>
              )}
          </div>

          {professionalsError ? (
            <div
              role="alert"
              className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8"
            >
              <h3 className="text-xl font-bold text-red-900">
                Impossibile caricare i
                professionisti
              </h3>

              <p className="mt-3 text-sm leading-6 text-red-700">
                Si è verificato un problema
                durante la lettura dei profili.
                Controlla il terminale e le
                policy della vista
                public_professionals.
              </p>
            </div>
          ) : professionals.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="text-4xl">
                🔎
              </div>

              <h3 className="mt-4 text-2xl font-bold text-slate-900">
                Nessun professionista trovato
              </h3>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
                Prova a modificare la città, la
                professione, la tariffa oppure
                il tipo di servizio selezionato.
              </p>

              <Link
                href="/professionisti"
                className="mt-6 inline-flex rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Visualizza tutti
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

              <ProfessionalsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                createPageUrl={(
                  pageNumber
                ) =>
                  createPageUrl(
                    currentUrlParameters,
                    pageNumber
                  )
                }
              />
            </>
          )}
        </section>

        <section className="mt-14 rounded-3xl bg-blue-900 px-8 py-10 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Sei un professionista
                sanitario?
              </h2>

              <p className="mt-3 max-w-2xl leading-7 text-blue-100">
                Crea il tuo profilo, carica i
                documenti professionali e
                renditi disponibile per le
                richieste degli utenti.
              </p>
            </div>

            <Link
              href="/register"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-blue-900 transition hover:bg-blue-50"
            >
              Registrati come professionista
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}