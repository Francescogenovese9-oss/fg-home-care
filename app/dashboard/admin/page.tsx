import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";

import NotificationBell, {
  type NotificationPreview,
} from "@/components/notifications/NotificationBell";

import { createClient } from "@/lib/supabase/server";
import { calculateTrustScore } from "@/lib/security/trust-score";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ProfessionalVerificationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

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

type ProfessionalProfileRecord = {
  user_id: string;

  verification_status:
    ProfessionalVerificationStatus;

  profile_completed: boolean;

  documents_submitted: boolean;

  published: boolean;

  subscription_plan:
    | "BASIC"
    | "PREMIUM"
    | null;

  subscription_status:
    | string
    | null;

  subscription_cancel_at_period_end:
    | boolean
    | null;
};

type AppointmentRecord = {
  id: string;

  booking_source: "DIRECT" | "CARE_GUIDANCE";

  status: AppointmentStatus;

  payment_status: PaymentStatus;

  subtotal_amount:
    | number
    | null;

  platform_fee_amount:
    | number
    | null;

  professional_amount:
    | number
    | null;
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

export default async function AdminDashboardPage() {
  const supabase =
    await createClient();

  /*
   * =====================================================
   * AUTENTICAZIONE
   * =====================================================
   */

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    console.error(
      "Errore autenticazione dashboard admin:",
      userError
    );
  }

  if (!user) {
    redirect(
      "/login?redirect=/dashboard/admin"
    );
  }

  /*
   * =====================================================
   * PROFILO ADMIN
   * =====================================================
   */

  const {
    data: profile,
    error:
      profileError,
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
      "Errore lettura profilo admin:",
      profileError
    );
  }

  if (!profile) {
    redirect(
      "/login"
    );
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
    "PROFESSIONAL"
  ) {
    redirect(
      "/dashboard/professional"
    );
  }

  if (
    profile.role !==
    "ADMIN"
  ) {
    redirect(
      "/login"
    );
  }

  /*
   * =====================================================
   * NOTIFICHE ADMIN - SPRINT 5.3
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
      "Errore conteggio notifiche Admin:",
      {
        message:
          unreadNotificationsError.message,

        code:
          unreadNotificationsError.code,

        details:
          unreadNotificationsError.details,

        hint:
          unreadNotificationsError.hint,
      }
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
      "Errore lettura notifiche recenti Admin:",
      {
        message:
          recentNotificationsError.message,

        code:
          recentNotificationsError.code,

        details:
          recentNotificationsError.details,

        hint:
          recentNotificationsError.hint,
      }
    );
  }

  const recentNotifications =
    (
      recentNotificationsData ??
      []
    ) as NotificationPreview[];

  /*
   * =====================================================
   * CONTEGGIO UTENTI
   * =====================================================
   */

  const {
    count:
      patientCount,

    error:
      patientCountError,
  } = await supabase
    .from(
      "profiles"
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
      "role",
      "PATIENT"
    );

  if (
    patientCountError
  ) {
    console.error(
      "Errore conteggio pazienti:",
      patientCountError
    );
  }

  const {
    count:
      professionalCount,

    error:
      professionalCountError,
  } = await supabase
    .from(
      "profiles"
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
      "role",
      "PROFESSIONAL"
    );

  if (
    professionalCountError
  ) {
    console.error(
      "Errore conteggio professionisti:",
      professionalCountError
    );
  }

  /*
   * =====================================================
   * PROFESSIONISTI
   * =====================================================
   */

  const {
    data:
      professionalProfilesData,

    error:
      professionalProfilesError,
  } = await supabase
    .from(
      "professional_profiles"
    )
    .select(
      `
        user_id,
        verification_status,
        profile_completed,
        documents_submitted,
        published,
        subscription_plan,
        subscription_status,
        subscription_cancel_at_period_end
      `
    );

  if (
    professionalProfilesError
  ) {
    console.error(
      "Errore lettura profili professionisti:",
      professionalProfilesError
    );
  }

  const professionalProfiles =
    (
      professionalProfilesData ??
      []
    ) as ProfessionalProfileRecord[];

  const pendingVerificationCount =
    professionalProfiles.filter(
      (
        professional
      ) =>
        professional.verification_status ===
        "PENDING"
    ).length;

  const approvedProfessionalCount =
    professionalProfiles.filter(
      (
        professional
      ) =>
        professional.verification_status ===
        "APPROVED"
    ).length;

  const rejectedProfessionalCount =
    professionalProfiles.filter(
      (
        professional
      ) =>
        professional.verification_status ===
        "REJECTED"
    ).length;

  const publishedProfessionalCount =
    professionalProfiles.filter(
      (
        professional
      ) =>
        professional.published
    ).length;

  const basicProfessionalCount =
    professionalProfiles.filter(
      (professional) =>
        professional.subscription_plan !== "PREMIUM"
    ).length;

  const activePremiumCount =
    professionalProfiles.filter(
      (professional) =>
        professional.subscription_plan === "PREMIUM" &&
        professional.subscription_status === "active"
    ).length;

  const cancellingPremiumCount =
    professionalProfiles.filter(
      (professional) =>
        professional.subscription_plan === "PREMIUM" &&
        professional.subscription_status === "active" &&
        professional.subscription_cancel_at_period_end === true
    ).length;

  const premiumMonthlyRevenueCents =
    activePremiumCount * 1990;

  /*
   * =====================================================
   * PRENOTAZIONI
   * =====================================================
   */

  const {
    data:
      appointmentsData,

    error:
      appointmentsError,
  } = await supabase
    .from(
      "appointments"
    )
    .select(
      `
        id,
        booking_source,
        status,
        payment_status,
        subtotal_amount,
        platform_fee_amount,
        professional_amount
      `
    );

  if (
    appointmentsError
  ) {
    console.error(
      "Errore lettura appuntamenti admin:",
      appointmentsError
    );
  }

  const appointments =
    (
      appointmentsData ??
      []
    ) as AppointmentRecord[];

  const pendingAppointmentsCount =
    appointments.filter(
      (
        appointment
      ) =>
        appointment.status ===
        "PENDING"
    ).length;

  const acceptedAppointmentsCount =
    appointments.filter(
      (
        appointment
      ) =>
        appointment.status ===
        "ACCEPTED"
    ).length;

  const completedAppointmentsCount =
    appointments.filter(
      (
        appointment
      ) =>
        appointment.status ===
        "COMPLETED"
    ).length;

  /*
   * =====================================================
   * ASSISTENZA PERSONALIZZATA
   * =====================================================
   */

  const {
    data: careGuidanceEventsData,
    error: careGuidanceEventsError,
  } = await supabase
    .from("care_guidance_events")
    .select("event_type");

  if (careGuidanceEventsError) {
    console.error(
      "Errore lettura eventi assistenza personalizzata:",
      careGuidanceEventsError
    );
  }

  const careGuidanceEvents =
    careGuidanceEventsData ?? [];

  const careGuidanceUsesCount =
    careGuidanceEvents.filter(
      (event) =>
        event.event_type === "GUIDANCE_USED"
    ).length;

  const careGuidanceMarketplaceViewsCount =
    careGuidanceEvents.filter(
      (event) =>
        event.event_type === "PROFESSIONALS_VIEWED"
    ).length;

  const careGuidanceAppointments =
    appointments.filter(
      (appointment) =>
        appointment.booking_source === "CARE_GUIDANCE"
    );

  const careGuidanceAppointmentsCount =
    careGuidanceAppointments.length;

  const careGuidancePaidAppointments =
    careGuidanceAppointments.filter(
      (appointment) =>
        appointment.payment_status === "PAID"
    );

  const careGuidancePaidCount =
    careGuidancePaidAppointments.length;

  const careGuidancePaidConversionPercent =
    careGuidanceAppointmentsCount > 0
      ? Math.round(
          (careGuidancePaidCount /
            careGuidanceAppointmentsCount) * 100
        )
      : 0;

  const careGuidancePlatformFees =
    careGuidancePaidAppointments.reduce(
      (total, appointment) =>
        total + (appointment.platform_fee_amount ?? 0),
      0
    );

  /*
   * =====================================================
   * DATI ECONOMICI RAPIDI
   * =====================================================
   */

  const paidAppointments =
    appointments.filter(
      (
        appointment
      ) =>
        appointment.payment_status ===
        "PAID"
    );

  const refundedAppointments =
    appointments.filter(
      (
        appointment
      ) =>
        appointment.payment_status ===
          "REFUNDED" ||
        appointment.payment_status ===
          "PARTIALLY_REFUNDED"
    );

  const grossVolume =
    paidAppointments.reduce(
      (
        total,
        appointment
      ) =>
        total +
        (
          appointment.subtotal_amount ??
          0
        ),
      0
    );

  const platformFees =
    paidAppointments.reduce(
      (
        total,
        appointment
      ) =>
        total +
        (
          appointment.platform_fee_amount ??
          0
        ),
      0
    );

  const professionalVolume =
    paidAppointments.reduce(
      (
        total,
        appointment
      ) =>
        total +
        (
          appointment.professional_amount ??
          0
        ),
      0
    );

  const refundedVolume =
    refundedAppointments.reduce(
      (
        total,
        appointment
      ) =>
        total +
        (
          appointment.subtotal_amount ??
          0
        ),
      0
    );

  /*
   * =====================================================
   * SICUREZZA - TENTATIVI OFF-PLATFORM
   * =====================================================
   */

  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: offPlatformAttemptsData,
    error: offPlatformAttemptsError,
  } = await supabaseAdmin
    .from("off_platform_contact_attempts")
    .select("sender_id, created_at, detected_types");

  if (offPlatformAttemptsError) {
    console.error(
      "Errore lettura tentativi off-platform:",
      offPlatformAttemptsError
    );
  }

  const offPlatformAttempts =
    offPlatformAttemptsData ?? [];

  const offPlatformAttemptsCount =
    offPlatformAttempts.length;

  const offPlatformUsersCount =
    new Set(
      offPlatformAttempts.map(
        (attempt) => attempt.sender_id
      )
    ).size;

  const sevenDaysAgo =
    Date.now() - 7 * 24 * 60 * 60 * 1000;

  const recentOffPlatformAttemptsCount =
    offPlatformAttempts.filter(
      (attempt) =>
        new Date(attempt.created_at).getTime() >=
        sevenDaysAgo
    ).length;

  const offPlatformAttemptsByUser =
    new Map<string, number>();

  for (const attempt of offPlatformAttempts) {
    offPlatformAttemptsByUser.set(
      attempt.sender_id,
      (offPlatformAttemptsByUser.get(
        attempt.sender_id
      ) ?? 0) + 1
    );
  }

  const trustScoreBase =
    Array.from(
      offPlatformAttemptsByUser.entries()
    );

  const trustScoreUserIds =
    trustScoreBase.map(
      ([userId]) => userId
    );

  let trustProfilesMap =
    new Map<
      string,
      {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        role: string | null;
      }
    >();

  if (trustScoreUserIds.length > 0) {
    const {
      data: trustProfilesData,
      error: trustProfilesError,    } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, email, role"
      )
      .in("id", trustScoreUserIds);

    if (trustProfilesError) {
      console.error(
        "Errore lettura profili Trust Score:",
        trustProfilesError
      );
    }

    trustProfilesMap = new Map(
      (trustProfilesData ?? []).map(
        (profile) => [
          profile.id,
          {
            first_name:
              profile.first_name ?? null,
            last_name:
              profile.last_name ?? null,
            email:
              profile.email ?? null,
            role:
              profile.role ?? null,
          },
        ]
      )
    );
  }

  const trustScoreUsers =
    trustScoreBase
      .map(
        ([userId, attemptsCount]) => {
          const trust =
            calculateTrustScore(
              attemptsCount
            );

          const userProfile =
            trustProfilesMap.get(
              userId
            );

          return {
            userId,
            attemptsCount,
            score: trust.score,
            level: trust.level,
            firstName:
              userProfile?.first_name ?? null,
            lastName:
              userProfile?.last_name ?? null,
            email:
              userProfile?.email ?? null,
            role:
              userProfile?.role ?? null,
          };
        }
      )
      .sort(
        (a, b) =>
          a.score - b.score
      );

  const nowMs = Date.now();

  const thirtyDaysAgo =
    nowMs - 30 * 24 * 60 * 60 * 1000;

  const fourteenDaysAgo =
    nowMs - 14 * 24 * 60 * 60 * 1000;

  const previousSevenDaysAttemptsCount =
    offPlatformAttempts.filter((attempt) => {
      const createdAt =
        new Date(attempt.created_at).getTime();

      return (
        createdAt >= fourteenDaysAgo &&
        createdAt < sevenDaysAgo
      );
    }).length;

  const lastThirtyDaysAttemptsCount =
    offPlatformAttempts.filter(
      (attempt) =>
        new Date(attempt.created_at).getTime() >=
        thirtyDaysAgo
    ).length;

  const weeklyAttemptsChangePercent =
    previousSevenDaysAttemptsCount === 0
      ? recentOffPlatformAttemptsCount > 0
        ? 100
        : 0
      : Math.round(
          (
            (
              recentOffPlatformAttemptsCount -
              previousSevenDaysAttemptsCount
            ) /
            previousSevenDaysAttemptsCount
          ) * 100
        );

  const detectedTypeCounts =
    new Map<string, number>();

  for (const attempt of offPlatformAttempts) {
    for (const detectedType of attempt.detected_types ?? []) {
      detectedTypeCounts.set(
        detectedType,
        (detectedTypeCounts.get(detectedType) ?? 0) + 1
      );
    }
  }

  const topDetectedTypes =
    Array.from(
      detectedTypeCounts.entries()
    )
      .map(([type, count]) => ({
        type,
        count,
      }))
      .sort(
        (a, b) =>
          b.count - a.count
      );

  const trustedUsersCount =
    trustScoreUsers.filter(
      (item) =>
        item.level === "TRUSTED"
    ).length;

  const attentionUsersCount =
    trustScoreUsers.filter(
      (item) =>
        item.level === "ATTENTION"
    ).length;

  const highRiskUsersCount =
    trustScoreUsers.filter(
      (item) =>
        item.level === "HIGH_RISK"
    ).length;

  const highestRiskUsers =
    trustScoreUsers
      .filter(
        (item) =>
          item.level === "HIGH_RISK" ||
          item.level === "ATTENTION"
      )
      .slice(0, 5);

  const detectedTypeLabels: Record<string, string> = {
    PHONE: "Telefono",
    EMAIL: "Email",
    URL: "Link esterno",
    USERNAME: "Username",
    WHATSAPP: "WhatsApp",
    TELEGRAM: "Telegram",
    FACEBOOK: "Facebook",
    INSTAGRAM: "Instagram",
    TIKTOK: "TikTok",
    TWITTER_X: "X / Twitter",
    MESSENGER: "Messenger",
    SNAPCHAT: "Snapchat",
    LINKEDIN: "LinkedIn",
    DISCORD: "Discord",
    IBAN: "IBAN",
    PAYPAL: "PayPal",
    SATISPAY: "Satispay",
    EXTERNAL_PAYMENT: "Pagamento esterno",
    CONTACT_REQUEST: "Richiesta contatto",
  };

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
      .filter(
        Boolean
      )
      .join(
        " "
      ) ||
    "Amministratore";

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

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
              Dashboard Admin
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard/admin/finance"
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              Finanza
            </Link>

            <Link
              href="/dashboard/admin/reviews"
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              Moderazione
            </Link>

            <Link
              href="/professionisti"
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              Marketplace
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
            INTRO
        ================================================= */}

        <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 p-8 text-white shadow-lg">
          <p className="text-sm font-semibold text-blue-200">
            Pannello amministrativo
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Ciao {displayName}
          </h2>

          <p className="mt-4 max-w-3xl leading-7 text-slate-200">
            Controlla professionisti,
            prenotazioni, verifiche,
            moderazione e andamento
            economico della piattaforma
            FG Home Care.
          </p>

          <div className="mt-7 flex flex-wrap gap-4">
            <Link
              href="/dashboard/admin/finance"
              className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-900 transition hover:bg-blue-50"
            >
              Apri controllo economico
            </Link>

            <Link
              href="/dashboard/admin/reviews"
              className="inline-flex rounded-xl border border-blue-300 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Modera recensioni
            </Link>

            <Link
              href="/professionisti"
              className="inline-flex rounded-xl border border-blue-300 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Visualizza marketplace
            </Link>
          </div>
        </section>

        {/* =================================================
            UTENTI
        ================================================= */}

        <section className="mt-8">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Utenti
            </p>

            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              Panoramica piattaforma
            </h3>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-blue-700">
                Pazienti
              </p>

              <p className="mt-3 text-4xl font-bold text-slate-900">
                {patientCount ??
                  0}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Account paziente
                registrati.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-green-700">
                Professionisti
              </p>

              <p className="mt-3 text-4xl font-bold text-slate-900">
                {professionalCount ??
                  0}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Account professionali
                registrati.
              </p>
            </article>

            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-amber-700">
                Da verificare
              </p>

              <p className="mt-3 text-4xl font-bold text-amber-900">
                {
                  pendingVerificationCount
                }
              </p>

              <p className="mt-2 text-sm text-amber-700">
                Professionisti in attesa
                di verifica.
              </p>
            </article>

            <article className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-purple-700">
                Pubblicati
              </p>

              <p className="mt-3 text-4xl font-bold text-purple-900">
                {
                  publishedProfessionalCount
                }
              </p>

              <p className="mt-2 text-sm text-purple-700">
                Profili attualmente
                visibili nel marketplace.
              </p>
            </article>
          </div>
        </section>

        {/* =================================================
            ABBONAMENTI PROFESSIONISTI
        ================================================= */}

        <section className="mt-10">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Abbonamenti
            </p>

            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              Piani professionisti
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Stato degli abbonamenti Basic e Premium registrati sulla piattaforma.
            </p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-600">
                Basic
              </p>

              <p className="mt-3 text-4xl font-bold text-slate-900">
                {basicProfessionalCount}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Professionisti con piano gratuito.
              </p>
            </article>

            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-blue-700">
                Premium attivi
              </p>

              <p className="mt-3 text-4xl font-bold text-blue-900">
                {activePremiumCount}
              </p>

              <p className="mt-2 text-sm text-blue-700">
                Abbonamenti Premium attualmente attivi.
              </p>
            </article>

            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-amber-700">
                In cancellazione
              </p>

              <p className="mt-3 text-4xl font-bold text-amber-900">
                {cancellingPremiumCount}
              </p>

              <p className="mt-2 text-sm text-amber-700">
                Premium attivi con cancellazione programmata.
              </p>
            </article>

            <article className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-green-700">
                MRR    mium
              </p>

              <p className="mt-3 text-3xl font-bold text-green-900">
                {formatMoney(
                  premiumMonthlyRevenueCents
                )}
              </p>

              <p className="mt-2 text-sm text-green-700">
                Ricavo mensile ricorrente teorico dagli abbonamenti attivi.
              </p>
            </article>
          </div>
        </section>

        {/* =================================================
            VERIFICA PROFESSIONISTI
        ================================================= */}

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Professionisti approvati
            </p>

            <p className="mt-2 text-3xl font-bold text-green-700">
              {
                approvedProfessionalCount
              }
            </p>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              In attesa di verifica
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-700">
              {
                pendingVerificationCount
              }
            </p>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Professionisti rifiutati
            </p>

            <p className="mt-2 text-3xl font-bold text-red-700">
              {
                rejectedProfessionalCount
              }
            </p>
          </article>
        </section>

        {/* =================================================
            PRENOTAZIONI
        ================================================= */}

        <section className="mt-10">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Prenotazioni
            </p>

            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              Attività sulla piattaforma
            </h3>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-amber-700">
                In attesa
              </p>

              <p className="mt-3 text-4xl font-bold text-amber-900">
                {
                  pendingAppointmentsCount
                }
              </p>
            </article>

            <article className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-green-700">
                Accettate
              </p>

              <p className="mt-3 text-4xl font-bold text-green-900">
                {
                  acceptedAppointmentsCount
                }
              </p>
            </article>

            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-blue-700">
                Completate
              </p>

              <p className="mt-3 text-4xl font-bold text-blue-900">
                {
                  completedAppointmentsCount
                }
              </p>
            </article>
          </div>
        </section>

        {/* =================================================
            ASSISTENZA PERSONALIZZATA
        ================================================= */}

        <section className="mt-10">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Assistenza personalizzata
            </p>

            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              Prenotazioni generate dal percorso assistito
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Risultati delle prenotazioni provenienti da Dicci di cosa hai bisogno.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-sky-700">
                Utilizzi
              </p>
              <p className="mt-3 text-4xl font-bold text-sky-900">
                {careGuidanceUsesCount}
              </p>
            </article>

            <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-indigo-700">
                Accessi ai professionisti
              </p>
              <p className="mt-3 text-4xl font-bold text-indigo-900">
                {careGuidanceMarketplaceViewsCount}
              </p>
            </article>

            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-blue-700">
                Prenotazioni generate
              </p>
              <p className="mt-3 text-4xl font-bold text-blue-900">
                {careGuidanceAppointmentsCount}
              </p>
            </article>

            <article className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-green-700">
                Prenotazioni pagate
              </p>
              <p className="mt-3 text-4xl font-bold text-green-900">
                {careGuidancePaidCount}
              </p>
            </article>

            <article className="rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-violet-700">
                Conversione al pagamento
              </p>
              <p className="mt-3 text-4xl font-bold text-violet-900">
                {careGuidancePaidConversionPercent}%
              </p>
            </article>

            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-emerald-700">
                Commissioni FG generate
              </p>
              <p className="mt-3 text-4xl font-bold text-emerald-900">
                {formatMoney(careGuidancePlatformFees)}
              </p>
            </article>
          </div>
        </section>

        {/* =================================================
            SICUREZZA PIATTAFORMA
        ================================================= */}

        <section className="mt-10">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Sicurezza piattaforma
            </p>

            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              Tentativi di contatto off-platform
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Monitoraggio dei tentativi di condividere contatti personali
              o pagamenti esterni prima del pagamento in piattaforma.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-red-700">
                Tentativi totali
              </p>

              <p className="mt-3 text-4xl font-bold text-red-900">
                {offPlatformAttemptsCount}
              </p>

              <p className="mt-2 text-sm text-red-700">
                Tentativi bloccati dal sistema.
              </p>
            </article>

            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-amber-700">
                Utenti coinvolti
              </p>

              <p className="mt-3 text-4xl font-bold text-amber-900">
                {offPlatformUsersCount}
              </p>

              <p className="mt-2 text-sm text-amber-700">
                Utenti distinti che hanno generato almeno un tentativo.
              </p>
            </article>

            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-blue-700">
                Ultimi 7 giorni
              </p>

              <p className="mt-3 text-4xl font-bold text-blue-900">
                {recentOffPlatformAttemptsCount}
              </p>

              <p className="mt-2 text-sm text-blue-700">
                Tentativi registrati nell'ultima settimana.
              </p>
            </article>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-600">
                Ultimi 30 giorni
              </p>

              <p className="mt-3 text-4xl font-bold text-slate-900">
                {lastThirtyDaysAttemptsCount}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Tentativi registrati negli ultimi 30 giorni.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-600">
                Variazione settimanale
              </p>

              <p
                className={`mt-3 text-4xl font-bold ${
                  weeklyAttemptsChangePercent > 0
                    ? "text-red-700"
                    : weeklyAttemptsChangePercent < 0
                      ? "text-green-700"
                      : "text-slate-900"
                }`}
              >
                {weeklyAttemptsChangePercent > 0 ? "+" : ""}
                {weeklyAttemptsChangePercent}%
              </p>

              <p className="mt-2 text-sm text-slate-500">
                {recentOffPlatformAttemptsCount} ultimi 7 giorni vs{" "}
                {previousSevenDaysAttemptsCount} nei 7 giorni precedenti.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-600">
                Distribuzione Trust Score
              </p>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Affidabili</span>
                  <span className="font-bold text-slate-900">
                    {trustedUsersCount}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-amber-700">Attenzione</span>
                  <span className="font-bold text-slate-900">
                    {attentionUsersCount}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-red-700">Rischio elevato</span>
                  <span className="font-bold text-slate-900">
                    {highRiskUsersCount}
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h4 className="font-bold text-slate-900">
              Tipologie di tentativo piu frequenti
            </h4>

            <p className="mt-1 text-sm text-slate-500">
              Classifica dei segnali rilevati nei tentativi bloccati.
            </p>
          </div>

          {topDetectedTypes.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-500">
              Nessuna tipologia rilevata.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topDetectedTypes.map((item) => {
                const percent =
                  offPlatformAttemptsCount > 0
                    ? Math.round(
                        (item.count / offPlatformAttemptsCount) * 100
                      )
                    : 0;

                return (
                  <div
                    key={item.type}
                    className="px-6 py-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {detectedTypeLabels[item.type] ?? item.type}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.count} rilevazioni
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">
                          {percent}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{
                          width: `${Math.min(percent, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h4 className="font-bold text-slate-900">
              Top 5 utenti piu a rischio
            </h4>

            <p className="mt-1 text-sm text-slate-500">
              Utenti con Trust Score piu basso tra quelli monitorati.
            </p>
          </div>

          {highestRiskUsers.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-500">
              Nessun utente attualmente in fascia di attenzione o rischio elevato.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {highestRiskUsers.map((item, index) => (
                <div
                  key={item.userId}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                      {index + 1}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900">
                        {[item.firstName, item.lastName]
                          .filter(Boolean)
                          .join(" ") || "Utente"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.email || "Email non disponibile"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.role === "PROFESSIONAL"
                          ? "Professionista"
                          : item.role === "PATIENT"
                            ? "Paziente"
                            : item.role || "Ruolo non disponibile"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      {item.score}/100
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.attemptsCount} tentativi
                    </p>

                    <span
                      className={
                        item.level === "HIGH_RISK"
                          ? "mt-2 inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                          : "mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                      }
                    >
                        {item.level === "HIGH_RISK"
                          ? "Rischio elevato"
                          : "Attenzione"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h4 className="font-bold text-slate-900">
              Trust Score utenti
            </h4>
          </div>

          {trustScoreUsers.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-500">
              Nessun tentativo off-platform registrato.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Utente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Tentativi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Trust Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Livello
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {trustScoreUsers.map((item) => (
                    <tr key={item.userId}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {[item.firstName, item.lastName]
                            .filter(Boolean)
                            .join(" ") || "Utente"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {item.email || "Email non disponibile"}
                        </div>

                        <div className="mt-1 text-xs font-medium text-slate-600">
                          {item.role === "PROFESSIONAL"
                            ? "Professionista"
                            : item.role === "PATIENT"
                              ? "Paziente"
                              : item.role || "Ruolo non disponibile"}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {item.attemptsCount}
                      </td>

                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {item.score}/100
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={
                            item.level === "HIGH_RISK"
                              ? "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                              : item.level === "ATTENTION"
                                ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                                : "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                          }
                        >
                          {item.level === "HIGH_RISK"
                            ? "Rischio elevato"
                            : item.level === "ATTENTION"
                              ? "Attenzione"
                              : "Affidabile"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* =================================================
            FINANZA
        ================================================= */}

        <section className="mt-10">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Finanza
            </p>

            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              Riepilogo economico
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Panoramica rapida dei
              pagamenti registrati sulla
              piattaforma.
            </p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Volume transato
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {formatMoney(
                  grossVolume
                )}
              </p>
            </article>

            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Commissioni FG
              </p>

              <p className="mt-3 text-3xl font-bold text-blue-900">
                {formatMoney(
                  platformFees
                )}
              </p>
            </article>

            <article className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Professionisti
              </p>

              <p className="mt-3 text-3xl font-bold text-green-900">
                {formatMoney(
                  professionalVolume
                )}
              </p>
            </article>

            <article className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                Rimborsi
              </p>

              <p className="mt-3 text-3xl font-bold text-purple-900">
                {formatMoney(
                  refundedVolume
                )}
              </p>
            </article>
          </div>

          <article className="mt-6 rounded-3xl border border-blue-200 bg-white p-7 shadow-sm">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <h4 className="text-xl font-bold text-slate-900">
                  Controllo economico
                </h4>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Consulta volume
                  transato, commissioni
                  FG Home Care, quote
                  professionisti,
                  rimborsi, andamento
                  mensile e storico delle
                  transazioni.
                </p>
              </div>

              <Link
                href="/dashboard/admin/finance"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Apri dashboard economica
              </Link>
            </div>
          </article>
        </section>

        {/* =================================================
            MODERAZIONE
        ================================================= */}

        <section className="mt-10 rounded-3xl border border-red-200 bg-red-50 p-7 shadow-sm">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold text-red-700">
                Moderazione
              </p>

              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                Recensioni e
                segnalazioni
              </h3>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Controlla le recensioni
                segnalate dai
                professionisti,
                verifica il contenuto e
                decidi se mantenere,
                nascondere o
                ripristinare una
                recensione.
              </p>
            </div>

            <Link
              href="/dashboard/admin/reviews"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              Apri moderazione
            </Link>
          </div>
        </section>

        {/* =================================================
            STRUMENTI ADMIN
        ================================================= */}

        <section className="mt-10">
          <p className="text-sm font-semibold text-blue-700">
            Amministrazione
          </p>

          <h3 className="mt-1 text-2xl font-bold text-slate-900">
            Strumenti
          </h3>

          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-slate-900">
                Verifica
                professionisti
              </h4>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Controlla profili e
                documenti prima della
                pubblicazione sul
                marketplace.
              </p>

              <Link
                href="/dashboard/admin/professionals"
                className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
              >
                Gestisci professionisti
              </Link>
            </article>

            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-slate-900">
                Moderazione
                recensioni
              </h4>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Gestisci segnalazioni,
                recensioni nascoste e
                decisioni di
                moderazione.
              </p>

              <Link
                href="/dashboard/admin/reviews"
                className="mt-5 inline-flex text-sm font-semibold text-red-700 hover:underline"
              >
                Gestisci recensioni
              </Link>
            </article>

            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-slate-900">
                Controllo economico
              </h4>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Consulta volume
                transato, commissioni
                FG Home Care, rimborsi
                e quote professionisti.
              </p>

              <Link
                href="/dashboard/admin/finance"
                className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
              >
                Apri dashboard economica
              </Link>
            </article>

            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-slate-900">
                Marketplace
              </h4>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Controlla i profili
                pubblicati e verifica il
                risultato visibile agli
                utenti.
              </p>

              <Link
                href="/professionisti"
                className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
              >
                Visualizza marketplace
              </Link>
            </article>
          </div>
        </section>

        {/* =================================================
            NOTIFICHE ADMIN
        ================================================= */}

        <section className="mt-10 rounded-3xl border border-blue-200 bg-white p-7 shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Notifiche
              </p>

              <h3 className="mt-1 text-xl font-bold text-slate-900">
                Centro notifiche Admin
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Hai{" "}
                <strong>
                  {unreadNotificationCount ??
                    0}
                </strong>{" "}
                {unreadNotificationCount ===
                1
                  ? "notifica non letta"
                  : "notifiche non lette"}.
              </p>
            </div>

            <Link
              href="/dashboard/notifications"
              className="inline-flex rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Visualizza notifiche
            </Link>
          </div>
        </section>

        {/* =================================================
            NOTA
        ================================================= */}

        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-7">
          <h3 className="font-bold text-amber-900">
            Dati economici
          </h3>

          <p className="mt-3 text-sm leading-6 text-amber-800">
            Le commissioni FG mostrate
            nella dashboard
            rappresentano la quota
            lorda della piattaforma.
            Non rappresentano ancora
            l&apos;utile netto, perché
            non sottraggono costi
            Stripe, imposte, eventuali
            contestazioni o altri costi
            operativi.
          </p>
        </section>
      </div>
    </main>
  );
}
