import type { Metadata } from "next";

import Link from "next/link";

import ProfessionalCard, {
  type ProfessionalCardData,
} from "@/components/professionals/ProfessionalCard";

import { CareGuidanceMarketplaceTracker } from "@/components/care-guidance/CareGuidanceMarketplaceTracker";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { getProfessionalSearchTerms, normalizeProfessionalSearch } from "@/lib/professional-search";
import { getRecommendedScore } from "@/lib/professional-ranking";
import type { ProfessionalPlan } from "@/lib/payments/config";
type SearchParams = {
  profession?:
    | string
    | string[];

  city?:
    | string
    | string[];

  service?:
    | string
    | string[];

  sort?:
    | string
    | string[];

  source?:
    | string
    | string[];
};

type PageProps = {
  searchParams:
    Promise<SearchParams>;
};

type PublicProfessional = {
  user_id: string;

  first_name:
    | string
    | null;

  last_name:
    | string
    | null;

  avatar_path:
    | string
    | null;

  updated_at: string;

  profession: string;

  specialization:
    | string
    | null;

  city:
    | string
    | null;

  province:
    | string
    | null;

  hourly_rate:
    | number
    | null;

  service_radius_km:
    | number
    | null;

  home_visits: boolean;

  video_consultations:
    boolean;

  subscription_plan: ProfessionalPlan;
};

type ReviewStats = {
  user_id: string;

  review_count: number;

  average_rating:
    | number
    | string
    | null;
};

export const metadata: Metadata = {
  title:
    "Professionisti sanitari | FG Home Care",

  description:
    "Trova professionisti sanitari verificati per assistenza domiciliare e videoconsulto con FG Home Care.",
};

function getSingleValue(
  value:
    | string
    | string[]
    | undefined
) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeSearch(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

export default async function ProfessionalsPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const professionFilter =
    getSingleValue(
      params.profession
    ).trim();

  const cityFilter =
    getSingleValue(
      params.city
    ).trim();

  const serviceFilter =
    getSingleValue(
      params.service
    ).trim();

  const sort =
    getSingleValue(
      params.sort
    ).trim();

  const sourceFilter =
    getSingleValue(
      params.source
    ).trim();

  const isCareGuidance =
    sourceFilter === "care";

  const supabase =
    await createClient();

  /*
   * PROFESSIONISTI PUBBLICI
   */
  const {
    data: professionalsData,
    error: professionalsError,
  } = await supabase
    .from(
      "public_professionals"
    )
    .select(
      `
        user_id,

        first_name,
        last_name,
        avatar_path,
        updated_at,

        profession,
        specialization,

        city,
        province,

        hourly_rate,
        service_radius_km,

        home_visits,
          video_consultations,
          subscription_plan
      `
    );

  if (professionalsError) {
    console.error(
      "Errore lettura marketplace:",
      {
        message:
          professionalsError.message,

        code:
          professionalsError.code,

        details:
          professionalsError.details,

        hint:
          professionalsError.hint,
      }
    );
  }

  const professionals =
    (professionalsData ??
      []) as PublicProfessional[];

  /*
   * STATISTICHE RECENSIONI
   */
  const professionalIds =
    professionals.map(
      (professional) =>
        professional.user_id
    );

  let reviewStats:
    ReviewStats[] = [];

  if (
    professionalIds.length > 0
  ) {
    const {
      data:
        reviewStatsData,

      error:
        reviewStatsError,
    } = await supabase
      .rpc("get_public_review_stats")
      .in("user_id", professionalIds);
    if (reviewStatsError) {
      console.error(
        "Errore statistiche recensioni marketplace:",
        {
          message:
            reviewStatsError.message,

          code:
            reviewStatsError.code,

          details:
            reviewStatsError.details,

          hint:
            reviewStatsError.hint,
        }
      );
    }

    reviewStats =
      (reviewStatsData ??
        []) as ReviewStats[];
  }

  const reviewStatsMap =
    new Map(
      reviewStats.map(
        (stats) => [
          stats.user_id,
          stats,
        ]
      )
    );

  /*
   * =====================================================
   * MERGE PROFESSIONISTI + RECENSIONI + AVATAR
   * =====================================================
   */
  let marketplaceProfessionals:
    ProfessionalCardData[] =
    professionals.map(
      (professional) => {
        const stats =
          reviewStatsMap.get(
            professional.user_id
          );

        let avatarUrl:
          | string
          | null =
          null;

        if (
          professional.avatar_path
        ) {
          const {
            data:
              avatarData,
          } =
            supabase.storage
              .from(
                "avatars"
              )
              .getPublicUrl(
                professional.avatar_path
              );

          const separator =
            avatarData.publicUrl.includes("?")
              ? "&"
              : "?";

          avatarUrl =
            `${avatarData.publicUrl}${separator}v=${encodeURIComponent(
              professional.updated_at
            )}`;
        }

        return {
          user_id:
            professional.user_id,

          first_name:
            professional.first_name,

          last_name:
            professional.last_name,

          avatar_url:
            avatarUrl,

          profession:
            professional.profession,

          specialization:
            professional.specialization,

          city:
            professional.city,

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

          subscription_plan:
            professional.subscription_plan,

          average_rating:
            stats
              ?.average_rating !==
                null &&
            stats
              ?.average_rating !==
                undefined
              ? Number(
                  stats.average_rating
                )
              : null,

          review_count:
            Number(
              stats
                ?.review_count ??
                0
            ),
        };
      }
    );

  /*
   * FILTRI
   */
  if (professionFilter) {
    const searchTerms = getProfessionalSearchTerms(professionFilter);

    marketplaceProfessionals = marketplaceProfessionals.filter(
      (professional) => {
        const profession = normalizeProfessionalSearch(
          professional.profession
        );
        const specializationTerms = getProfessionalSearchTerms(
          professional.specialization ?? ""
        );

        return searchTerms.some(
          (term) =>
            profession.includes(term) ||
            specializationTerms.some(
              (specializationTerm) =>
                specializationTerm.includes(term) ||
                term.includes(specializationTerm)
            )
        );      }
    );
  }

  if (cityFilter) {
    const search =
      normalizeSearch(
        cityFilter
      );

    marketplaceProfessionals =
      marketplaceProfessionals.filter(
        (professional) =>
          professional.city
            ?.toLowerCase()
            .includes(
              search
            ) ||
          professional.province
            ?.toLowerCase()
            .includes(
              search
            )
      );
  }

  if (
    serviceFilter ===
    "home"
  ) {
    marketplaceProfessionals =
      marketplaceProfessionals.filter(
        (professional) =>
          professional.home_visits
      );
  }

  if (
    serviceFilter ===
    "video"
  ) {
    marketplaceProfessionals =
      marketplaceProfessionals.filter(
        (professional) =>
          professional.video_consultations
      );
  }

  /*
   * ORDINAMENTO
   */
  if (
    sort ===
    "rating"
  ) {
    marketplaceProfessionals.sort(
      (a, b) => {
        const ratingDifference =
          (b.average_rating ??
            0) -
          (a.average_rating ??
            0);

        if (
          ratingDifference !==
          0
        ) {
          return ratingDifference;
        }

        return (
          b.review_count -
          a.review_count
        );
      }
    );
  } else if (
    sort ===
    "reviews"
  ) {
    marketplaceProfessionals.sort(
      (a, b) =>
        b.review_count -
        a.review_count
    );
  } else if (
    sort ===
    "price-asc"
  ) {
    marketplaceProfessionals.sort(
      (a, b) => {
        if (
          a.hourly_rate ===
          null
        ) {
          return 1;
        }

        if (
          b.hourly_rate ===
          null
        ) {
          return -1;
        }

        return (
          Number(
            a.hourly_rate
          ) -
          Number(
            b.hourly_rate
          )
        );
      }
    );
  } else if (
    sort ===
    "price-desc"
  ) {
    marketplaceProfessionals.sort(
      (a, b) => {
        if (
          a.hourly_rate ===
          null
        ) {
          return 1;
        }

        if (
          b.hourly_rate ===
          null
        ) {
          return -1;
        }

        return (
          Number(
            b.hourly_rate
          ) -
          Number(
            a.hourly_rate
          )
        );
      }
    );
  } else {
    /*
     * Ordinamento Consigliati.
     *
     * I filtri di pertinenza sono gia stati applicati.
     * Premium ottiene maggiore visibilita tra i risultati
     * compatibili con la ricerca del paziente.
     */
    marketplaceProfessionals.sort((a, b) => {
      const scoreA = getRecommendedScore(a);
      const scoreB = getRecommendedScore(b);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      return b.review_count - a.review_count;
    });
  }

  const siteUrl =
    getSiteUrl();

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/">
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <p className="text-xs text-slate-500">
              La salute a casa tua
            </p>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Accedi
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Registrati
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-sm font-semibold text-blue-700">
            Marketplace sanitario
          </p>

          <h1 className="mt-2 max-w-4xl text-4xl font-bold tracking-tight text-slate-900">
            Trova il professionista
            sanitario più adatto alle tue
            esigenze
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Cerca professionisti
            verificati per assistenza
            domiciliare o videoconsulto,
            confronta disponibilità,
            tariffe e recensioni dei
            pazienti.
          </p>
        </div>
      </section>

        {isCareGuidance && (
          <>
            <CareGuidanceMarketplaceTracker />
            <section className="mx-auto max-w-7xl px-6 pt-8">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="font-semibold text-blue-900">
                Professionisti suggeriti per la tua esigenza
              </p>
              <p className="mt-1 text-sm text-blue-800">
                {professionFilter || "Professionisti sanitari"}
                {cityFilter && <> nella zona di {cityFilter}</>}
              </p>
            </div>
            </section>
          </>
        )}

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* FILTRI */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            method="GET"
            action="/professionisti"
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-5"
          >
            {/* PROFESSIONE / SPECIALIZZAZIONE */}

            <div>
              <label
                htmlFor="profession"
                className="text-sm font-semibold text-slate-700"
              >
                Professione o specializzazione
              </label>

              <input
                id="profession"
                name="profession"
                type="search"
                defaultValue={professionFilter}
                placeholder="Es. Urologo, Infermiere, Fisioterapista"
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
              />
            </div>

            {/* CITTÀ */}

            <div>
              <label
                htmlFor="city"
                className="text-sm font-semibold text-slate-700"
              >
                Città
              </label>

              <input
                id="city"
                name="city"
                type="text"
                defaultValue={
                  cityFilter
                }
                placeholder="Es. Cosenza"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
              />
            </div>

            {/* SERVIZIO */}

            <div>
              <label
                htmlFor="service"
                className="text-sm font-semibold text-slate-700"
              >
                Servizio
              </label>

              <select
                id="service"
                name="service"
                defaultValue={
                  serviceFilter
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <option value="">
                  Tutti
                </option>

                <option value="home">
                  Assistenza domiciliare
                </option>

                <option value="video">
                  Videoconsulto
                </option>
              </select>
            </div>

            {/* ORDINAMENTO */}

            <div>
              <label
                htmlFor="sort"
                className="text-sm font-semibold text-slate-700"
              >
                Ordina
              </label>

              <select
                id="sort"
                name="sort"
                defaultValue={
                  sort
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <option value="">
                  Consigliati
                </option>

                <option value="rating">
                  Meglio valutati
                </option>

                <option value="reviews">
                  Più recensiti
                </option>

                <option value="price-asc">
                  Prezzo crescente
                </option>

                <option value="price-desc">
                  Prezzo decrescente
                </option>
              </select>
            </div>

            {/* SUBMIT */}

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Cerca
              </button>

              <Link
                href="/professionisti"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        {/* RISULTATI */}

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Risultati
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Professionisti disponibili
              </h2>
            </div>

            <p className="text-sm font-semibold text-slate-500">
              {
                marketplaceProfessionals.length
              }{" "}
              {marketplaceProfessionals.length ===
              1
                ? "professionista"
                : "professionisti"}
            </p>
          </div>

          {professionalsError ? (
            <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700">
              Non è stato possibile
              caricare i professionisti.
            </div>
          ) : marketplaceProfessionals.length ===
            0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="text-4xl">
                🔎
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900">
                Nessun professionista
                trovato
              </h3>

              <p className="mt-2 text-slate-600">
                Prova a modificare i filtri
                di ricerca.
              </p>

              <Link
                href="/professionisti"
                className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Mostra tutti
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {marketplaceProfessionals.map(
                (
                  professional
                ) => (
                  <ProfessionalCard
                    key={
                      professional.user_id
                    }
                    professional={
                      professional
                    }
                    isCareGuidance={isCareGuidance}
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* SEO */}

        <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-7">
          <h2 className="text-xl font-bold text-slate-900">
            Assistenza sanitaria
            direttamente a casa
          </h2>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
            FG Home Care permette di
            cercare professionisti
            sanitari verificati,
            confrontare i profili e
            richiedere assistenza
            domiciliare o videoconsulti.
            Le recensioni pubblicate
            derivano da prestazioni
            realmente completate sulla
            piattaforma.
          </p>

          <p className="mt-3 text-xs text-slate-400">
            {siteUrl}
          </p>
        </section>
      </div>
    </main>
  );
}
