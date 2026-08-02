import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";

type VerificationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type ProfessionalProfile = {
  user_id: string;
  profession: string;
  specialization: string | null;
  city: string | null;
  province: string | null;
  verification_status: VerificationStatus;
  documents_submitted: boolean;
  profile_completed: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};

type AccountProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
};

type PageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

const allowedStatuses: VerificationStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
];

function getStatusLabel(status: VerificationStatus) {
  switch (status) {
    case "APPROVED":
      return "Approvato";

    case "REJECTED":
      return "Rifiutato";

    default:
      return "In attesa";
  }
}

function getStatusClass(status: VerificationStatus) {
  switch (status) {
    case "APPROVED":
      return "border-green-200 bg-green-50 text-green-700";

    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminProfessionalsPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (currentProfile?.role !== "ADMIN") {
    redirect("/dashboard/patient");
  }

  const params = await searchParams;

  const requestedStatus =
    params.status?.toUpperCase() as
      | VerificationStatus
      | undefined;

  const selectedStatus =
    requestedStatus &&
    allowedStatuses.includes(requestedStatus)
      ? requestedStatus
      : "PENDING";

  const {
    data: professionalProfilesData,
    error: professionalProfilesError,
  } = await supabase
    .from("professional_profiles")
    .select(
      `
        user_id,
        profession,
        specialization,
        city,
        province,
        verification_status,
        documents_submitted,
        profile_completed,
        published,
        created_at,
        updated_at
      `
    )
    .eq("verification_status", selectedStatus)
    .order("updated_at", {
      ascending: false,
    });

  if (professionalProfilesError) {
    console.error(
      "Errore lettura profili professionisti:",
      professionalProfilesError
    );
  }

  const professionalProfiles =
    (professionalProfilesData ??
      []) as ProfessionalProfile[];

  const userIds = professionalProfiles.map(
    (profile) => profile.user_id
  );

  let accountProfiles: AccountProfile[] = [];

  if (userIds.length > 0) {
    const {
      data: accountProfilesData,
      error: accountProfilesError,
    } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, email, role"
      )
      .in("id", userIds);

    if (accountProfilesError) {
      console.error(
        "Errore lettura dati anagrafici:",
        accountProfilesError
      );
    }

    accountProfiles =
      (accountProfilesData ?? []) as AccountProfile[];
  }

  const accountProfilesMap = new Map(
    accountProfiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  const professionals = professionalProfiles.map(
    (professionalProfile) => ({
      ...professionalProfile,
      account:
        accountProfilesMap.get(
          professionalProfile.user_id
        ) ?? null,
    })
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Verifica professionisti
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Dashboard
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="mb-8">
          <p className="text-sm font-semibold text-blue-700">
            Area amministrativa
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Profili professionali
          </h2>

          <p className="mt-3 max-w-3xl text-slate-600">
            Controlla i dati e i documenti caricati dai
            professionisti prima di autorizzarne la
            pubblicazione.
          </p>
        </section>

        <nav className="mb-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard/admin/professionals?status=PENDING"
            className={
              selectedStatus === "PENDING"
                ? "rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            }
          >
            In attesa
          </Link>

          <Link
            href="/dashboard/admin/professionals?status=APPROVED"
            className={
              selectedStatus === "APPROVED"
                ? "rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            }
          >
            Approvati
          </Link>

          <Link
            href="/dashboard/admin/professionals?status=REJECTED"
            className={
              selectedStatus === "REJECTED"
                ? "rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            }
          >
            Rifiutati
          </Link>
        </nav>

        {professionalProfilesError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-300 bg-red-50 p-5 text-red-700"
          >
            Impossibile caricare i professionisti.
            Controlla le policy RLS e il terminale.
          </div>
        ) : professionals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h3 className="text-xl font-bold text-slate-900">
              Nessun professionista
            </h3>

            <p className="mt-2 text-slate-600">
              Non ci sono profili con stato{" "}
              <strong>
                {getStatusLabel(selectedStatus)}
              </strong>
              .
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr_auto] gap-4 border-b bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
              <span>Professionista</span>
              <span>Professione</span>
              <span>Località</span>
              <span>Documenti</span>
              <span>Stato</span>
              <span>Azioni</span>
            </div>

            <div className="divide-y divide-slate-200">
              {professionals.map((professional) => {
                const fullName =
                  [
                    professional.account?.first_name,
                    professional.account?.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ") ||
                  "Professionista senza nome";

                const location =
                  [
                    professional.city,
                    professional.province,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                  "Località non indicata";

                return (
                  <article
                    key={professional.user_id}
                    className="grid gap-5 px-6 py-6 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr_auto] lg:items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {fullName}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {professional.account?.email ??
                          "Email non disponibile"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Aggiornato il{" "}
                        {formatDate(
                          professional.updated_at
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {professional.profession ||
                          "Non indicata"}
                      </p>

                      {professional.specialization && (
                        <p className="mt-1 text-sm text-slate-500">
                          {
                            professional.specialization
                          }
                        </p>
                      )}
                    </div>

                    <p className="text-sm text-slate-700">
                      {location}
                    </p>

                    <div>
                      <span
                        className={
                          professional.documents_submitted
                            ? "inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"
                            : "inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                        }
                      >
                        {professional.documents_submitted
                          ? "Caricati"
                          : "Mancanti"}
                      </span>
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                          professional.verification_status
                        )}`}
                      >
                        {getStatusLabel(
                          professional.verification_status
                        )}
                      </span>
                    </div>

                    <div>
                      <Link
                        href={`/dashboard/admin/professionals/${professional.user_id}`}
                        className="inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                      >
                        Esamina profilo
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}