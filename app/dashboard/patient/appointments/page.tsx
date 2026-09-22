import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import ChatLink from "@/components/chat/ChatLink";
import CancelAppointmentButton from "@/components/appointments/CancelAppointmentButton";
import VideoConsultationButton from "@/components/appointments/VideoConsultationButton";
import AppointmentPaymentButton from "@/components/payments/AppointmentPaymentButton";
import CancelPaidAppointmentButton from "@/components/payments/CancelPaidAppointmentButton";
import ReviewForm from "@/components/reviews/ReviewForm";

import { createClient } from "@/lib/supabase/server";
import {
  getFollowUpRecommendation,
  getFollowUpSearchUrl,
} from "@/lib/follow-up-recommendations";

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

type ServiceType =
  | "HOME_VISIT"
  | "VIDEO_CONSULTATION";

type Appointment = {
  id: string;

  patient_id: string;
  professional_id: string;

  service_type: ServiceType;

  appointment_date: string;
  appointment_time: string;

  duration_minutes: number;

  hourly_rate: number | null;

  patient_notes: string | null;
  professional_notes: string | null;

  status: AppointmentStatus;
  payment_status: PaymentStatus;

  currency: string | null;

  subtotal_amount: number | null;
  platform_fee_amount: number | null;
  professional_amount: number | null;

  refund_amount: number | null;
  refund_percent: number | null;
  cancellation_policy: string | null;
  cancelled_at: string | null;

  stripe_payment_intent_id: string | null;

  created_at: string;
  updated_at: string;
};

type ProfessionalProfile = {
  user_id: string;

  first_name: string | null;
  last_name: string | null;

  profession: string | null;
  specialization: string | null;

  city: string | null;
  province: string | null;
};

type UnreadMessageRecord = {
  appointment_id: string;
};

type ReviewRecord = {
  appointment_id: string;
};

type SearchParams = {
  status?: string | string[];
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

const appointmentStatuses: AppointmentStatus[] = [
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

function getPaymentStatusLabel(
  status: PaymentStatus
) {
  switch (status) {
    case "REQUIRES_PAYMENT":
      return "Da pagare";

    case "PROCESSING":
      return "Pagamento in corso";

    case "PAID":
      return "Pagato";

    case "PAYMENT_FAILED":
      return "Pagamento non riuscito";

    case "CANCELLED":
      return "Pagamento annullato";

    case "REFUND_PENDING":
      return "Rimborso in corso";

    case "REFUNDED":
      return "Rimborsato";

    case "PARTIALLY_REFUNDED":
      return "Rimborso parziale";

    default:
      return "Pagamento non richiesto";
  }
}

function getPaymentStatusClass(
  status: PaymentStatus
) {
  switch (status) {
    case "PAID":
      return "border-green-200 bg-green-50 text-green-700";

    case "REQUIRES_PAYMENT":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "PROCESSING":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "PAYMENT_FAILED":
      return "border-red-200 bg-red-50 text-red-700";

    case "REFUND_PENDING":
      return "border-purple-200 bg-purple-50 text-purple-700";

    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "border-slate-300 bg-slate-100 text-slate-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-500";
  }
}

function getServiceLabel(
  serviceType: ServiceType
) {
  return serviceType ===
    "VIDEO_CONSULTATION"
    ? "Videoconsulto"
    : "Assistenza domiciliare";
}

function formatDate(
  date: string
) {
  return new Intl.DateTimeFormat(
    "it-IT",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${date}T12:00:00`
    )
  );
}

function formatMoney(
  amountInCents: number | null,
  currency = "EUR"
) {
  if (amountInCents === null) {
    return null;
  }

  return new Intl.NumberFormat(
    "it-IT",
    {
      style: "currency",
      currency:
        currency.toUpperCase(),
    }
  ).format(
    amountInCents / 100
  );
}

export default async function PatientAppointmentsPage({
  searchParams,
}: PageProps) {
  const supabase =
    await createClient();

  /*
   * UTENTE
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "Errore autenticazione prenotazioni paziente:",
      userError
    );
  }

  if (!user) {
    redirect(
      "/login?redirect=/dashboard/patient/appointments"
    );
  }

  /*
   * PROFILO
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
      "Errore lettura profilo paziente:",
      profileError
    );
  }

  if (!profile) {
    redirect("/login");
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
    profile.role ===
    "ADMIN"
  ) {
    redirect(
      "/dashboard/admin"
    );
  }

  if (
    profile.role !==
    "PATIENT"
  ) {
    redirect("/login");
  }

  /*
   * FILTRO STATO
   */
  const params =
    await searchParams;

  const requestedStatus =
    getSingleValue(
      params.status
    ).toUpperCase();

  const selectedStatus =
    appointmentStatuses.includes(
      requestedStatus as AppointmentStatus
    )
      ? (requestedStatus as AppointmentStatus)
      : null;

  /*
   * PRENOTAZIONI
   */
  let appointmentsQuery =
    supabase
      .from("appointments")
      .select(
        `
          id,

          patient_id,
          professional_id,

          service_type,

          appointment_date,
          appointment_time,

          duration_minutes,

          hourly_rate,

          patient_notes,
          professional_notes,

          status,
          payment_status,

          currency,

          subtotal_amount,
          platform_fee_amount,
          professional_amount,

          refund_amount,
          refund_percent,
          cancellation_policy,
          cancelled_at,

          stripe_payment_intent_id,

          created_at,
          updated_at
        `
      )
      .eq(
        "patient_id",
        user.id
      )
      .order(
        "appointment_date",
        {
          ascending: false,
        }
      )
      .order(
        "appointment_time",
        {
          ascending: false,
        }
      );

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
      {
        message:
          appointmentsError.message,

        code:
          appointmentsError.code,

        details:
          appointmentsError.details,

        hint:
          appointmentsError.hint,
      }
    );
  }

  const appointments =
    (appointmentsData ??
      []) as Appointment[];

  /*
   * PROFESSIONISTI
   */
  const professionalIds =
    Array.from(
      new Set(
        appointments.map(
          (appointment) =>
            appointment.professional_id
        )
      )
    );

  let professionals:
    ProfessionalProfile[] = [];

  if (
    professionalIds.length > 0
  ) {
    const {
      data: professionalsData,
      error:
        professionalsError,
    } = await supabase
      .from(
        "public_professionals"
      )
      .select(
        `
          user_id,
          first_name,
          last_name,
          profession,
          specialization,
          city,
          province
        `
      )
      .in(
        "user_id",
        professionalIds
      );

    if (professionalsError) {
      console.error(
        "Errore lettura professionisti prenotazioni:",
        professionalsError
      );
    }

    professionals =
      (professionalsData ??
        []) as ProfessionalProfile[];
  }

  const professionalsMap =
    new Map(
      professionals.map(
        (professional) => [
          professional.user_id,
          professional,
        ]
      )
    );

  /*
   * MESSAGGI NON LETTI
   */
  const appointmentIds =
    appointments.map(
      (appointment) =>
        appointment.id
    );

  let unreadMessages:
    UnreadMessageRecord[] = [];

  if (
    appointmentIds.length > 0
  ) {
    const {
      data:
        unreadMessagesData,
      error:
        unreadMessagesError,
    } = await supabase
      .from(
        "appointment_messages"
      )
      .select(
        "appointment_id"
      )
      .in(
        "appointment_id",
        appointmentIds
      )
      .neq(
        "sender_id",
        user.id
      )
      .eq(
        "read",
        false
      );

    if (unreadMessagesError) {
      console.error(
        "Errore messaggi non letti:",
        unreadMessagesError
      );
    }

    unreadMessages =
      (unreadMessagesData ??
        []) as UnreadMessageRecord[];
  }

  const unreadMessagesMap =
    new Map<string, number>();

  for (
    const message of unreadMessages
  ) {
    unreadMessagesMap.set(
      message.appointment_id,

      (unreadMessagesMap.get(
        message.appointment_id
      ) ?? 0) + 1
    );
  }

  /*
   * RECENSIONI GIÀ PUBBLICATE
   *
   * MODIFICA SPRINT 5.1
   */
  const completedAppointmentIds =
    appointments
      .filter(
        (appointment) =>
          appointment.status ===
          "COMPLETED"
      )
      .map(
        (appointment) =>
          appointment.id
      );

  let reviewedAppointmentIds =
    new Set<string>();

  if (
    completedAppointmentIds.length >
    0
  ) {
    const {
      data: reviewsData,
      error: reviewsError,
    } = await supabase
      .from("reviews")
      .select(
        "appointment_id"
      )
      .in(
        "appointment_id",
        completedAppointmentIds
      )
      .eq(
        "patient_id",
        user.id
      );

    if (reviewsError) {
      console.error(
        "Errore lettura recensioni paziente:",
        reviewsError
      );
    }

    const reviews =
      (reviewsData ??
        []) as ReviewRecord[];

    reviewedAppointmentIds =
      new Set(
        reviews.map(
          (review) =>
            review.appointment_id
        )
      );
  }

  /*
   * CONTATORI
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

  const paymentRequiredCount =
    appointments.filter(
      (appointment) =>
        appointment.status ===
          "ACCEPTED" &&
        appointment.payment_status ===
          "REQUIRES_PAYMENT"
    ).length;

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
              Le mie prenotazioni
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard/patient"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Dashboard
            </Link>

            <Link
              href="/professionisti"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Professionisti
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* INTRO */}

        <section>
          <p className="text-sm font-semibold text-blue-700">
            Assistenza FG Home Care
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Gestisci le tue richieste
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Controlla lo stato delle
            richieste, comunica con il
            professionista, gestisci i
            pagamenti e lascia una
            recensione dopo le prestazioni
            completate.
          </p>
        </section>

        {/* RIEPILOGO */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              In attesa
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Accettate
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {acceptedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Completate
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {completedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Da pagare
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-900">
              {
                paymentRequiredCount
              }
            </p>
          </div>
        </section>

        {/* FILTRI */}

        <nav className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard/patient/appointments"
            className={
              !selectedStatus
                ? "rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            }
          >
            Tutte
          </Link>

          {appointmentStatuses.map(
            (status) => (
              <Link
                key={status}
                href={`/dashboard/patient/appointments?status=${status}`}
                className={
                  selectedStatus ===
                  status
                    ? "rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white"
                    : "rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                }
              >
                {getStatusLabel(
                  status
                )}
              </Link>
            )
          )}
        </nav>

        {/* ERRORE */}

        {appointmentsError && (
          <div className="mt-8 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700">
            Non è stato possibile
            caricare le prenotazioni.
          </div>
        )}

        {/* VUOTO */}

        {!appointmentsError &&
          appointments.length ===
            0 && (
            <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="text-4xl">
                📅
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900">
                Nessuna prenotazione
              </h3>

              <p className="mt-3 text-slate-600">
                Non sono presenti
                prenotazioni con il filtro
                selezionato.
              </p>

              <Link
                href="/professionisti"
                className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Cerca un professionista
              </Link>
            </section>
          )}

        {/* LISTA */}

        {!appointmentsError &&
          appointments.length >
            0 && (
            <div className="mt-8 space-y-6">
              {appointments.map(
                (appointment) => {
                  const professional =
                    professionalsMap.get(
                      appointment.professional_id
                    );

                  const professionalName =
                    professional
                      ? [
                          professional.first_name,
                          professional.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ") ||
                        "Professionista sanitario"
                      : "Professionista sanitario";

                  const location =
                    professional
                      ? [
                          professional.city,
                          professional.province,
                        ]
                          .filter(Boolean)
                          .join(", ")
                      : "";

                  const total =
                    formatMoney(
                      appointment.subtotal_amount,

                      appointment.currency ??
                        "EUR"
                    );

                  const refundAmount =
                    formatMoney(
                      appointment.refund_amount,

                      appointment.currency ??
                        "EUR"
                    );

                  /*
                   * Il pulsante pagamento
                   * compare solo per stati
                   * effettivamente pagabili.
                   */
                  const showPaymentButton =
                    appointment.status ===
                      "ACCEPTED" &&
                    (
                      appointment.payment_status ===
                        "REQUIRES_PAYMENT" ||
                      appointment.payment_status ===
                        "PROCESSING" ||
                      appointment.payment_status ===
                        "PAYMENT_FAILED"
                    );

                  /*
                   * MODIFICA SPRINT 5.1
                   */
                  const canReview =
                    appointment.status ===
                      "COMPLETED" &&
                    appointment.payment_status ===
                      "PAID" &&
                    !reviewedAppointmentIds.has(
                      appointment.id
                    );

                  const alreadyReviewed =
                    appointment.status ===
                      "COMPLETED" &&
                    reviewedAppointmentIds.has(
                      appointment.id
                    );

                  const followUpRecommendation =
                    appointment.status === "COMPLETED"
                      ? getFollowUpRecommendation(
                          professional?.profession
                        )
                      : null;

                  const followUpSearchUrl =
                    followUpRecommendation
                      ? getFollowUpSearchUrl(
                          followUpRecommendation
                        )
                      : null;

                  return (
                    <article
                      key={
                        appointment.id
                      }
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >
                      {/* HEADER CARD */}

                      <div className="border-b border-slate-100 p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-xl font-bold text-slate-900">
                                {
                                  professionalName
                                }
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

                            {professional
                              ?.profession && (
                              <p className="mt-2 font-semibold text-blue-700">
                                {
                                  professional.profession
                                }
                              </p>
                            )}

                            {professional
                              ?.specialization && (
                              <p className="mt-1 text-sm text-slate-500">
                                {
                                  professional.specialization
                                }
                              </p>
                            )}

                            {location && (
                              <p className="mt-1 text-sm text-slate-500">
                                {
                                  location
                                }
                              </p>
                            )}
                          </div>

                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                            {getServiceLabel(
                              appointment.service_type
                            )}
                          </span>
                        </div>
                      </div>

                      {/* BODY */}

                      <div className="p-6">
                        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                              {appointment.appointment_time.slice(
                                0,
                                5
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
                              Tariffa
                            </dt>

                            <dd className="mt-1 font-semibold text-slate-900">
                              {appointment.hourly_rate !==
                              null
                                ? `${Number(
                                    appointment.hourly_rate
                                  ).toFixed(
                                    2
                                  )} € / ora`
                                : "Da concordare"}
                            </dd>
                          </div>
                        </dl>

                        {/* NOTE PAZIENTE */}

                        {appointment.patient_notes && (
                          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              La tua richiesta
                            </p>

                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                              {
                                appointment.patient_notes
                              }
                            </p>
                          </div>
                        )}

                        {/* NOTE PROFESSIONISTA */}

                        {appointment.professional_notes && (
                          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                              Messaggio del
                              professionista
                            </p>

                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-blue-900">
                              {
                                appointment.professional_notes
                              }
                            </p>
                          </div>
                        )}

                        {/* PAGAMENTO */}

                        {(appointment.status ===
                          "ACCEPTED" ||
                          appointment.status ===
                            "COMPLETED" ||
                          appointment.status ===
                            "CANCELLED") && (
                          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Pagamento
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-3">
                                  <span
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentStatusClass(
                                      appointment.payment_status
                                    )}`}
                                  >
                                    {getPaymentStatusLabel(
                                      appointment.payment_status
                                    )}
                                  </span>

                                  {total && (
                                    <span className="font-bold text-slate-900">
                                      {
                                        total
                                      }
                                    </span>
                                  )}
                                </div>
                              </div>

                              {showPaymentButton && (
                                <AppointmentPaymentButton
                                  appointmentId={
                                    appointment.id
                                  }
                                />
                              )}
                            </div>

                            {appointment.payment_status ===
                              "REQUIRES_PAYMENT" && (
                              <p className="mt-4 text-sm leading-6 text-slate-600">
                                Il
                                professionista
                                ha accettato la
                                richiesta. Puoi
                                ora procedere
                                al pagamento.
                              </p>
                            )}

                            {appointment.payment_status ===
                              "PROCESSING" && (
                              <p className="mt-4 text-sm leading-6 text-blue-700">
                                Il pagamento è
                                stato predisposto.
                                Completa la
                                procedura Stripe.
                              </p>
                            )}

                            {appointment.payment_status ===
                              "PAID" && (
                              <p className="mt-4 text-sm font-semibold text-green-700">
                                Pagamento
                                completato.
                              </p>
                            )}

                            {(appointment.payment_status ===
                              "REFUNDED" ||
                              appointment.payment_status ===
                                "PARTIALLY_REFUNDED") &&
                              refundAmount && (
                                <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-4">
                                  <p className="text-sm font-semibold text-purple-800">
                                    Rimborso:{" "}
                                    {
                                      refundAmount
                                    }
                                  </p>

                                  {appointment.refund_percent !==
                                    null && (
                                    <p className="mt-1 text-xs text-purple-700">
                                      Percentuale:{" "}
                                      {
                                        appointment.refund_percent
                                      }
                                      %
                                    </p>
                                  )}

                                  {appointment.cancellation_policy && (
                                    <p className="mt-2 text-xs leading-5 text-purple-700">
                                      {
                                        appointment.cancellation_policy
                                      }
                                    </p>
                                  )}
                                </div>
                              )}
                          </section>
                        )}

                        {followUpRecommendation && followUpSearchUrl && (
                          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                              Prossimo passo consigliato
                            </p>
                            <h4 className="mt-2 text-lg font-bold text-slate-900">
                              {followUpRecommendation.title}
                            </h4>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {followUpRecommendation.description}
                            </p>
                            <Link
                              href={followUpSearchUrl}
                              className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                              {followUpRecommendation.searchLabel}
                            </Link>
                          </section>
                        )}

                        {/* AZIONI */}

                        <div className="mt-6 flex flex-wrap items-start gap-3">
                          <ChatLink
                            appointmentId={
                              appointment.id
                            }
                            currentUserId={
                              user.id
                            }
                            initialUnreadCount={
                              unreadMessagesMap.get(
                                appointment.id
                              ) ?? 0
                            }
                          />

                            {appointment.service_type === "VIDEO_CONSULTATION" &&
                              appointment.status === "ACCEPTED" &&
                              appointment.payment_status === "PAID" && (
                              <VideoConsultationButton
                                appointmentId={appointment.id}
                              />
                            )}

                          <Link
                            href={`/professionisti/${appointment.professional_id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Profilo
                            professionista
                          </Link>

                          {appointment.status === "COMPLETED" && (
                            <Link
                              href={`/professionisti/${appointment.professional_id}/prenota`}
                              className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                            >
                              Prenota di nuovo
                            </Link>
                          )}

                          {appointment.status === "PENDING" && (
                            <CancelAppointmentButton
                              appointmentId={appointment.id}
                            />
                          )}
                          {appointment.status ===
                            "ACCEPTED" &&
                            (
                              appointment.payment_status ===
                                "PAID" ||
                              appointment.payment_status ===
                                "REQUIRES_PAYMENT"
                            ) && (
                              <CancelPaidAppointmentButton
                                appointmentId={
                                  appointment.id
                                }
                                isPaid={
                                  appointment.payment_status ===
                                  "PAID"
                                }
                                currency={
                                  appointment.currency ??
                                  "EUR"
                                }
                              />
                            )}
                        </div>

                        {/* RECENSIONE - SPRINT 5.1 */}

                        {canReview && (
                          <div className="mt-7 border-t border-slate-200 pt-7">
                            <ReviewForm
                              appointmentId={
                                appointment.id
                              }
                            />
                          </div>
                        )}

                        {alreadyReviewed && (
                          <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                                ✓
                              </span>

                              <div>
                                <p className="font-semibold text-green-800">
                                  Recensione
                                  pubblicata
                                </p>

                                <p className="mt-1 text-sm text-green-700">
                                  Hai già
                                  recensito
                                  questa
                                  prestazione.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
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
