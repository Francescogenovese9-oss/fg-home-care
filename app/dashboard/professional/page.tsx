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

type PaymentStatus =
  | "NOT_REQUIRED"
  | "REQUIRES_PAYMENT"
  | "PROCESSING"
  | "PAID"
  | "PAYMENT_FAILED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

type AppointmentSummary = {
  id: string;

  status: AppointmentStatus;

  payment_status: PaymentStatus;

  appointment_date: string;
  appointment_time: string;

  patient_id: string;

  subtotal_amount: number | null;
  platform_fee_amount: number | null;
  professional_amount: number | null;
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

  stripe_transfers_enabled: boolean;

  stripe_payouts_enabled: boolean;

  subscription_plan: "BASIC" | "PREMIUM" | null;
  subscription_status: string | null;
};

type ReviewStats = {
  user_id: string;

  review_count: number;

  average_rating:
    | number
    | string
    | null;

  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
};

function formatMoney(
  amountInCents: number,
  currency = "EUR"
) {
  return new Intl.NumberFormat(
    "it-IT",
    {
      style: "currency",
      currency,
    }
  ).format(
    amountInCents / 100
  );
}

export default async function ProfessionalDashboardPage() {
  const supabase =
    await createClient();

  /*
   * =====================================================
   * UTENTE
   * =====================================================
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
   * =====================================================
   * PROFILO ACCOUNT
   * =====================================================
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
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (profileError) {
    console.error(
      "Errore lettura profilo professionista:",
      profileError
    );
  }

  if (!profile) {
    redirect("/login");
  }

  if (
    profile.role ===
    "PATIENT"
  ) {
    redirect(
      "/dashboard/patient"
    );
  }

  if (
    profile.role ===
    "ADMIN"
  ) {
    redirect(
      "/dashboard/admin"
    );
  }

  if (
    profile.role !==
    "PROFESSIONAL"
  ) {
    redirect("/login");
  }

  /*
   * =====================================================
   * PROFILO PROFESSIONALE
   * =====================================================
   */

  const {
    data: professionalProfileData,
    error: professionalProfileError,
  } = await supabase
    .from(
      "professional_profiles"
    )
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
        stripe_transfers_enabled,
        stripe_payouts_enabled,

        subscription_plan,
        subscription_status
      `
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (
    professionalProfileError
  ) {
    console.error(
      "Errore lettura profilo professionale:",
      professionalProfileError
    );
  }

  const professionalProfile =
    professionalProfileData as
      | ProfessionalProfile
      | null;

  /*
   * =====================================================
   * RECENSIONI - SPRINT 5.2B
   * =====================================================
   */

  const {
    data: reviewStatsData,
    error: reviewStatsError,
  } = await supabase
    .from(
      "professional_review_stats"
    )
    .select(
      `
        user_id,
        review_count,
        average_rating,
        five_star_count,
        four_star_count,
        three_star_count,
        two_star_count,
        one_star_count
      `
    )
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (reviewStatsError) {
    console.error(
      "Errore statistiche recensioni dashboard:",
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

  const reviewStats =
    reviewStatsData as
      | ReviewStats
      | null;

  const reviewCount =
    Number(
      reviewStats
        ?.review_count ??
      0
    );

  const averageRating =
    reviewStats
      ?.average_rating !==
        null &&
    reviewStats
      ?.average_rating !==
        undefined
      ? Number(
          reviewStats.average_rating
        )
      : 0;

  const fiveStarCount =
    Number(
      reviewStats
        ?.five_star_count ??
      0
    );

  const fiveStarPercentage =
    reviewCount > 0
      ? Math.round(
          (
            fiveStarCount /
            reviewCount
          ) *
            100
        )
      : 0;

  /*
   * =====================================================
   * APPUNTAMENTI
   * =====================================================
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
        payment_status,

        appointment_date,
        appointment_time,

        patient_id,

        subtotal_amount,
        platform_fee_amount,
        professional_amount
      `
    )
    .eq(
      "professional_id",
      user.id
    )
    .order(
      "appointment_date",
      {
        ascending: true,
      }
    )
    .order(
      "appointment_time",
      {
        ascending: true,
      }
    );

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
   * =====================================================
   * CONTATORI APPUNTAMENTI
   * =====================================================
   */

  const pendingCount =
    appointments.filter(
      (appointment) =>
        appointment.status ===
        "PENDING"
    ).length;

  const acceptedCount =
    appointments.filter(
      (appointment) =>
        appointment.status ===
        "ACCEPTED"
    ).length;

  const completedCount =
    appointments.filter(
      (appointment) =>
        appointment.status ===
        "COMPLETED"
    ).length;

  const paidCount =
    appointments.filter(
      (appointment) =>
        appointment.payment_status ===
        "PAID"
    ).length;

  /*
   * =====================================================
   * RIEPILOGO ECONOMICO RAPIDO
   * =====================================================
   */

  const professionalEarnings =
    appointments
      .filter(
        (appointment) =>
          appointment.payment_status ===
          "PAID"
      )
      .reduce(
        (
          total,
          appointment
        ) =>
          total +
          (
            appointment
              .professional_amount ??
            0
          ),
        0
      );

  /*
   * =====================================================
   * PROSSIMO APPUNTAMENTO
   * =====================================================
   */

  const now =
    new Date();

  const nextAppointment =
    appointments.find(
      (appointment) => {
        if (
          appointment.status !==
            "PENDING" &&
          appointment.status !==
            "ACCEPTED"
        ) {
          return false;
        }

        const appointmentDateTime =
          new Date(
            `${appointment.appointment_date}T${appointment.appointment_time}`
          );

        return (
          !Number.isNaN(
            appointmentDateTime.getTime()
          ) &&
          appointmentDateTime.getTime() >=
            now.getTime()
        );
      }
    ) ?? null;

  let nextPatientName =
    "Paziente";

  if (nextAppointment) {
    const {
      data: patientProfile,
      error:
        patientProfileError,
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

    if (
      patientProfileError
    ) {
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
          .join(" ") ||
        "Paziente";
    }
  }

  /*
   * =====================================================
   * INDISPONIBILITÀ
   * =====================================================
   */

  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10
      );

  const {
    count:
      futureUnavailabilityCount,

    error:
      unavailabilityCountError,
  } = await supabase
    .from(
      "professional_unavailability"
    )
    .select(
      "id",
      {
        count:
          "exact",

        head:
          true,
      }
    )
    .eq(
      "professional_id",
      user.id
    )
    .gte(
      "unavailable_date",
      today
    );

  if (
    unavailabilityCountError
  ) {
    console.error(
      "Errore conteggio indisponibilità:",
      unavailabilityCountError
    );
  }

  /*
   * =====================================================
   * NOTIFICHE
   * =====================================================
   */

  const {
    count:
      unreadNotificationCount,

    error:
      unreadNotificationsError,
  } = await supabase
    .from(
      "notifications"
    )
    .select(
      "id",
      {
        count:
          "exact",

        head:
          true,
      }
    )
    .eq(
      "user_id",
      user.id
    )
    .eq(
      "read",
      false
    );

  if (
    unreadNotificationsError
  ) {
    console.error(
      "Errore conteggio notifiche:",
      unreadNotificationsError
    );
  }

  const {
    data:
      recentNotificationsData,

    error:
      recentNotificationsError,
  } = await supabase
    .from(
      "notifications"
    )
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
    .eq(
      "user_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    )
    .limit(
      5
    );

  if (
    recentNotificationsError
  ) {
    console.error(
      "Errore lettura notifiche recenti:",
      recentNotificationsError
    );
  }

  const recentNotifications =
    (recentNotificationsData ??
      []) as NotificationPreview[];

  /*
   * =====================================================
   * DATI DISPLAY
   * =====================================================
   */

  const displayName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Professionista";

  const nextAppointmentDate =
    nextAppointment
      ? new Intl.DateTimeFormat(
          "it-IT",
          {
            weekday:
              "long",

            day:
              "2-digit",

            month:
              "long",

            year:
              "numeric",
          }
        ).format(
          new Date(
            `${nextAppointment.appointment_date}T12:00:00`
          )
        )
      : null;

  const nextAppointmentTime =
    nextAppointment
      ?.appointment_time
      .slice(
        0,
        5
      ) ??
    null;

  /*
   * =====================================================
   * STATO PROFILO
   * =====================================================
   */

  const verificationStatus =
    professionalProfile
      ?.verification_status ??
    "PENDING";

  const isProfileComplete =
    professionalProfile
      ?.profile_completed ??
    false;

  const documentsSubmitted =
    professionalProfile
      ?.documents_submitted ??
    false;

  const isPublished =
    professionalProfile
      ?.published ??
    false;

  const location =
    [
      professionalProfile
        ?.city,

      professionalProfile
        ?.province,
    ]
      .filter(Boolean)
      .join(", ") ||
    "Non indicata";

  /*
   * =====================================================
   * STRIPE
   * =====================================================
   */

  const stripeConnected =
    Boolean(
      professionalProfile
        ?.stripe_account_id
    );

  const stripeReady =
    Boolean(
      professionalProfile
        ?.stripe_onboarding_completed &&
        professionalProfile
          ?.stripe_transfers_enabled
    );

  return (
    <main className="min-h-screen bg-slate-50">
      {/* =================================================
          HEADER
      ================================================= */}

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

            <Link
              href="/dashboard/professional/earnings"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Incassi
            </Link>

            {/* SPRINT 5.2B */}

            <Link
              href="/dashboard/professional/reviews"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Recensioni
            </Link>

            <Link
              href="/dashboard/professional/payments"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Pagamenti
            </Link>

            <NotificationBell
              userId={
                user.id
              }
              initialUnreadCount={
                unreadNotificationCount ??
                0
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
        {/* =================================================
            HERO
        ================================================= */}

        <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-blue-900 p-8 text-white shadow-lg">
          <p className="text-sm font-semibold text-blue-100">
            Benvenuto
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            {displayName}
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-blue-100">
            Gestisci il tuo profilo,
            controlla le richieste ricevute,
            organizza la tua agenda,
            monitora gli incassi e consulta
            le recensioni dei pazienti.
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
              href="/dashboard/professional/earnings"
              className="inline-flex rounded-xl border border-blue-300 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Visualizza incassi
            </Link>

            {/* SPRINT 5.2B */}

            <Link
              href="/dashboard/professional/reviews"
              className="inline-flex rounded-xl border border-blue-300 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Visualizza recensioni
            </Link>
          </div>
        </section>

        {/* =================================================
            PIANO PROFESSIONALE
        ================================================= */}

        {professionalProfile?.subscription_plan === "PREMIUM" &&
        professionalProfile?.subscription_status === "active" ? (
          <section className="mt-8 rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Piano professionale
                </p>

                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  Premium
                </h3>

                <p className="mt-2 text-sm text-slate-600">
                  19,90 &euro;/mese - commissione base 8%, riducibile fino al 5% con la continuità assistenziale.
                </p>
              </div>

              <Link
                href="/dashboard/professional/payments"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Gestisci piano
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border-2 border-blue-300 bg-white p-7 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                    Piano attuale: Basic
                  </p>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                    </span>
                </div>

                <h3 className="mt-3 text-2xl font-bold text-slate-900">
                  Commissione Basic: 15% fisso
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Con il piano Basic non è previsto alcun canone mensile.
                  FG Home Care applica una commissione fissa del 15% su ogni
                  prestazione, senza riduzioni per prenotazioni ripetute.
                </p>

                <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                  <p className="font-semibold text-blue-950">
                    Piano Premium
                  </p>

                  <p className="mt-1 text-sm leading-6 text-blue-900">
                    19,90 &euro; al mese con commissione iniziale dell&apos;8%, riducibile fino al 5%.
                    Include inoltre maggiore visibilita nei risultati,
                    badge Premium, statistiche avanzate e supporto prioritario.
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/professional/payments"
                className="inline-flex min-w-52 justify-center rounded-2xl bg-blue-700 px-6 py-4 text-base font-bold text-white shadow-sm transition hover:bg-blue-800"
              >
                Passa a Premium
              </Link>
            </div>
          </section>
        )}

        {/* =================================================
            KPI
        ================================================= */}

        <section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-6">
          {/* IN ATTESA */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-amber-700">
              In attesa
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900">
              {pendingCount}
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Richieste ancora da
              accettare o rifiutare.
            </p>

            <Link
              href="/dashboard/professional/appointments?status=PENDING"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Visualizza
            </Link>
          </article>

          {/* ACCETTATE */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-green-700">
              Accettate
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900">
              {acceptedCount}
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Prestazioni confermate
              e ancora da completare.
            </p>

            <Link
              href="/dashboard/professional/appointments?status=ACCEPTED"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Visualizza
            </Link>
          </article>

          {/* COMPLETATE */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Completate
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900">
              {completedCount}
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Prestazioni concluse
              nella piattaforma.
            </p>

            <Link
              href="/dashboard/professional/appointments?status=COMPLETED"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Storico
            </Link>
          </article>

          {/* PAGATE */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-purple-700">
              Pagate
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900">
              {paidCount}
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Prestazioni con
              pagamento confermato.
            </p>

            <Link
              href="/dashboard/professional/earnings"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Incassi
            </Link>
          </article>

          {/* RECENSIONI - NUOVO */}

          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <p className="text-sm font-semibold text-amber-700">
              Recensioni
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-3xl text-amber-500">
                ★
              </span>

              <p className="text-3xl font-bold text-amber-950">
                {reviewCount > 0
                  ? averageRating.toFixed(
                      1
                    )
                  : "—"}
              </p>
            </div>

            <p className="mt-2 text-sm text-amber-800">
              {reviewCount > 0
                ? `${reviewCount} ${
                    reviewCount ===
                    1
                      ? "recensione"
                      : "recensioni"
                  }`
                : "Nessuna recensione"}
            </p>

            <Link
              href="/dashboard/professional/reviews"
              className="mt-5 inline-flex text-sm font-semibold text-amber-800 hover:underline"
            >
              Visualizza
            </Link>
          </article>

          {/* NETTO */}

          <article className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <p className="text-sm font-semibold text-green-700">
              Netto maturato
            </p>

            <p className="mt-3 text-3xl font-bold text-green-900">
              {formatMoney(
                professionalEarnings
              )}
            </p>

            <p className="mt-2 text-sm text-green-700">
              Quota professionista
              sulle prestazioni pagate.
            </p>

            <Link
              href="/dashboard/professional/earnings"
              className="mt-5 inline-flex text-sm font-semibold text-green-800 hover:underline"
            >
              Dettaglio
            </Link>
          </article>
        </section>

        {/* =================================================
            REPUTAZIONE - NUOVO SPRINT 5.2B
        ================================================= */}

        <section className="mt-8 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-7 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-amber-700">
                Reputazione professionale
              </p>

              <h3 className="mt-2 text-2xl font-bold text-slate-900">
                Le tue recensioni
              </h3>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Consulta le valutazioni
                lasciate dai pazienti dopo
                prestazioni completate e
                verificate tramite FG Home
                Care.
              </p>
            </div>

            {reviewCount > 0 ? (
              <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-sm">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl text-amber-500">
                    ★
                  </span>

                  <strong className="text-4xl text-slate-900">
                    {averageRating.toFixed(
                      1
                    )}
                  </strong>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  su 5
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-300 bg-white px-6 py-5 text-center">
                <p className="text-sm font-semibold text-slate-600">
                  Nessuna recensione
                </p>
              </div>
            )}
          </div>

          {reviewCount > 0 && (
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Media
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  ★{" "}
                  {averageRating.toFixed(
                    1
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recensioni
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {reviewCount}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  5 stelle
                </p>

                <p className="mt-2 text-2xl font-bold text-green-700">
                  {
                    fiveStarPercentage
                  }
                  %
                </p>
              </div>
            </div>
          )}

          <Link
            href="/dashboard/professional/reviews"
            className="mt-7 inline-flex rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Apri dashboard recensioni
          </Link>
        </section>

        {/* =================================================
            PROSSIMO APPUNTAMENTO + PROFILO
        ================================================= */}

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
                    {
                      nextAppointmentDate
                    }
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Orario
                  </p>

                  <p className="mt-2 font-bold text-slate-900">
                    {
                      nextAppointmentTime
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <p className="text-sm leading-6 text-slate-600">
                  Non risultano richieste
                  future in attesa o già
                  accettate.
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

          {/* STATO PROFILO */}

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

        {/* =================================================
            STRIPE + INCASSI
        ================================================= */}

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          {/* INCASSI */}

          <article className="rounded-3xl border border-green-200 bg-green-50 p-7 shadow-sm">
            <p className="text-sm font-semibold text-green-700">
              Area economica
            </p>

            <h3 className="mt-2 text-2xl font-bold text-green-950">
              Incassi
            </h3>

            <p className="mt-3 text-sm leading-6 text-green-800">
              Consulta prestazioni pagate,
              commissioni della piattaforma
              e quota economica maturata.
            </p>

            <div className="mt-6 rounded-2xl bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Netto attualmente maturato
              </p>

              <p className="mt-2 text-3xl font-bold text-green-800">
                {formatMoney(
                  professionalEarnings
                )}
              </p>
            </div>

            <Link
              href="/dashboard/professional/earnings"
              className="mt-6 inline-flex rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
            >
              Visualizza incassi
            </Link>
          </article>

          {/* STRIPE */}

          <article className="rounded-3xl border border-blue-200 bg-blue-50 p-7 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Stripe Connect
            </p>

            <h3 className="mt-2 text-2xl font-bold text-blue-950">
              Pagamenti
            </h3>

            <p className="mt-3 text-sm leading-6 text-blue-800">
              Collega Stripe e controlla lo
              stato dell&apos;account
              utilizzato per ricevere gli
              accrediti.
            </p>

            <div className="mt-6 space-y-3 rounded-2xl bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-600">
                  Account collegato
                </span>

                <span
                  className={
                    stripeConnected
                      ? "font-semibold text-green-700"
                      : "font-semibold text-amber-700"
                  }
                >
                  {stripeConnected
                    ? "Sì"
                    : "No"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-600">
                  Trasferimenti
                </span>

                <span
                  className={
                    stripeReady
                      ? "font-semibold text-green-700"
                      : "font-semibold text-amber-700"
                  }
                >
                  {stripeReady
                    ? "Attivi"
                    : "Da configurare"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-600">
                  Accrediti
                </span>

                <span
                  className={
                    professionalProfile
                      ?.stripe_payouts_enabled
                      ? "font-semibold text-green-700"
                      : "font-semibold text-amber-700"
                  }
                >
                  {professionalProfile
                    ?.stripe_payouts_enabled
                    ? "Attivi"
                    : "Non attivi"}
                </span>
              </div>
            </div>

            <Link
              href="/dashboard/professional/payments"
              className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Configura pagamenti
            </Link>
          </article>
        </section>

        {/* =================================================
            AZIONI PRINCIPALI
        ================================================= */}

        <section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-6">
          {/* PROFILO */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Profilo professionale
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Modifica professione,
              specializzazione, tariffa,
              disponibilità e raggio
              d&apos;intervento.
            </p>

            <Link
              href="/dashboard/professional/profile"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Modifica profilo
            </Link>
          </article>

          {/* RICHIESTE */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Richieste ricevute
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Accetta, rifiuta o completa
              le richieste inviate dai
              pazienti.
            </p>

            <Link
              href="/dashboard/professional/appointments"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Gestisci richieste
            </Link>
          </article>

          {/* AGENDA */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Agenda professionale
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Visualizza gli appuntamenti
              e blocca giorni o fasce
              orarie.
            </p>

            <Link
              href="/dashboard/professional/calendar"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Apri agenda
            </Link>
          </article>

          {/* INCASSI */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Incassi
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Consulta prestazioni pagate,
              commissioni e quota economica
              maturata.
            </p>

            <Link
              href="/dashboard/professional/earnings"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Visualizza incassi
            </Link>
          </article>

          {/* RECENSIONI - NUOVA */}

          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Recensioni
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Consulta valutazione media,
              distribuzione delle stelle e
              commenti dei pazienti.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="text-xl text-amber-500">
                ★
              </span>

              <span className="font-bold text-slate-900">
                {reviewCount > 0
                  ? averageRating.toFixed(
                      1
                    )
                  : "—"}
              </span>

              <span className="text-xs text-slate-500">
                ({reviewCount})
              </span>
            </div>

            <Link
              href="/dashboard/professional/reviews"
              className="mt-5 inline-flex text-sm font-semibold text-amber-800 hover:underline"
            >
              Gestisci recensioni
            </Link>
          </article>

          {/* NOTIFICHE */}

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Notifiche
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Visualizza gli aggiornamenti
              sulle richieste, messaggi
              e prestazioni.
            </p>

            <Link
              href="/dashboard/notifications"
              className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
            >
              Visualizza notifiche
            </Link>
          </article>
        </section>

        {/* =================================================
            INDISPONIBILITÀ
        ================================================= */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Agenda
              </p>

              <h3 className="mt-1 text-xl font-bold text-slate-900">
                Indisponibilità future
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                Hai attualmente{" "}
                <strong>
                  {futureUnavailabilityCount ??
                    0}
                </strong>{" "}
                blocchi futuri nella tua
                agenda.
              </p>
            </div>

            <Link
              href="/dashboard/professional/calendar"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Gestisci agenda
            </Link>
          </div>
        </section>

        {/* =================================================
            INFO PROFESSIONISTA
        ================================================= */}

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
