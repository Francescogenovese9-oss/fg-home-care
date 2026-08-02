import Link from "next/link";

type ProfessionalCardProps = {
  professional: {
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
};

function truncateText(
  value: string,
  maximumLength: number
) {
  if (value.length <= maximumLength) {
    return value;
  }

  return `${value.slice(0, maximumLength).trim()}…`;
}

export default function ProfessionalCard({
  professional,
}: ProfessionalCardProps) {
  const fullName =
    [professional.first_name, professional.last_name]
      .filter(Boolean)
      .join(" ") || "Professionista sanitario";

  const location =
    [professional.city, professional.province]
      .filter(Boolean)
      .join(", ") || "Località non indicata";

  const bio = professional.bio
    ? truncateText(professional.bio, 150)
    : "Professionista sanitario verificato disponibile attraverso FG Home Care.";

  const availableDays =
    professional.available_weekdays?.length ?? 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
      <div className="relative bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
        <div className="absolute right-5 top-5">
          <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            <span aria-hidden="true">✓</span>
            Verificato
          </span>
        </div>

        <div className="flex items-start gap-4 pr-20">
          {professional.avatarUrl ? (
            <img
              src={professional.avatarUrl}
              alt={`Foto profilo di ${fullName}`}
              className="h-24 w-24 shrink-0 rounded-2xl border-4 border-white object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-blue-100 text-3xl font-bold text-blue-800 shadow-sm">
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 pt-1">
            <h2 className="text-xl font-bold text-slate-900">
              {fullName}
            </h2>

            <p className="mt-1 font-semibold text-blue-700">
              {professional.profession}
            </p>

            {professional.specialization && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {professional.specialization}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm leading-6 text-slate-600">
          {bio}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Località
            </dt>

            <dd className="mt-1 text-sm font-bold text-slate-900">
              {location}
            </dd>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Raggio
            </dt>

            <dd className="mt-1 text-sm font-bold text-slate-900">
              {professional.service_radius_km} km
            </dd>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tariffa
            </dt>

            <dd className="mt-1 text-sm font-bold text-slate-900">
              {professional.hourly_rate !== null
                ? `${Number(
                    professional.hourly_rate
                  ).toFixed(2)} € / ora`
                : "Da concordare"}
            </dd>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Disponibilità
            </dt>

            <dd className="mt-1 text-sm font-bold text-slate-900">
              {availableDays > 0
                ? `${availableDays} ${
                    availableDays === 1
                      ? "giorno"
                      : "giorni"
                  }`
                : "Da definire"}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Servizi disponibili
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {professional.home_visits && (
              <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                Assistenza domiciliare
              </span>
            )}

            {professional.video_consultations && (
              <span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                Videoconsulto
              </span>
            )}

            {!professional.home_visits &&
              !professional.video_consultations && (
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Servizi da definire
                </span>
              )}
          </div>
        </div>

        <div className="mt-auto pt-7">
          <Link
            href={`/professionisti/${professional.user_id}`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Visualizza profilo
          </Link>
        </div>
      </div>
    </article>
  );
}