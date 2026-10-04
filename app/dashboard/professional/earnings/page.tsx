import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";

import {
  getPaymentStatusLabel,
  type PaymentStatus,
} from "@/lib/payments/payment-status";

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

type AppointmentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

type EconomicAppointment = {
  id: string;

  patient_id: string;

  appointment_date: string;
  appointment_time: string;

  service_type:
    | "HOME_VISIT"
    | "VIDEO_CONSULTATION";

  duration_minutes: number;

  status: AppointmentStatus;
  payment_status: PaymentStatus;

  currency: string | null;

  subtotal_amount: number | null;
  platform_fee_amount: number | null;
  commission_percent: number | null;
  professional_amount: number | null;

  paid_at: string | null;

  refund_amount: number | null;
  refund_percent: number | null;
  refunded_at: string | null;

  stripe_payment_intent_id: string | null;
};

type PatientProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type StripePayout = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrivalDate: string | null;
  createdAt: string;
};

function formatMoney(
  amount: number,
  currency = "EUR"
) {
  return new Intl.NumberFormat(
    "it-IT",
    {
      style: "currency",
      currency:
        currency.toUpperCase(),
    }
  ).format(amount / 100);
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "it-IT",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(
    new Date(`${value}T12:00:00`)
  );
}

function getServiceLabel(
  type: EconomicAppointment["service_type"]
) {
  return type ===
    "VIDEO_CONSULTATION"
    ? "Videoconsulto"
    : "Assistenza domiciliare";
}

function getPaymentClass(
  status: PaymentStatus
) {
  switch (status) {
    case "PAID":
      return "bg-green-50 text-green-700 border-green-200";

    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "REFUND_PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "PAYMENT_FAILED":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

export default async function ProfessionalEarningsPage() {
  const supabase =
    await createClient();

  /*
   * AUTENTICAZIONE
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "Errore autenticazione area incassi:",
      userError
    );
  }

  if (!user) {
    redirect(
      "/login?redirect=/dashboard/professional/earnings"
    );
  }

  /*
   * RUOLO
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
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Errore profilo area incassi:",
      profileError
    );
  }

  if (
    !profile ||
    profile.role !== "PROFESSIONAL"
  ) {
    redirect("/dashboard");
  }

  /*
   * PRESTAZIONI ECONOMICHE
   *
   * Carichiamo solo quelle che hanno
   * almeno un movimento di pagamento
   * rilevante.
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
        appointment_date,
        appointment_time,
        service_type,
        duration_minutes,
        status,
        payment_status,
        currency,
        subtotal_amount,
        platform_fee_amount,
        commission_percent,
        professional_amount,
        paid_at,
        refund_amount,
        refund_percent,
        refunded_at,
        stripe_payment_intent_id
      `
    )
    .eq(
      "professional_id",
      user.id
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
      "Errore lettura storico economico:",
      appointmentsError
    );
  }

  const appointments =
    (appointmentsData ??
      []) as EconomicAppointment[];

  /*
   * PAZIENTI
   */
  const patientIds =
    Array.from(
      new Set(
        appointments.map(
          (appointment) =>
            appointment.patient_id
        )
      )
    );

  let patients:
    PatientProfile[] = [];

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
          last_name
        `
      )
      .in(
        "id",
        patientIds
      );

    if (patientsError) {
      console.error(
        "Errore lettura pazienti storico:",
        patientsError
      );
    }

    patients =
      (patientsData ??
        []) as PatientProfile[];
  }

  const patientMap =
    new Map(
      patients.map(
        (patient) => [
          patient.id,
          patient,
        ]
      )
    );

  /*
   * SALDO STRIPE CONNECT
   */

  let stripeAvailable = 0;
  let stripePending = 0;
  let stripeConnected = false;
  let stripePayoutsEnabled = false;

  let stripePayouts: StripePayout[] = [];

  try {
    const {
      data: professionalStripe,
      error: professionalStripeError,
    } = await supabase
      .from("professional_profiles")
      .select(
        `
          stripe_account_id,
          stripe_payouts_enabled
        `
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (professionalStripeError) {
      console.error(
        "Errore lettura profilo Stripe:",
        professionalStripeError
      );
    } else if (
      professionalStripe?.stripe_account_id
    ) {
      const stripe = getStripe();

      const balance =
        await stripe.balance.retrieve(
          {},
          {
            stripeAccount:
              professionalStripe.stripe_account_id,
          }
        );

      stripeAvailable =
        balance.available.find(
          (item) =>
            item.currency === "eur"
        )?.amount ?? 0;

      stripePending =
        balance.pending.find(
          (item) =>
            item.currency === "eur"
        )?.amount ?? 0;

      stripeConnected = true;

      stripePayoutsEnabled =
        professionalStripe.stripe_payouts_enabled ??
        false;

      const payouts =
        await stripe.payouts.list(
          {
            limit: 10,
          },
          {
            stripeAccount:
              professionalStripe.stripe_account_id,
          }
        );

      stripePayouts =
        payouts.data.map(
          (payout) => ({
            id: payout.id,

            amount:
              payout.amount,

            currency:
              payout.currency,

            status:
              payout.status,

            arrivalDate:
              payout.arrival_date
                ? new Date(
                    payout.arrival_date * 1000
                  ).toISOString()
                : null,

            createdAt:
              new Date(
                payout.created * 1000
              ).toISOString(),
          })
        );
    }
  } catch (stripeBalanceError) {
    console.error(
      "Errore recupero saldo Stripe:",
      stripeBalanceError
    );
  }

  /*
   * TOTALI
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

  const completedAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status ===
        "COMPLETED" &&
        appointment.payment_status ===
          "PAID"
    );

  /*
   * Lordo pagato dal paziente.
   */
  const grossPaid =
    paidAppointments.reduce(
      (total, appointment) =>
        total +
        (appointment.subtotal_amount ??
          0),
      0
    );

  /*
   * Commissioni FG Home Care.
   */
  const platformFees =
    paidAppointments.reduce(
      (total, appointment) =>
        total +
        (appointment.platform_fee_amount ??
          0),
      0
    );

  /*
   * Quota professionista.
   */
  const professionalEarnings =
    paidAppointments.reduce(
      (total, appointment) =>
        total +
        (appointment.professional_amount ??
          0),
      0
    );

  /*
   * Totale delle prestazioni
   * completamente rimborsate.
   *
   * In futuro gestiremo in maniera
   * più precisa il rimborso parziale.
   */
  const refundedAmount =
    refundedAppointments.reduce(
      (total, appointment) =>
        total +
        (appointment.refund_amount ??
          0),
      0
    );

  const displayName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Professionista";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Incassi
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard/professional"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Dashboard
            </Link>

            <Link
              href="/dashboard/professional/payments"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Stripe
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section>
          <p className="text-sm font-semibold text-blue-700">
            Riepilogo economico
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Incassi di {displayName}
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Consulta le prestazioni pagate,
            la quota maturata e lo storico
            economico delle attività svolte
            tramite FG Home Care.
          </p>
        </section>

        {/* KPI */}

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Totale pagato
            </p>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {formatMoney(
                grossPaid
              )}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Importo complessivo delle
              prestazioni attualmente pagate.
            </p>
          </article>

          <article className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Guadagni da prestazioni
            </p>

            <p className="mt-3 text-3xl font-bold text-green-900">
              {formatMoney(
                professionalEarnings
              )}
            </p>

            <p className="mt-2 text-sm text-green-700">
              Quota economica maturata sulle
              prestazioni, al netto della commissione.
              Il saldo effettivamente disponibile è
              indicato nella sezione Stripe.
            </p>
          </article>

          <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Commissioni piattaforma
            </p>

            <p className="mt-3 text-3xl font-bold text-blue-900">
              {formatMoney(
                platformFees
              )}
            </p>

            <p className="mt-2 text-sm text-blue-700">
              Quota trattenuta dalla
              piattaforma sulle prestazioni.
            </p>
          </article>

          <article className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              Rimborsi
            </p>

            <p className="mt-3 text-3xl font-bold text-purple-900">
              {formatMoney(
                refundedAmount
              )}
            </p>

            <p className="mt-2 text-sm text-purple-700">
              Prestazioni annullate e
              rimborsate.
            </p>
          </article>
        </section>

        {/* SALDO STRIPE */}

        <section className="mt-8">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Accrediti
            </p>

            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              Saldo Stripe
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Denaro effettivamente presente sul
              conto Stripe Connect: disponibile oppure
              ancora in elaborazione.
            </p>
          </div>

          {stripeConnected ? (
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Totale su Stripe
                </p>

                <p className="mt-3 text-3xl font-bold text-blue-900">
                  {formatMoney(
                    stripeAvailable +
                      stripePending
                  )}
                </p>

                <p className="mt-2 text-sm text-blue-700">
                  Somma del saldo disponibile e
                  degli importi ancora in arrivo.
                </p>
              </article>
              <article className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  Disponibile
                </p>

                <p className="mt-3 text-3xl font-bold text-green-900">
                  {formatMoney(stripeAvailable)}
                </p>

                <p className="mt-2 text-sm text-green-700">
                  Importo attualmente disponibile
                  sul conto Stripe.
                </p>
              </article>

              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  In arrivo
                </p>

                <p className="mt-3 text-3xl font-bold text-amber-900">
                  {formatMoney(stripePending)}
                </p>

                <p className="mt-2 text-sm text-amber-700">
                  Importo ancora in elaborazione
                  prima di diventare disponibile.
                </p>
              </article>

              {!stripePayoutsEnabled && (
                <div className="md:col-span-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
                  Gli accrediti bancari Stripe non
                  risultano ancora abilitati per
                  questo account.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
              Collega e completa la configurazione
              Stripe per visualizzare saldo e
              accrediti.
            </div>
          )}
        </section>

        {/* ACCREDITI BANCARI */}

        <section className="mt-8">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Trasferimenti
            </p>

            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              Ultimi accrediti bancari
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Ultimi trasferimenti effettuati da Stripe
              verso il conto bancario.
            </p>
          </div>

          {!stripeConnected ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
              Collega Stripe per visualizzare
              gli accrediti bancari.
            </div>
          ) : stripePayouts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <div className="text-3xl">
                🏦
            </div>

              <p className="mt-3 font-semibold text-slate-900">
                Nessun accredito bancario
              </p>

              <p className="mt-1 text-sm text-slate-500">
                I trasferimenti effettuati da Stripe
                compariranno qui.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                        Data
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                        Arrivo previsto
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                        Importo
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                        Stato
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {stripePayouts.map((payout) => (
                      <tr
                        key={payout.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                          {new Intl.DateTimeFormat(
                            "it-IT"
                          ).format(
                            new Date(
                              payout.createdAt
                            )
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                          {payout.arrivalDate
                            ? new Intl.DateTimeFormat(
                                "it-IT"
                              ).format(
                                new Date(
                                  payout.arrivalDate
                                )
                              )
                            : "—"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-slate-900">
                        {formatMoney(
                            payout.amount,
                            payout.currency
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                              payout.status === "paid"
                                ? "border-green-200 bg-green-50 text-green-700"
                                : payout.status === "failed" ||
                                    payout.status === "canceled"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {payout.status === "paid"
                              ? "Accreditato"
                              : payout.status === "pending"
                                ? "In elaborazione"
                                : payout.status === "in_transit"
                                  ? "In trasferimento"
                                  : payout.status === "failed"
                                    ? "Fallito"
                                    : payout.status === "canceled"
                                      ? "Annullato"
                                      : payout.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* NUMERI */}

        <section className="mt-6 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Prestazioni pagate
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {
                paidAppointments.length
              }
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Prestazioni completate
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {
                completedAppointments.length
              }
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Prestazioni rimborsate
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {
                refundedAppointments.length
              }
            </p>
          </article>
        </section>

        {/* STORICO */}

        <section className="mt-10">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Movimenti
            </p>

            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              Storico economico
            </h3>
          </div>

          {appointmentsError ? (
            <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700">
              Non è stato possibile caricare
              lo storico economico.
            </div>
          ) : appointments.length ===
            0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="text-4xl">
                💶
              </div>

              <h4 className="mt-4 text-xl font-bold text-slate-900">
                Nessun movimento
              </h4>

              <p className="mt-2 text-slate-600">
                Le prestazioni pagate
                compariranno qui.
              </p>
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
                        Servizio
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Totale
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Commissione
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Netto
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
                          patientMap.get(
                            appointment.patient_id
                          );

                        const patientName =
                          patient
                            ? [
                                patient.first_name,
                                patient.last_name,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  " "
                                ) ||
                              "Paziente"
                            : "Paziente";

                        const currency =
                          appointment.currency ??
                          "eur";

                        /*
                         * Importi economici effettivi
                         * dopo un eventuale rimborso.
                         */
                        const subtotal =
                          appointment.subtotal_amount ??
                          0;

                        const refund =
                          appointment.refund_amount ??
                          0;

                        const remainingRatio =
                          subtotal > 0
                            ? Math.max(
                                0,
                                Math.min(
                                  1,
                                  (subtotal - refund) /
                                    subtotal
                                )
                              )
                            : 0;

                        const effectiveTotal =
                          Math.max(
                            0,
                                 subtotal - refund
                          );

                        const effectivePlatformFee =
                          Math.round(
                            (appointment.platform_fee_amount ??
                              0) *
                              remainingRatio
                          );

                        const effectiveProfessionalAmount =
                          Math.round(
                            (appointment.professional_amount ??
                              0) *
                              remainingRatio
                          );

                        return (
                          <tr
                            key={
                              appointment.id
                            }
                            className="hover:bg-slate-50"
                          >
                            <td className="whitespace-nowrap px-5 py-5 text-sm font-medium text-slate-900">
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
                              {
                                patientName
                              }
                            </td>

                            <td className="px-5 py-5 text-sm text-slate-700">
                              {getServiceLabel(
                                appointment.service_type
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-5 text-right text-sm font-semibold text-slate-900">
                              {refund > 0 ? (
                                <div>
                                  <div className="text-xs font-normal text-slate-400 line-through">
                                    {formatMoney(
                                      subtotal,
                                      currency
                                    )}
                                  </div>

                                  <div>
                                    {formatMoney(
                                      effectiveTotal,
                                      currency
                                    )}
                                  </div>

                                  <div className="mt-1 text-xs font-normal text-red-600">
                                    Rimborso{" "}
                                    {formatMoney(
                                      refund,
                                      currency
                                    )}
                                    {appointment.refund_percent != null
                                      ? ` (${appointment.refund_percent}%)`
                                      : ""}
                                  </div>
                                </div>
                              ) : (
                                formatMoney(
                                  effectiveTotal,
                                  currency
                                )
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-5 text-right text-sm text-blue-700">
                              <div className="font-semibold">
                                {formatMoney(
                                  effectivePlatformFee,
                                  currency
                                )}
                              </div>

                              {appointment.commission_percent != null && (
                                <div className="mt-1 text-xs font-normal text-slate-500">
                                  {appointment.commission_percent}%
                                </div>
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-5 text-right text-sm font-bold text-green-700">
                              {formatMoney(
                                effectiveProfessionalAmount,
                                currency
                              )}
                            </td>

                            <td className="px-5 py-5">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentClass(
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

        <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <p className="font-semibold text-blue-900">
            Importi maturati e accrediti bancari
          </p>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            La quota professionista indica
            quanto risulta attribuito alle
            prestazioni sulla piattaforma.
            L'effettiva disponibilità e il
            trasferimento verso il conto
            bancario dipendono invece dal saldo
            e dal calendario payout Stripe.
          </p>
        </section>
      </div>
    </main>
  );
}