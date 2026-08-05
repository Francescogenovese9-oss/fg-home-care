import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import NotificationBell from "@/components/notifications/NotificationBell";
import { createClient } from "@/lib/supabase/server";

type AppointmentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

type AppointmentSummary = {
  id: string;
  status: AppointmentStatus;
  appointment_date: string;
  appointment_time: string;
  professional_id: string;
};

type PatientProfile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
};

export default async function PatientDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "Errore lettura utente paziente:",
      userError
    );
  }

  if (!user) {
    redirect("/login");
  }

  const {
    data: profileData,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      `
        first_name,
        last_name,
        email,
        role
      `
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Errore lettura profilo paziente:",
      profileError
    );
  }

  const profile =
    profileData as PatientProfile | null;

  if (profile?.role === "PROFESSIONAL") {
    redirect("/dashboard/professional");
  }

  if (profile?.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (profile?.role !== "PATIENT") {
    redirect("/login");
  }

  const {
    data: appointmentsData,
    error: appointmentsError,
  } = await supabase
    .from("appointments")
    .select(
      `
        id,
        status,
        appointment_date,
        appointment_time,
        professional_id
      `
    )
    .eq("patient_id", user.id)
    .order("appointment_date", {
      ascending: true,
    })
    .order("appointment_time", {
      ascending: true,
    });

  if (appointmentsError) {
    console.error(
      "Errore lettura prenotazioni paziente:",
      appointmentsError
    );
  }

  const appointments =
    (appointmentsData ?? []) as AppointmentSummary[];

  const pendingCount = appointments.filter(
    (appointment) =>
      appointment.status === "PENDING"
  ).length;

  const acceptedCount = appointments.filter(
    (appointment) =>
      appointment.status === "ACCEPTED"
  ).length;

  const completedCount = appointments.filter(
    (appointment) =>
      appointment.status === "COMPLETED"
  ).length;

  const now = new Date();

  const nextAppointment =
    appointments.find((appointment) => {
      if (
        appointment.status !== "PENDING" &&
        appointment.status !== "ACCEPTED"
      ) {
        return false;
      }

      const appointmentDateTime = new Date(
        `${appointment.appointment_date}T${appointment.appointment_time}`
      );

      return (
        !Number.isNaN(
          appointmentDateTime.getTime()
        ) &&
        appointmentDateTime.getTime() >=
          now.getTime()
      );
    }) ?? null;

  let nextProfessionalName =
    "Professionista sanitario";

  let nextProfessionalProfession =
    "Professionista sanitario";

  let nextProfessionalLocation = "";

  if (nextAppointment) {
    const {
      data: professionalData,
      error: professionalError,
    } = await supabase
      .from("public_professionals")
      .select(
        `
          first_name,
          last_name,
          profession,
          city,
          province
        `
      )
      .eq(
        "user_id",
        nextAppointment.professional_id
      )
      .maybeSingle();

    if (professionalError) {
      console.error(
        "Errore lettura prossimo professionista:",
        professionalError
      );
    }

    if (professionalData) {
      nextProfessionalName =
        [
          professionalData.first_name,
          professionalData.last_name,
        ]
          .filter(Boolean)
          .join(" ") ||
        "Professionista sanitario";

      nextProfessionalProfession =
        professionalData.profession ||
        "Professionista sanitario";

      nextProfessionalLocation = [
        professionalData.city,
        professionalData.province,
      ]
        .filter(Boolean)
        .join(", ");
    }
  }

  const {
    count: unreadNotificationCount,
    error: unreadNotificationsError,
  } = await supabase
    .from("notifications")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id)
    .eq("read", false);

  if (unreadNotificationsError) {
    console.error(
      "Errore conteggio notifiche:",
      unreadNotificationsError
    );
  }

  const displayName =
    [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ") || "Utente";

  const email =
    profile.email ??
    user.email ??
    "Non disponibile";

  const nextAppointmentDate =
    nextAppointment
      ? new Intl.DateTimeFormat("it-IT", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(
          new Date(
            `${nextAppointment.appointment_date}T12:00:00`
          )
        )
      : null;

  const nextAppointmentTime =
    nextAppointment?.appointment_time.slice(
      0,
      5
    ) ?? null;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Dashboard paziente
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/professionisti"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Cerca professionisti
            </Link>

            <NotificationBell
              userId={user.id}
              initialUnreadCount={
                unreadNotificationCount ?? 0
              }
            />

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-blue-900 p-8 text-white shadow-lg">
          <p className="text-sm font-semibold text-blue-100">
            Benvenuto
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            {displayName}
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-blue-100">
            Cerca professionisti verificati, invia
            richieste di assistenza e controlla lo
            stato delle tue prenotazioni.
          </p>

          <div className="mt-7 flex flex-wrap gap-4">
            <Link
              href="/professionisti"
              className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
            >
              Trova un professionista
            </Link>

            <Link
              href="/dashboard/patient/appointments"
              className="inline-flex rounded-xl border border-blue-300 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Le mie prenotazioni
            </Link>

            <Link
              href="/dashboard/notifications"
              className="inline-flex rounded-xl border border-blue-300 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Visualizza notifiche
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-4">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-amber-700">
              In attesa
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900">
              {pendingCount}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Richieste in attesa di conferma da
              parte del professionista.
            </p>

            <Link
              href="/dashboard/patient/appointments?status=PENDING"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Visualizza richieste
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-green-700">
              Accettate
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900">
              {acceptedCount}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Prenotazioni confermate dai
              professionisti.
            </p>

            <Link
              href="/dashboard/patient/appointments?status=ACCEPTED"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Visualizza confermate
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Completate
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900">
              {completedCount}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Prestazioni concluse e registrate
              nella piattaforma.
            </p>

            <Link
              href="/dashboard/patient/appointments?status=COMPLETED"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Visualizza storico
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-red-700">
              Notifiche
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900">
              {unreadNotificationCount ?? 0}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Aggiornamenti non ancora letti sulle
              tue richieste.
            </p>

            <Link
              href="/dashboard/notifications"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Apri notifiche
            </Link>
          </article>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Prossimo appuntamento
                </p>

                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {nextAppointment
                    ? nextProfessionalName
                    : "Nessun appuntamento programmato"}
                </h3>

                {nextAppointment && (
                  <>
                    <p className="mt-2 font-semibold text-blue-700">
                      {nextProfessionalProfession}
                    </p>

                    {nextProfessionalLocation && (
                      <p className="mt-1 text-sm text-slate-500">
                        {nextProfessionalLocation}
                      </p>
                    )}
                  </>
                )}
              </div>

              {nextAppointment && (
                <span
                  className={
                    nextAppointment.status ===
                    "ACCEPTED"
                      ? "rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"
                      : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                  }
                >
                  {nextAppointment.status ===
                  "ACCEPTED"
                    ? "Confermato"
                    : "In attesa"}
                </span>
              )}
            </div>

            {nextAppointment ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Data
                  </p>

                  <p className="mt-2 font-bold capitalize text-slate-900">
                    {nextAppointmentDate}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Orario
                  </p>

                  <p className="mt-2 font-bold text-slate-900">
                    {nextAppointmentTime}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <p className="text-sm leading-6 text-slate-600">
                  Non hai appuntamenti futuri. Cerca
                  un professionista e invia una nuova
                  richiesta.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/dashboard/patient/appointments"
                className="inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Gestisci prenotazioni
              </Link>

              <Link
                href="/professionisti"
                className="inline-flex rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Nuova richiesta
              </Link>
            </div>
          </article>

          <article className="rounded-3xl bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Il mio profilo
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-900">
              Dati account
            </h3>

            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Nome
                </dt>

                <dd className="mt-1 font-semibold text-slate-900">
                  {displayName}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </dt>

                <dd className="mt-1 break-all font-semibold text-slate-900">
                  {email}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tipo account
                </dt>

                <dd className="mt-1 font-semibold text-slate-900">
                  Paziente
                </dd>
              </div>
            </dl>

            <p className="mt-6 text-sm leading-6 text-slate-500">
              La modifica dei dati personali sarà
              aggiunta in uno sprint successivo.
            </p>
          </article>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Cerca un professionista
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Trova infermieri, OSS,
              fisioterapisti e altri
              professionisti disponibili nella
              tua zona.
            </p>

            <Link
              href="/professionisti"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Avvia ricerca
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Le mie prenotazioni
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Controlla richieste in attesa,
              accettate, rifiutate, annullate o
              completate.
            </p>

            <Link
              href="/dashboard/patient/appointments"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Visualizza prenotazioni
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Notifiche
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Leggi gli aggiornamenti relativi
              all’accettazione, al rifiuto o al
              completamento delle richieste.
            </p>

            <Link
              href="/dashboard/notifications"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Visualizza notifiche
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}