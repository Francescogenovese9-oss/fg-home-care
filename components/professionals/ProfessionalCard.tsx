import type { ProfessionalPlan } from "@/lib/payments/config";
import Link from "next/link";

export type ProfessionalCardData = {
  user_id: string;

  first_name: string | null;
  last_name: string | null;

  avatar_url: string | null;

  profession: string;
  specialization: string | null;

  city: string | null;
  province: string | null;

  hourly_rate: number | null;

  service_radius_km: number | null;

  home_visits: boolean;
  video_consultations: boolean;
  subscription_plan: ProfessionalPlan;

  average_rating: number | null;
  review_count: number;
};

type ProfessionalCardProps = {
  professional: ProfessionalCardData;
  isCareGuidance?: boolean;
};

function getFullName(
  professional: ProfessionalCardData
) {
  return (
    [
      professional.first_name,
      professional.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Professionista sanitario"
  );
}

function getLocation(
  professional: ProfessionalCardData
) {
  return (
    [
      professional.city,
      professional.province,
    ]
      .filter(Boolean)
      .join(", ") ||
    "Località non indicata"
  );
}

function formatHourlyRate(
  value: number | null
) {
  if (value === null) {
    return "Da concordare";
  }

  return new Intl.NumberFormat(
    "it-IT",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(Number(value));
}

export default function ProfessionalCard({
  professional,
  isCareGuidance = false,
}: ProfessionalCardProps) {
  const fullName =
    getFullName(
      professional
    );

  const location =
    getLocation(
      professional
    );

  const initial =
    fullName
      .charAt(0)
      .toUpperCase();

  const averageRating =
    professional.average_rating !==
    null
      ? Number(
          professional.average_rating
        )
      : null;

  const reviewCount =
    Number(
      professional.review_count ??
        0
    );

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
      {/* HEADER */}

      <div className="border-b border-slate-100 p-6">
        <div className="flex items-start gap-4">
          {/* AVATAR */}

          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-blue-100">
            {professional.avatar_url ? (
              <img
                src={
                  professional.avatar_url
                }
                alt={`Foto profilo di ${fullName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-blue-800">
                {initial}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {fullName}
                </h2>

                <p className="mt-1 font-semibold text-blue-700">
                  {
                    professional.profession
                  }
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {professional.subscription_plan === "PREMIUM" && (
                  <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Premium
                  </span>
                )}

                <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  ✓ Verificato
                </span>
              </div>
            </div>

            {professional.specialization && (
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                {
                  professional.specialization
                }
              </p>
            )}

            <p className="mt-3 text-sm text-slate-600">
              📍 {location}
            </p>

            {/* RATING */}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {reviewCount > 0 &&
              averageRating !== null ? (
                <>
                  <span className="text-lg text-amber-500">
                    ★
                  </span>

                  <strong className="text-sm text-slate-900">
                    {averageRating.toFixed(
                      1
                    )}
                  </strong>

                  <span className="text-sm text-slate-500">
                    (
                    {reviewCount}{" "}
                    {reviewCount === 1
                      ? "recensione"
                      : "recensioni"}
                    )
                  </span>
                </>
              ) : (
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Nuovo professionista
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}

      <div className="flex flex-1 flex-col p-6">
        {/* SERVIZI */}

        <div className="flex flex-wrap gap-2">
          {professional.home_visits && (
            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              🏠 Domicilio
            </span>
          )}

          {professional.video_consultations && (
            <span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
              💻 Videoconsulto
            </span>
          )}
        </div>

        {/* DATI */}

        <dl className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-slate-500">
              Tariffa
            </dt>

            <dd className="font-bold text-slate-900">
              {formatHourlyRate(
                professional.hourly_rate
              )}

              {professional.hourly_rate !==
                null && (
                <span className="ml-1 text-xs font-normal text-slate-500">
                  / ora
                </span>
              )}
            </dd>
          </div>

          {professional.service_radius_km !==
            null && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-slate-500">
                Raggio assistenza
              </dt>

              <dd className="font-semibold text-slate-900">
                {
                  professional.service_radius_km
                }{" "}
                km
              </dd>
            </div>
          )}
        </dl>

        {/* CTA */}

        <div className="mt-auto pt-7">
          <Link
            href={`/professionisti/${professional.user_id}${isCareGuidance ? "?source=care" : ""}`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            {isCareGuidance ? "Vedi profilo e richiedi assistenza" : "Visualizza profilo"}
          </Link>
        </div>
      </div>
    </article>
  );
}
