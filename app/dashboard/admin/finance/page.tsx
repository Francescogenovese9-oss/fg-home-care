import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";

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

type AppointmentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

type FinanceAppointment = {
  id: string;

  patient_id: string;
  professional_id: string;

  appointment_date: string;
  appointment_time: string;

  service_type:
    | "HOME_VISIT"
    | "VIDEO_CONSULTATION";

  status: AppointmentStatus;
  payment_status: PaymentStatus;

  currency: string | null;

  subtotal_amount: number | null;
  platform_fee_amount: number | null;
  professional_amount: number | null;

  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;

  paid_at: string | null;
  refunded_at: string | null;
};

type SubscriptionPayment = {
  id: string;
  professional_id: string;
  stripe_invoice_id: string;
  stripe_subscription_id: string | null;
  amount_paid: number;
  currency: string;
  status: "PAID" | "FAILED" | "REFUNDED";
  paid_at: string | null;
};

type ProfileRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

function formatMoney(
  amountInCents: number,
  currency = "EUR"
) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(
    new Date(`${value}T12:00:00`)
  );
}

function getPaymentStatusLabel(
  status: PaymentStatus
) {
  switch (status) {
    case "PAID":
      return "Pagato";

    case "REFUND_PENDING":
      return "Rimborso in corso";

    case "REFUNDED":
      return "Rimborsato";

    case "PARTIALLY_REFUNDED":
      return "Rimborso parziale";

    case "PAYMENT_FAILED":
      return "Pagamento fallito";

    case "PROCESSING":
      return "In elaborazione";

    case "REQUIRES_PAYMENT":
      return "Da pagare";

    case "CANCELLED":
      return "Annullato";

    default:
      return "Non richiesto";
  }
}

function getPaymentStatusClass(
  status: PaymentStatus
) {
  switch (status) {
    case "PAID":
      return "border-green-200 bg-green-50 text-green-700";

    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "border-purple-200 bg-purple-50 text-purple-700";

    case "REFUND_PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "PAYMENT_FAILED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getServiceLabel(
  serviceType: FinanceAppointment["service_type"]
) {
  return serviceType ===
    "VIDEO_CONSULTATION"
    ? "Videoconsulto"
    : "Assistenza domiciliare";
}

function getFullName(
  profile:
    | ProfileRecord
    | undefined,
  fallback: string
) {
  if (!profile) {
    return fallback;
  }

  return (
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ") || fallback
  );
}

export default async function AdminFinancePage() {
  const supabase =
    await createClient();

  /*
   * AUTENTICAZIONE ADMIN
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "Errore autenticazione area finance admin:",
      userError
    );
  }

  if (!user) {
    redirect(
      "/login?redirect=/dashboard/admin/finance"
    );
  }

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
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Errore profilo admin finance:",
      profileError
    );
  }

  if (
    !profile ||
    profile.role !== "ADMIN"
  ) {
    redirect("/dashboard");
  }

  /*
   * MOVIMENTI ECONOMICI
   */
  const {
    data: appointmentsData,
    error: appointmentsError,
  } = await supabase
    .from("appointments")
    .select(
      `
        id,

        patient_id,
        professional_id,

        appointment_date,
        appointment_time,

        service_type,

        status,
        payment_status,

        currency,

        subtotal_amount,
        platform_fee_amount,
        professional_amount,

        stripe_payment_intent_id,
        stripe_charge_id,
        stripe_refund_id,

        paid_at,
        refunded_at
      `
    )
    .in(
      "payment_status",
      [
        "PAID",
        "REFUND_PENDING",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
      ]
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

  if (appointmentsError) {
    console.error(
      "Errore lettura finance admin:",
      appointmentsError
    );
  }

  const appointments =
    (appointmentsData ??
      []) as FinanceAppointment[];

  /*
   * ABBONAMENTI PREMIUM INCASSATI
   */
  const {
    data: subscriptionPaymentsData,
    error: subscriptionPaymentsError,
  } = await supabase
    .from("professional_subscription_payments")
    .select(
      `
        id,
        professional_id,
        stripe_invoice_id,
        stripe_subscription_id,
        amount_paid,
        currency,
        status,
        paid_at
      `
    )
    .eq("status", "PAID")
    .not("paid_at", "is", null)
    .order("paid_at", {
      ascending: false,
    });

  if (subscriptionPaymentsError) {
    console.error(
      "Errore lettura abbonamenti Premium finance:",
      subscriptionPaymentsError
    );
  }

  const subscriptionPayments =
    (subscriptionPaymentsData ??
      []) as SubscriptionPayment[];

  /*
   * RECUPERO PAZIENTI E PROFESSIONISTI
   */
  const userIds =
    Array.from(
      new Set(
        appointments.flatMap(
          (appointment) => [
            appointment.patient_id,
            appointment.professional_id,
          ]
        )
      )
    );

  let people:
    ProfileRecord[] = [];

  if (userIds.length > 0) {
    const {
      data: peopleData,
      error: peopleError,
    } = await supabase
      .from("profiles")
      .select(
        `
          id,
          first_name,
          last_name
        `
      )
      .in(
        "id",
        userIds
      );

    if (peopleError) {
      console.error(
        "Errore lettura nominativi finance:",
        peopleError
      );
    }

    people =
      (peopleData ??
        []) as ProfileRecord[];
  }

  const peopleMap =
    new Map(
      people.map(
        (person) => [
          person.id,
          person,
        ]
      )
    );

  /*
   * KPI
   */
  const paidAppointments =
    appointments.filter(
      (appointment) =>
        appointment.payment_status ===
        "PAID"
    );

  const refundedAppointments =
    appointments.filter(
      (appointment) =>
        appointment.payment_status ===
          "REFUNDED" ||
        appointment.payment_status ===
          "PARTIALLY_REFUNDED"
    );

  const refundPendingAppointments =
    appointments.filter(
      (appointment) =>
        appointment.payment_status ===
        "REFUND_PENDING"
    );

  /*
   * GMV attualmente non rimborsato.
   */
  const grossVolume =
    paidAppointments.reduce(
      (total, appointment) =>
        total +
        (appointment.subtotal_amount ??
          0),
      0
    );

  /*
   * Commissione lorda FG Home Care.
   */
  const platformRevenue =
    paidAppointments.reduce(
      (total, appointment) =>
        total +
        (appointment.platform_fee_amount ??
          0),
      0
    );

  /*
   * Abbonamenti Premium realmente incassati.
   */
  const premiumRevenue =
    subscriptionPayments.reduce(
      (total, payment) =>
        total +
        (payment.amount_paid ?? 0),
      0
    );

  /*
   * Ricavo complessivo FG Home Care:
   * commissioni prestazioni + abbonamenti Premium.
   */
  const totalPlatformRevenue =
    platformRevenue +
    premiumRevenue;

  /*
   * Quota attribuita ai professionisti.
   */
  const professionalVolume =
    paidAppointments.reduce(
      (total, appointment) =>
        total +
        (appointment.professional_amount ??
          0),
      0
    );

  const refundedVolume =
    refundedAppointments.reduce(
      (total, appointment) =>
        total +
        (appointment.subtotal_amount ??
          0),
      0
    );

  const refundedPlatformFees =
    refundedAppointments.reduce(
      (total, appointment) =>
        total +
        (appointment.platform_fee_amount ??
          0),
      0
    );

  /*
   * STORICO MENSILE
   */
  type MonthlyData = {
    gross: number;
    fees: number;
    premium: number;
    totalRevenue: number;
    professional: number;
    count: number;
  };

  const monthlyMap =
    new Map<string, MonthlyData>();

  function getEmptyMonth(): MonthlyData {
    return {
      gross: 0,
      fees: 0,
      premium: 0,
      totalRevenue: 0,
      professional: 0,
      count: 0,
    };
  }

  for (
    const appointment of paidAppointments
  ) {
    if (!appointment.paid_at) {
      continue;
    }

    const key =
      appointment.paid_at.slice(
        0,
        7
      );

    const current =
      monthlyMap.get(key) ??
      getEmptyMonth();

    current.gross +=
      appointment.subtotal_amount ??
      0;

    current.fees +=
      appointment.platform_fee_amount ??
      0;

    current.professional +=
      appointment.professional_amount ??
      0;

    current.count += 1;

    current.totalRevenue =
      current.fees +
      current.premium;

    monthlyMap.set(
      key,
      current
    );
  }

  for (
    const payment of subscriptionPayments
  ) {
    if (!payment.paid_at) {
      continue;
    }

    const key =
      payment.paid_at.slice(
        0,
        7
      );

    const current =
      monthlyMap.get(key) ??
      getEmptyMonth();

    current.premium +=
      payment.amount_paid ??
      0;

    current.totalRevenue =
      current.fees +
      current.premium;

    monthlyMap.set(
      key,
      current
    );
  }

  const monthlyData =
    Array.from(
      monthlyMap.entries()
    )
      .sort(
        ([first], [second]) =>
          second.localeCompare(
            first
          )
      )
      .slice(0, 12);

  const monthlyChartData =
    Array.from(
      monthlyMap.entries()
    )
      .sort(
        ([first], [second]) =>
          first.localeCompare(
            second
          )
      )
      .slice(-12);

  /*
   * PREVISIONE
   *
   * Media degli ultimi 3 mesi disponibili.
   * La previsione mantiene separate:
   * - commissioni prestazioni
   * - abbonamenti Premium
   */
  const forecastBaseMonths =
    monthlyChartData.slice(-3);

  const forecastDivisor =
    Math.max(
      forecastBaseMonths.length,
      1
    );

  const forecastFees =
    Math.round(
      forecastBaseMonths.reduce(
        (total, [, values]) =>
          total +
          values.fees,
        0
      ) / forecastDivisor
    );

  const forecastPremium =
    Math.round(
      forecastBaseMonths.reduce(
        (total, [, values]) =>
          total +
          values.premium,
        0
      ) / forecastDivisor
    );

  const forecastMonthlyRevenue =
    forecastFees +
    forecastPremium;

  const now =
    new Date();

  const forecastData =
    Array.from(
      { length: 6 },
      (_, index) => {
        const date =
          new Date(
            now.getFullYear(),
            now.getMonth() +
              index +
              1,
            1,
            12,
            0,
            0
          );

        const month =
          `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;

        return {
          month,
          fees:
            forecastFees,
          premium:
            forecastPremium,
          totalRevenue:
            forecastMonthlyRevenue,
        };
      }
    );

  const maxChartRevenue =
    Math.max(
      1,
      ...monthlyChartData.map(
        ([, values]) =>
          values.totalRevenue
      ),
      ...forecastData.map(
        (values) =>
          values.totalRevenue
      )
    );

  const adminName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ") || "Admin";

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
              Dashboard economica
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard/admin"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Dashboard Admin
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* INTRO */}

        <section>
          <p className="text-sm font-semibold text-blue-700">
            Controllo economico
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Riepilogo FG Home Care
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Ciao {adminName}. Qui puoi
            controllare il volume delle
            prestazioni pagate, le commissioni
            della piattaforma e gli importi
            destinati ai professionisti.
          </p>
        </section>

        {/* KPI PRINCIPALI */}

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Volume transato
            </p>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {formatMoney(
                grossVolume
              )}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Totale delle prestazioni
              attualmente pagate.
            </p>
          </article>

          <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Commissioni FG
            </p>

            <p className="mt-3 text-3xl font-bold text-blue-900">
              {formatMoney(
                platformRevenue
              )}
            </p>

            <p className="mt-2 text-sm text-blue-700">
              Commissione lorda maturata
              dalla piattaforma.
            </p>
          </article>

          <article className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Quota professionisti
            </p>

            <p className="mt-3 text-3xl font-bold text-green-900">
              {formatMoney(
                professionalVolume
              )}
            </p>

            <p className="mt-2 text-sm text-green-700">
              Importo destinato ai
              professionisti.
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

            <p className="mt-2 text-sm text-purple-700">
              Valore delle prestazioni
              rimborsate.
            </p>
          </article>
        </section>

        {/* RICAVI PIATTAFORMA */}

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Abbonamenti Premium incassati
            </p>

            <p className="mt-3 text-3xl font-bold text-indigo-900">
              {formatMoney(
                premiumRevenue
              )}
            </p>

            <p className="mt-2 text-sm text-indigo-700">
              Pagamenti Premium effettivamente registrati da Stripe.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-300 bg-slate-900 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Ricavi FG totali
            </p>

            <p className="mt-3 text-3xl font-bold text-white">
              {formatMoney(
                totalPlatformRevenue
              )}
            </p>

            <p className="mt-2 text-sm text-slate-300">
              Commissioni sulle prestazioni + abbonamenti Premium.
            </p>
          </article>
        </section>

        {/* KPI SECONDARI */}

        <section className="mt-6 grid gap-5 md:grid-cols-4">
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Pagamenti attivi
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {
                paidAppointments.length
              }
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Rimborsi completati
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {
                refundedAppointments.length
              }
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Rimborsi in corso
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {
                refundPendingAppointments.length
              }
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Commissioni rimborsate
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatMoney(
                refundedPlatformFees
              )}
            </p>
          </article>
        </section>

        {/* ANDAMENTO MENSILE */}

        <section className="mt-10">
          <p className="text-sm font-semibold text-blue-700">
            Performance
          </p>

          <h3 className="mt-1 text-2xl font-bold text-slate-900">
            Andamento mensile
          </h3>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900">
                    Ricavi mensili
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    Dati effettivi registrati dalla piattaforma.
                  </p>
                </div>

                <div className="flex gap-4 text-xs font-semibold">
                  <span className="text-blue-700">
                    Commissioni
                  </span>

                  <span className="text-indigo-700">
                    Premium
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {monthlyChartData.length ===
                0 ? (
                  <p className="text-sm text-slate-500">
                    Nessun ricavo disponibile.
                  </p>
                ) : (
                  monthlyChartData.map(
                    ([month, values]) => (
                      <div key={month}>
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <span className="text-sm font-semibold capitalize text-slate-700">
                            {new Intl.DateTimeFormat(
                              "it-IT",
                              {
                                month:
                                  "short",
                                year:
                                  "numeric",
                              }
                            ).format(
                              new Date(
                                `${month}-01T12:00:00`
                              )
                            )}
                          </span>

                          <span className="text-sm font-bold text-slate-900">
                            {formatMoney(
                              values.totalRevenue
                            )}
                          </span>
                        </div>

                        <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="bg-blue-600"
                            style={{
                              width: `${
                                (values.fees /
                                  maxChartRevenue) *
                                100
                              }%`,
                            }}
                            title={`Commissioni ${formatMoney(
                              values.fees
                            )}`}
                          />

                          <div
                            className="bg-indigo-500"
                            style={{
                              width: `${
                                (values.premium /
                                  maxChartRevenue) *
                                100
                              }%`,
                            }}
                            title={`Premium ${formatMoney(
                              values.premium
                            )}`}
                          />
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Proiezione
              </p>

              <h4 className="mt-2 text-xl font-bold text-slate-900">
                Prossimi 6 mesi
              </h4>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Stima basata sulla media degli ultimi 3 mesi disponibili.
              </p>

              <p className="mt-5 text-3xl font-bold text-slate-900">
                {formatMoney(
                  forecastMonthlyRevenue
                )}
              </p>

              <p className="text-sm text-slate-500">
                ricavo medio mensile previsto
              </p>

              <div className="mt-6 space-y-3">
                {forecastData.map(
                  (item) => (
                    <div
                      key={item.month}
                      className="flex items-center justify-between gap-3 border-t border-amber-200 pt-3"
                    >
                      <span className="text-sm capitalize text-slate-600">
                        {new Intl.DateTimeFormat(
                          "it-IT",
                          {
                            month:
                              "short",
                            year:
                              "numeric",
                          }
                        ).format(
                          new Date(
                            `${item.month}-01T12:00:00`
                          )
                        )}
                      </span>

                      <span className="text-sm font-bold text-slate-900">
                        {formatMoney(
                          item.totalRevenue
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-500">
                La proiezione non rappresenta ricavi garantiti.
              </p>
            </div>
          </div>

          {monthlyData.length ===
          0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
              Nessun dato economico
              disponibile.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Mese
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Prestazioni
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Volume
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Commissioni
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Professionisti
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {monthlyData.map(
                      ([month, values]) => (
                        <tr
                          key={month}
                        >
                          <td className="px-5 py-5 font-semibold text-slate-900">
                            {new Intl.DateTimeFormat(
                              "it-IT",
                              {
                                month:
                                  "long",
                                year:
                                  "numeric",
                              }
                            ).format(
                              new Date(
                                `${month}-01T12:00:00`
                              )
                            )}
                          </td>

                          <td className="px-5 py-5 text-right text-sm text-slate-700">
                            {
                              values.count
                            }
                          </td>

                          <td className="px-5 py-5 text-right text-sm font-semibold text-slate-900">
                            {formatMoney(
                              values.gross
                            )}
                          </td>

                          <td className="px-5 py-5 text-right text-sm font-semibold text-blue-700">
                            {formatMoney(
                              values.fees
                            )}
                          </td>

                          <td className="px-5 py-5 text-right text-sm font-semibold text-green-700">
                            {formatMoney(
                              values.professional
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* MOVIMENTI */}

        <section className="mt-10">
          <p className="text-sm font-semibold text-blue-700">
            Transazioni
          </p>

          <h3 className="mt-1 text-2xl font-bold text-slate-900">
            Storico movimenti
          </h3>

          {appointmentsError ? (
            <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700">
              Non è stato possibile
              caricare i movimenti.
            </div>
          ) : appointments.length ===
            0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="text-4xl">
                💳
              </div>

              <h4 className="mt-4 text-xl font-bold text-slate-900">
                Nessun movimento
              </h4>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Data
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Paziente
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Professionista
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Servizio
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Totale
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        FG Home Care
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Professionista
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Stato
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {appointments.map(
                      (
                        appointment
                      ) => {
                        const patient =
                          peopleMap.get(
                            appointment.patient_id
                          );

                        const professional =
                          peopleMap.get(
                            appointment.professional_id
                          );

                        const currency =
                          appointment.currency ??
                          "eur";

                        return (
                          <tr
                            key={
                              appointment.id
                            }
                            className="hover:bg-slate-50"
                          >
                            <td className="whitespace-nowrap px-5 py-5 text-sm font-semibold text-slate-900">
                              {formatDate(
                                appointment.appointment_date
                              )}

                              <span className="ml-2 text-slate-400">
                                {appointment.appointment_time.slice(
                                  0,
                                  5
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-5 text-sm text-slate-700">
                              {getFullName(
                                patient,
                                "Paziente"
                              )}
                            </td>

                            <td className="px-5 py-5 text-sm text-slate-700">
                              {getFullName(
                                professional,
                                "Professionista"
                              )}
                            </td>

                            <td className="px-5 py-5 text-sm text-slate-700">
                              {getServiceLabel(
                                appointment.service_type
                              )}
                            </td>

                            <td className="px-5 py-5 text-right text-sm font-semibold text-slate-900">
                              {formatMoney(
                                appointment.subtotal_amount ??
                                  0,
                                currency
                              )}
                            </td>

                            <td className="px-5 py-5 text-right text-sm font-semibold text-blue-700">
                              {formatMoney(
                                appointment.platform_fee_amount ??
                                  0,
                                currency
                              )}
                            </td>

                            <td className="px-5 py-5 text-right text-sm font-semibold text-green-700">
                              {formatMoney(
                                appointment.professional_amount ??
                                  0,
                                currency
                              )}
                            </td>

                            <td className="px-5 py-5">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentStatusClass(
                                  appointment.payment_status
                                )}`}
                              >
                                {getPaymentStatusLabel(
                                  appointment.payment_status
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* NOTA CONTABILE */}

        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-7">
          <h3 className="font-bold text-amber-900">
            Commissione lorda ≠ utile netto
          </h3>

          <p className="mt-3 text-sm leading-6 text-amber-800">
            La voce “Commissioni FG” rappresenta
            la commissione della piattaforma
            memorizzata nelle prenotazioni.
            Non sottrae ancora commissioni Stripe,
            eventuali contestazioni, costi
            operativi, imposte o altri costi.
          </p>
        </section>
      </div>
    </main>
  );
}