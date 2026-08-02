import Link from "next/link";

type ProfessionalCardProps = {
  professional: {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    profession: string;
    specialization: string | null;
    city: string | null;
    province: string | null;
    hourly_rate: number | null;
    service_radius_km: number;
    home_visits: boolean;
    video_consultations: boolean;
    avatarUrl: string | null;
  };
};

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

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start gap-4">
        {professional.avatarUrl ? (
          <img
            src={professional.avatarUrl}
            alt={`Foto profilo di ${fullName}`}
            className="h-20 w-20 shrink-0 rounded-full border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-800">
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900">
            {fullName}
          </h2>

          <p className="mt-1 font-semibold text-blue-700">
            {professional.profession}
          </p>

          {professional.specialization && (
            <p className="mt-1 text-sm text-slate-500">
              {professional.specialization}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">
            Località:
          </span>{" "}
          {location}
        </p>

        <p>
          <span className="font-semibold text-slate-800">
            Raggio d’intervento:
          </span>{" "}
          {professional.service_radius_km} km
        </p>

        <p>
          <span className="font-semibold text-slate-800">
            Tariffa:
          </span>{" "}
          {professional.hourly_rate !== null
            ? `da ${Number(
                professional.hourly_rate
              ).toFixed(2)} € / ora`
            : "Da concordare"}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {professional.home_visits && (
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            Assistenza domiciliare
          </span>
        )}

        {professional.video_consultations && (
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
            Videoconsulto
          </span>
        )}
      </div>

      <div className="mt-auto pt-6">
        <Link
          href={`/professionisti/${professional.user_id}`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          Visualizza profilo
        </Link>
      </div>
    </article>
  );
}