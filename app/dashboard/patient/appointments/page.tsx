import Link from "next/link";
import { redirect } from "next/navigation";

import CancelAppointmentButton from "@/components/appointments/CancelAppointmentButton";
import LogoutButton from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";

type AppointmentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

type Appointment = {
  id: string;
  professional_id: string;

  service_type:
    | "HOME_VISIT"
    | "VIDEO_CONSULTATION";

  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;

  hourly_rate: number | null;

  patient_notes: string | null;
  professional_notes: string | null;

  status: AppointmentStatus;

  created_at: string;
  updated_at: string;
};

type PublicProfessional = {
  user_id: string;

  first_name: string | null;
  last_name: string | null;

  profession: string;
  specialization: string | null;

  city: string | null;
  province: string | null;

  avatar_path: string | null;
};

type SearchParams = {
  status?: string | string[];
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

type AppointmentWithProfessional =
  Appointment & {
    professional: PublicProfessional | null;
    avatarUrl: string | null;
  };

const allowedStatuses: AppointmentStatus[] = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
];

function getSingleValue(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getStatusLabel(
  status: AppointmentStatus
) {
  switch (status) {
    case "ACCEPTED":
      return "Accettata";

    case "REJECTED":
      return "Rifiutata";

    case "CANCELLED":
      return "Annullata";

    case "COMPLETED":
      return "Completata";

    default:
      return "In attesa";
  }
}

function getStatusClass(
  status: AppointmentStatus
) {
  switch (status) {
    case "ACCEPTED":
      return "border-green-200 bg-green-50 text-green-700";

    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    case "CANCELLED":
      return "border-slate-300 bg-slate-100 text-slate-600";

    case "COMPLETED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getServiceLabel(
  serviceType: Appointment["service_type"]
) {
  return serviceType ===
    "VIDEO_CONSULTATION"
    ? "Videoconsulto"
    : "Assistenza domiciliare";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(
    new Date(`${value}T12:00:00`)
  );
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getProfessionalName(
  professional: PublicProfessional | null
) {
  if (!professional) {
    return "Professionista sanitario";
  }

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

function getProfessionalLocation(
  professional: PublicProfessional | null
) {
  if (!professional) {
    return "";
  }

  return [
    professional.city,
    professional.province,
  ]
    .filter(Boolean)
    .join(", ");
}

function isChatAvailable(
  status: AppointmentStatus
) {
  return [
    "PENDING",
    "ACCEPTED",
    "COMPLETED",
  ].includes(status);
}

export default async function PatientAppointmentsPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "Errore lettura utente prenotazioni:",
      userError
    );
  }

  if (!user) {
    redirect(
      "/login?redirect=/dashboard/patient/appointments"
    );
  }

  const {
    data: accountProfile,
    error: accountProfileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (accountProfileError) {
    console.error(
      "Errore lettura ruolo paziente:",
      accountProfileError
    );
  }

  if (
    accountProfile?.role ===
    "PROFESSIONAL"
  ) {
    redirect(
      "/dashboard/professional/appointments"
    );
  }

  if (accountProfile?.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (accountProfile?.role !== "PATIENT") {
    redirect("/login");
  }

  const params = await searchParams;

  const requestedStatus =
    getSingleValue(params.status).toUpperCase() as AppointmentStatus;

  const selectedStatus =
    allowedStatuses.includes(requestedStatus)
      ? requestedStatus
      : null;

  let appointmentsQuery = supabase
    .from("appointments")
    .select(
      `
        id,
        professional_id,
        service_type,
        appointment_date,
        appointment_time,
        duration_minutes,
        hourly_rate,
        patient_notes,
        professional_notes,
        status,
        created_at,
        updated_at
      `
    )
    .eq("patient_id", user.id)
    .order("appointment_date", {
      ascending: false,
    })
    .order("appointment_time", {
      ascending: false,
    });

  if (selectedStatus) {
    appointmentsQuery =
      appointmentsQuery.eq(
        "status",
        selectedStatus
      );
  }

  const {
    data: appointmentsData,
    error: appointmentsError,
  } = await appointmentsQuery;

  if (appointmentsError) {
    console.error(
      "Errore lettura prenotazioni paziente:",
      appointmentsError
    );
  }

  const appointments =
    (appointmentsData ?? []) as Appointment[];

  const professionalIds = Array.from(
    new Set(
      appointments.map(
        (appointment) =>
          appointment.professional_id
      )
    )
  );

  let professionals: PublicProfessional[] =
    [];

  if (professionalIds.length > 0) {
    const {
      data: professionalsData,
      error: professionalsError,
    } = await supabase
      .from("public_professionals")
      .select(
        `
          user_id,
          first_name,
          last_name,
          profession,
          specialization,
          city,
          province,
          avatar_path
        `
      )
      .in("user_id", professionalIds);

    if (professionalsError) {
      console.error(
        "Errore lettura professionisti:",
        professionalsError
      );
    }

    professionals =
      (professionalsData ??
        []) as PublicProfessional[];
  }

  const professionalsMap = new Map(
    professionals.map((professional) => [
      professional.user_id,
      professional,
    ])
  );

  const appointmentsWithProfessionals: AppointmentWithProfessional[] =
    appointments.map((appointment) => {
      const professional =
        professionalsMap.get(
          appointment.professional_id
        ) ?? null;

      let avatarUrl: string | null = null;

      if (professional?.avatar_path) {
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
        ...appointment,
        professional,
        avatarUrl,
      };
    });

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Le mie prenotazioni
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard/patient"
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              Dashboard
            </Link>

            <Link
              href="/professionisti"
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              Cerca professionisti
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <section>
          <p className="text-sm font-semibold text-blue-700">
            Richieste di assistenza
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Appuntamenti e richieste
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Controlla lo stato delle richieste,
            comunica con il professionista e
            gestisci gli appuntamenti.
          </p>
        </section>

        <nav
          aria-label="Filtra prenotazioni"
          className="mt-8 flex flex-wrap gap-3"
        >
          <Link
            href="/dashboard/patient/appointments"
            aria-current={
              !selectedStatus
                ? "page"
                : undefined
            }
            className={
              !selectedStatus
                ? "rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            }
          >
            Tutte
          </Link>

          {allowedStatuses.map((status) => (
            <Link
              key={status}
              href={`/dashboard/patient/appointments?status=${status}`}
              aria-current={
                selectedStatus === status
                  ? "page"
                  : undefined
              }
              className={
                selectedStatus === status
                  ? "rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              }
            >
              {getStatusLabel(status)}
            </Link>
          ))}
        </nav>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            <strong className="text-slate-900">
              {
                appointmentsWithProfessionals.length
              }
            </strong>{" "}
            {appointmentsWithProfessionals.length ===
            1
              ? "prenotazione trovata"
              : "prenotazioni trovate"}
          </p>

          {selectedStatus && (
            <Link
              href="/dashboard/patient/appointments"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              Rimuovi filtro
            </Link>
          )}
        </div>

        {appointmentsError ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700"
          >
            Non è stato possibile caricare le
            prenotazioni. Controlla il terminale
            e le policy Supabase.
          </div>
        ) : appointmentsWithProfessionals.length ===
          0 ? (
          <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="text-4xl">
              📅
            </div>

            <h3 className="mt-4 text-xl font-bold text-slate-900">
              Nessuna richiesta trovata
            </h3>

            <p className="mt-3 text-slate-600">
              {selectedStatus
                ? "Non sono presenti richieste con lo stato selezionato."
                : "Cerca un professionista e invia la tua prima richiesta di assistenza."}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {selectedStatus && (
                <Link
                  href="/dashboard/patient/appointments"
                  className="inline-flex rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Mostra tutte
                </Link>
              )}

              <Link
                href="/professionisti"
                className="inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Cerca un professionista
              </Link>
            </div>
          </section>
        ) : (
          <div className="mt-8 space-y-6">
            {appointmentsWithProfessionals.map(
              (appointment) => {
                const professionalName =
                  getProfessionalName(
                    appointment.professional
                  );

                const location =
                  getProfessionalLocation(
                    appointment.professional
                  );

                const chatAvailable =
                  isChatAvailable(
                    appointment.status
                  );

                return (
                  <article
                    key={appointment.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                      <div className="flex flex-1 gap-4">
                        {appointment.avatarUrl ? (
                          <img
                            src={
                              appointment.avatarUrl
                            }
                            alt={`Foto di ${professionalName}`}
                            className="h-20 w-20 shrink-0 rounded-2xl border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-800">
                            {professionalName
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-900">
                              {professionalName}
                            </h3>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                                appointment.status
                              )}`}
                            >
                              {getStatusLabel(
                                appointment.status
                              )}
                            </span>
                          </div>

                          <p className="mt-1 font-semibold text-blue-700">
                            {appointment
                              .professional
                              ?.profession ??
                              "Professionista sanitario"}
                          </p>

                          {appointment
                            .professional
                            ?.specialization && (
                            <p className="mt-1 text-sm text-slate-500">
                              {
                                appointment
                                  .professional
                                  .specialization
                              }
                            </p>
                          )}

                          {location && (
                            <p className="mt-1 text-sm text-slate-500">
                              {location}
                            </p>
                          )}
                        </div>
                      </div>

                      {appointment.status ===
                        "PENDING" && (
                        <CancelAppointmentButton
                          appointmentId={
                            appointment.id
                          }
                        />
                      )}
                    </div>

                    <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Servizio
                        </dt>

                        <dd className="mt-1 font-semibold text-slate-900">
                          {getServiceLabel(
                            appointment.service_type
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Data
                        </dt>

                        <dd className="mt-1 font-semibold capitalize text-slate-900">
                          {formatDate(
                            appointment.appointment_date
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Orario e durata
                        </dt>

                        <dd className="mt-1 font-semibold text-slate-900">
                          {formatTime(
                            appointment.appointment_time
                          )}{" "}
                          ·{" "}
                          {
                            appointment.duration_minutes
                          }{" "}
                          min
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tariffa indicativa
                        </dt>

                        <dd className="mt-1 font-semibold text-slate-900">
                          {appointment.hourly_rate !==
                          null
                            ? `${Number(
                                appointment.hourly_rate
                              ).toFixed(2)} € / ora`
                            : "Da concordare"}
                        </dd>
                      </div>
                    </dl>

                    {appointment.patient_notes && (
                      <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Motivo della richiesta
                        </p>

                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {
                            appointment.patient_notes
                          }
                        </p>
                      </div>
                    )}

                    {appointment.professional_notes && (
                      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Messaggio del professionista
                        </p>

                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-blue-900">
                          {
                            appointment.professional_notes
                          }
                        </p>
                      </div>
                    )}

                    {!chatAvailable && (
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm text-slate-600">
                          La chat non è disponibile
                          perché la richiesta è stata{" "}
                          {appointment.status ===
                          "REJECTED"
                            ? "rifiutata"
                            : "annullata"}
                          .
                        </p>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      {chatAvailable && (
                        <Link
                          href={`/dashboard/appointments/${appointment.id}/chat`}
                          className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                        >
                          Apri chat
                        </Link>
                      )}

                      <Link
                        href={`/professionisti/${appointment.professional_id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Profilo professionista
                      </Link>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="text-xs text-slate-400">
                        Richiesta inviata il{" "}
                        {formatCreatedAt(
                          appointment.created_at
                        )}
                      </p>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}