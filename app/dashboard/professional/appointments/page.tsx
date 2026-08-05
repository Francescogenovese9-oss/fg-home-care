import Link from "next/link";
import { redirect } from "next/navigation";

import ProfessionalAppointmentActions from "@/components/appointments/ProfessionalAppointmentActions";
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
  patient_id: string;

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

type PatientProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type SearchParams = {
  status?: string | string[];
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

type AppointmentWithPatient = Appointment & {
  patient: PatientProfile | null;
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

function getPatientName(
  patient: PatientProfile | null
) {
  if (!patient) {
    return "Paziente";
  }

  return (
    [
      patient.first_name,
      patient.last_name,
    ]
      .filter(Boolean)
      .join(" ") || "Paziente"
  );
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

export default async function ProfessionalAppointmentsPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "Errore lettura utente professionista:",
      userError
    );
  }

  if (!user) {
    redirect(
      "/login?redirect=/dashboard/professional/appointments"
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
      "Errore lettura ruolo professionista:",
      accountProfileError
    );
  }

  if (accountProfile?.role === "PATIENT") {
    redirect(
      "/dashboard/patient/appointments"
    );
  }

  if (accountProfile?.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (
    accountProfile?.role !==
    "PROFESSIONAL"
  ) {
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
        patient_id,
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
    .eq("professional_id", user.id)
    .order("appointment_date", {
      ascending: true,
    })
    .order("appointment_time", {
      ascending: true,
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
      "Errore lettura richieste professionista:",
      appointmentsError
    );
  }

  const appointments =
    (appointmentsData ?? []) as Appointment[];

  const patientIds = Array.from(
    new Set(
      appointments.map(
        (appointment) =>
          appointment.patient_id
      )
    )
  );

  let patients: PatientProfile[] = [];

  if (patientIds.length > 0) {
    const {
      data: patientsData,
      error: patientsError,
    } = await supabase
      .from("profiles")
      .select(
        `
          id,
          first_name,
          last_name,
          email
        `
      )
      .in("id", patientIds);

    if (patientsError) {
      console.error(
        "Errore lettura pazienti:",
        patientsError
      );
    }

    patients =
      (patientsData ??
        []) as PatientProfile[];
  }

  const patientsMap = new Map(
    patients.map((patient) => [
      patient.id,
      patient,
    ])
  );

  const appointmentsWithPatients: AppointmentWithPatient[] =
    appointments.map((appointment) => ({
      ...appointment,
      patient:
        patientsMap.get(
          appointment.patient_id
        ) ?? null,
    }));

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Richieste ricevute
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard/professional"
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              Dashboard
            </Link>

            <Link
              href="/dashboard/professional/calendar"
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              Agenda
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <section>
          <p className="text-sm font-semibold text-blue-700">
            Gestione prenotazioni
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Appuntamenti e richieste
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Accetta, rifiuta o completa le
            richieste ricevute e comunica con
            il paziente tramite la chat della
            prenotazione.
          </p>
        </section>

        <nav
          aria-label="Filtra richieste"
          className="mt-8 flex flex-wrap gap-3"
        >
          <Link
            href="/dashboard/professional/appointments"
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
              href={`/dashboard/professional/appointments?status=${status}`}
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
                appointmentsWithPatients.length
              }
            </strong>{" "}
            {appointmentsWithPatients.length ===
            1
              ? "richiesta trovata"
              : "richieste trovate"}
          </p>

          {selectedStatus && (
            <Link
              href="/dashboard/professional/appointments"
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
            richieste. Controlla il terminale
            e le policy Supabase.
          </div>
        ) : appointmentsWithPatients.length ===
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
                : "Non hai ancora ricevuto richieste di assistenza."}
            </p>

            {selectedStatus && (
              <Link
                href="/dashboard/professional/appointments"
                className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Mostra tutte
              </Link>
            )}
          </section>
        ) : (
          <div className="mt-8 space-y-6">
            {appointmentsWithPatients.map(
              (appointment) => {
                const patientName =
                  getPatientName(
                    appointment.patient
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
                    <div className="flex flex-wrap items-start justify-between gap-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-800">
                          {patientName
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-900">
                              {patientName}
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

                          <p className="mt-2 text-sm text-slate-500">
                            {appointment.patient
                              ?.email ??
                              "Email non disponibile"}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                        {getServiceLabel(
                          appointment.service_type
                        )}
                      </span>
                    </div>

                    <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2 lg:grid-cols-4">
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
                          Orario
                        </dt>

                        <dd className="mt-1 font-semibold text-slate-900">
                          {formatTime(
                            appointment.appointment_time
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Durata
                        </dt>

                        <dd className="mt-1 font-semibold text-slate-900">
                          {
                            appointment.duration_minutes
                          }{" "}
                          minuti
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

                    {appointment.professional_notes &&
                      appointment.status !==
                        "PENDING" && (
                        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                            Messaggio inviato al
                            paziente
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

                    <div className="mt-6 flex flex-wrap gap-3">
                      {chatAvailable && (
                        <Link
                          href={`/dashboard/appointments/${appointment.id}/chat`}
                          className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                        >
                          Apri chat con il paziente
                        </Link>
                      )}

                      <Link
                        href="/dashboard/professional/calendar"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Visualizza agenda
                      </Link>
                    </div>

                    <ProfessionalAppointmentActions
                      appointmentId={
                        appointment.id
                      }
                      currentStatus={
                        appointment.status
                      }
                      currentNotes={
                        appointment.professional_notes
                      }
                    />

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="text-xs text-slate-400">
                        Richiesta ricevuta il{" "}
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