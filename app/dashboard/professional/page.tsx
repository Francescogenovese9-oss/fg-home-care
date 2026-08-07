import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import NotificationBell, {
  type NotificationPreview,
} from "@/components/notifications/NotificationBell";
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
  patient_id: string;
};

type ProfessionalProfile = {
  profession: string | null;
  specialization: string | null;
  city: string | null;
  province: string | null;

  profile_completed: boolean;
  documents_submitted: boolean;

  verification_status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED";

  published: boolean;

  stripe_account_id: string | null;
  stripe_account_created: boolean;
  stripe_onboarding_completed: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
};

export default async function ProfessionalDashboardPage() {
  const supabase = await createClient();

  /*
   * =========================================================
   * AUTENTICAZIONE
   * =========================================================
   */

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
    redirect("/login");
  }

  /*
   * =========================================================
   * PROFILO ACCOUNT
   * =========================================================
   */

  const {
    data: profile,
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
      "Errore lettura profilo professionista:",
      profileError
    );
  }

  if (profile?.role === "PATIENT") {
    redirect("/dashboard/patient");
  }

  if (profile?.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (profile?.role !== "PROFESSIONAL") {
    redirect("/login");
  }

  /*
   * =========================================================
   * PROFILO PROFESSIONALE
   * =========================================================
   */

  const {
    data: professionalProfileData,
    error: professionalProfileError,
  } = await supabase
    .from("professional_profiles")
    .select(
      `
        profession,
        specialization,
        city,
        province,
        profile_completed,
        documents_submitted,
        verification_status,
        published,
        stripe_account_id,
        stripe_account_created,
        stripe_onboarding_completed,
        stripe_charges_enabled,
        stripe_payouts_enabled,
        stripe_details_submitted
      `
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (professionalProfileError) {
    console.error(
      "Errore lettura profilo professionale:",
      professionalProfileError
    );
  }

  const professionalProfile =
    professionalProfileData as ProfessionalProfile | null;

  /*
   * =========================================================
   * APPUNTAMENTI
   * =========================================================
   */

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
        patient_id
      `
    )
    .eq("professional_id", user.id)
    .order("appointment_date", {
      ascending: true,
    })
    .order("appointment_time", {
      ascending: true,
    });

  if (appointmentsError) {
    console.error(
      "Errore lettura richieste professionista:",
      appointmentsError
    );
  }

  const appointments =
    (appointmentsData ??
      []) as AppointmentSummary[];

  /*
   * =========================================================
   * CONTATORI APPUNTAMENTI
   * =========================================================
   */

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

  /*
   * =========================================================
   * PROSSIMO APPUNTAMENTO
   * =========================================================
   */

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

  let nextPatientName = "Paziente";

  if (nextAppointment) {
    const {
      data: patientProfile,
      error: patientProfileError,
    } = await supabase
      .from("profiles")
      .select(
        `
          first_name,
          last_name
        `
      )
      .eq(
        "id",
        nextAppointment.patient_id
      )
      .maybeSingle();

    if (patientProfileError) {
      console.error(
        "Errore lettura prossimo paziente:",
        patientProfileError
      );
    }

    if (patientProfile) {
      nextPatientName =
        [
          patientProfile.first_name,
          patientProfile.last_name,
        ]
          .filter(Boolean)
          .join(" ") || "Paziente";
    }
  }

  /*
   * =========================================================
   * INDISPONIBILITÀ FUTURE
   * =========================================================
   */

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const {
    count: futureUnavailabilityCount,
    error: unavailabilityCountError,
  } = await supabase
    .from("professional_unavailability")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("professional_id", user.id)
    .gte("unavailable_date", today);

  if (unavailabilityCountError) {
    console.error(
      "Errore conteggio indisponibilità:",
      unavailabilityCountError
    );
  }

  /*
   * =========================================================
   * NOTIFICHE NON LETTE
   * =========================================================
   */

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

  /*
   * =========================================================
   * ULTIME 5 NOTIFICHE
   * =========================================================
   */

  const {
    data: recentNotificationsData,
    error: recentNotificationsError,
  } = await supabase
    .from("notifications")
    .select(
      `
        id,
        type,
        title,
        message,
        link,
        read,
        created_at
      `
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(5);

  if (recentNotificationsError) {
    console.error(
      "Errore lettura notifiche recenti:",
      recentNotificationsError
    );
  }

  const recentNotifications =
    (recentNotificationsData ??
      []) as NotificationPreview[];

  /*
   * =========================================================
   * DATI DERIVATI
   * =========================================================
   */

  const displayName =
    [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ") || "Professionista";

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

  const verificationStatus =
    professionalProfile?.verification_status ??
    "PENDING";

  const isProfileComplete =
    professionalProfile?.profile_completed ??
    false;

  const documentsSubmitted =
    professionalProfile?.documents_submitted ??
    false;

  const isPublished =
    professionalProfile?.published ?? false;

  const location =
    [
      professionalProfile?.city,
      professionalProfile?.province,
    ]
      .filter(Boolean)
      .join(", ") || "Non indicata";

  /*
   * =========================================================
   * STRIPE
   * =========================================================
   */

  const stripeAccountCreated =
    professionalProfile
      ?.stripe_account_created ?? false;

  const stripeOnboardingCompleted =
    professionalProfile
      ?.stripe_onboarding_completed ?? false;

  const stripeChargesEnabled =
    professionalProfile
      ?.stripe_charges_enabled ?? false;

  const stripePayoutsEnabled =
    professionalProfile
      ?.stripe_payouts_enabled ?? false;

  const stripeReady =
    stripeAccountCreated &&
    stripeOnboardingCompleted &&
    stripeChargesEnabled &&
    stripePayoutsEnabled;

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Dashboard professionista
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/professionisti"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Marketplace
            </Link>

            <Link
              href="/dashboard/professional/calendar"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Agenda
            </Link>

            <NotificationBell
              userId={user.id}
              initialUnreadCount={
                unreadNotificationCount ?? 0
              }
              initialNotifications={
                recentNotifications
              }
            />

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* HERO */}

        <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-blue-900 p-8 text-white shadow-lg">
          <p className="text-sm font-semibold text-blue-100">
            Benvenuto
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            {displayName}
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-blue-100">
            Gestisci il tuo profilo, controlla
            le richieste ricevute e organizza
            la tua agenda professionale.
          </p>

          <div className="mt-7 flex flex-wrap gap-4">
            <Link
              href="/dashboard/professional/appointments"
              className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
            >
              Gestisci richieste
            </Link>

            <Link
              href="/dashboard/professional/calendar"
              className="inline-flex rounded-xl border border-blue-300 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Apri agenda
            </Link>

            <Link
              href="/dashboard/professional/profile"
              className="inline-flex rounded-xl border border-blue-300 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Modifica profilo
            </Link>
          </div>
        </section>

        {/* STATISTICHE */}

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-amber-700">
              In attesa
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900">
              {pendingCount}
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Richieste che devono ancora essere
              accettate o rifiutate.
            </p>

            <Link
              href="/dashboard/professional/appointments?status=PENDING"
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

            <p className="mt-2 text-sm text-slate-600">
              Prestazioni confermate e ancora
              da completare.
            </p>

            <Link
              href="/dashboard/professional/appointments?status=ACCEPTED"
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

            <p className="mt-2 text-sm text-slate-600">
              Prestazioni concluse e registrate
              nella piattaforma.
            </p>

            <Link
              href="/dashboard/professional/appointments?status=COMPLETED"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Visualizza storico
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-red-700">
              Indisponibilità
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900">
              {futureUnavailabilityCount ?? 0}
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Giornate o fasce orarie future
              già bloccate.
            </p>

            <Link
              href="/dashboard/professional/calendar"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Gestisci agenda
            </Link>
          </article>
        </section>

        {/* PROSSIMO APPUNTAMENTO + STATO PROFILO */}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Prossimo appuntamento
                </p>

                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {nextAppointment
                    ? nextPatientName
                    : "Nessun appuntamento programmato"}
                </h3>
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
                  Non risultano richieste future
                  in attesa o già accettate.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/dashboard/professional/appointments"
                className="inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Gestisci appuntamenti
              </Link>

              <Link
                href="/dashboard/professional/calendar"
                className="inline-flex rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Visualizza agenda
              </Link>
            </div>
          </article>

          <article className="rounded-3xl bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Stato del profilo
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-900">
              Pubblicazione
            </h3>

            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dati professionali
                </dt>

                <dd className="mt-1 font-semibold text-slate-900">
                  {isProfileComplete
                    ? "Completati"
                    : "Da completare"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Documenti
                </dt>

                <dd className="mt-1 font-semibold text-slate-900">
                  {documentsSubmitted
                    ? "Inviati"
                    : "Da caricare"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Verifica
                </dt>

                <dd className="mt-1 font-semibold text-slate-900">
                  {verificationStatus ===
                  "APPROVED"
                    ? "Approvato"
                    : verificationStatus ===
                        "REJECTED"
                      ? "Rifiutato"
                      : "In attesa"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Profilo pubblico
                </dt>

                <dd className="mt-1 font-semibold text-slate-900">
                  {isPublished
                    ? "Pubblicato"
                    : "Non pubblicato"}
                </dd>
              </div>
            </dl>

            <Link
              href="/dashboard/professional/profile"
              className="mt-6 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Aggiorna profilo e documenti
            </Link>
          </article>
        </section>

        {/* PAGAMENTI STRIPE */}

        <section className="mt-8">
          <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Pagamenti
                </p>

                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  Pagamenti e accrediti Stripe
                </h3>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  FG Home Care utilizzerà Stripe
                  Connect per gestire in modo
                  sicuro i pagamenti delle
                  prestazioni e gli accrediti al
                  professionista.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {stripeReady ? (
                    <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                      ✓ Pagamenti configurati
                    </span>
                  ) : stripeAccountCreated ? (
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                      Configurazione Stripe da completare
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                      Configurazione in preparazione
                    </span>
                  )}
                </div>

                {!stripeAccountCreated && (
                  <p className="mt-4 text-sm text-slate-500">
                    Il collegamento del conto
                    Stripe sarà attivato nello
                    Sprint 4.2.
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-slate-50 p-6">
                <p className="text-sm font-semibold text-slate-900">
                  Stato Stripe
                </p>

                <dl className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-slate-600">
                      Account
                    </dt>

                    <dd
                      className={
                        stripeAccountCreated
                          ? "text-sm font-semibold text-green-700"
                          : "text-sm font-semibold text-slate-500"
                      }
                    >
                      {stripeAccountCreated
                        ? "Creato"
                        : "Non collegato"}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-slate-600">
                      Onboarding
                    </dt>

                    <dd
                      className={
                        stripeOnboardingCompleted
                          ? "text-sm font-semibold text-green-700"
                          : "text-sm font-semibold text-amber-700"
                      }
                    >
                      {stripeOnboardingCompleted
                        ? "Completato"
                        : "Da completare"}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-slate-600">
                      Pagamenti
                    </dt>

                    <dd
                      className={
                        stripeChargesEnabled
                          ? "text-sm font-semibold text-green-700"
                          : "text-sm font-semibold text-slate-500"
                      }
                    >
                      {stripeChargesEnabled
                        ? "Abilitati"
                        : "Non abilitati"}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-slate-600">
                      Accrediti
                    </dt>

                    <dd
                      className={
                        stripePayoutsEnabled
                          ? "text-sm font-semibold text-green-700"
                          : "text-sm font-semibold text-slate-500"
                      }
                    >
                      {stripePayoutsEnabled
                        ? "Abilitati"
                        : "Non abilitati"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </article>
        </section>

        {/* FUNZIONI DASHBOARD */}

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Profilo professionale
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Modifica professione,
              specializzazione, tariffa,
              disponibilità e raggio
              d’intervento.
            </p>

            <Link
              href="/dashboard/professional/profile"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Modifica profilo
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Richieste ricevute
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Accetta, rifiuta o completa le
              richieste inviate dai pazienti.
            </p>

            <Link
              href="/dashboard/professional/appointments"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Gestisci richieste
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Agenda professionale
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Visualizza gli appuntamenti e
              blocca giorni o fasce orarie.
            </p>

            <Link
              href="/dashboard/professional/calendar"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Apri agenda
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Notifiche
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Visualizza gli aggiornamenti
              sulle richieste, chat e
              prenotazioni.
            </p>

            <Link
              href="/dashboard/notifications"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Visualizza notifiche
            </Link>
          </article>

          {/* NUOVA CARD PAGAMENTI */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Pagamenti
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Collega il tuo conto Stripe per
              ricevere i pagamenti delle
              prestazioni effettuate tramite FG
              Home Care.
            </p>

            {stripeReady ? (
              <span className="mt-5 inline-flex rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                Pagamenti attivi
              </span>
            ) : (
              <span className="mt-5 inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                Configurazione in preparazione
              </span>
            )}
          </article>
        </section>

        {/* INFORMAZIONI PROFESSIONALI */}

        <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <h3 className="text-lg font-bold text-slate-900">
            Informazioni professionali
          </h3>

          <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Professione
              </dt>

              <dd className="mt-1 font-semibold text-slate-900">
                {professionalProfile
                  ?.profession ||
                  "Non indicata"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Specializzazione
              </dt>

              <dd className="mt-1 font-semibold text-slate-900">
                {professionalProfile
                  ?.specialization ||
                  "Non indicata"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Località
              </dt>

              <dd className="mt-1 font-semibold text-slate-900">
                {location}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email account
              </dt>

              <dd className="mt-1 break-all font-semibold text-slate-900">
                {profile.email ??
                  user.email ??
                  "Non disponibile"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}