import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import AppointmentPaymentForm from "@/components/payments/AppointmentPaymentForm";
import LogoutButton from "@/components/auth/LogoutButton";

import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    appointmentId: string;
  }>;
};

function formatMoney(
  amountInCents: number,
  currency = "EUR"
) {
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

function formatDate(
  value: string
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
      `${value}T12:00:00`
    )
  );
}

export default async function AppointmentPaymentPage({
  params,
}: PageProps) {
  const { appointmentId } =
    await params;

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
      "Errore utente pagamento:",
      userError
    );
  }

  if (!user) {
    redirect(
      `/login?redirect=/dashboard/patient/appointments/${appointmentId}/payment`
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
      "Errore profilo pagamento:",
      profileError
    );
  }

  if (
    !profile ||
    profile.role !== "PATIENT"
  ) {
    redirect(
      "/dashboard"
    );
  }

  /*
   * PRENOTAZIONE
   */
  const {
    data: appointment,
    error: appointmentError,
  } = await supabase
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

        status,
        payment_status,

        currency,

        subtotal_amount,
        platform_fee_amount,
        professional_amount,

        stripe_payment_intent_id
      `
    )
    .eq(
      "id",
      appointmentId
    )
    .maybeSingle();

  if (appointmentError) {
    console.error(
      "Errore prenotazione pagamento:",
      appointmentError
    );
  }

  if (!appointment) {
    notFound();
  }

  /*
   * SICUREZZA
   */
  if (
    appointment.patient_id !==
    user.id
  ) {
    notFound();
  }

  if (
    appointment.status !==
    "ACCEPTED"
  ) {
    redirect(
      "/dashboard/patient/appointments"
    );
  }

  /*
   * Se è già pagata non mostriamo
   * nuovamente Stripe Elements.
   */
  if (
    appointment.payment_status ===
    "PAID"
  ) {
    redirect(
      "/dashboard/patient/appointments"
    );
  }

  /*
   * Lo Sprint 4.4 ha già calcolato
   * gli importi.
   */
  if (
    appointment.subtotal_amount ===
      null ||
    appointment
      .platform_fee_amount ===
      null ||
    appointment
      .professional_amount ===
      null
  ) {
    /*
     * Questo può accadere entrando
     * direttamente nell'URL.
     *
     * AppointmentPaymentForm chiamerà
     * create-intent, ma per il riepilogo
     * ci serve comunque un importo.
     */
    redirect(
      "/dashboard/patient/appointments"
    );
  }

  const currency =
    appointment.currency ??
    "eur";

  const totalLabel =
    formatMoney(
      appointment.subtotal_amount,
      currency
    );

  const appointmentDate =
    formatDate(
      appointment.appointment_date
    );

  const serviceLabel =
    appointment.service_type ===
    "VIDEO_CONSULTATION"
      ? "Videoconsulto"
      : "Assistenza domiciliare";

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Pagamento prestazione
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/patient/appointments"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Prenotazioni
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* BACK */}

        <Link
          href="/dashboard/patient/appointments"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Torna alle prenotazioni
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          {/* RIEPILOGO */}

          <aside className="self-start rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Riepilogo
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {totalLabel}
            </h2>

            <dl className="mt-7 divide-y divide-slate-100">
              <div className="py-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Prestazione
                </dt>

                <dd className="mt-2 font-semibold text-slate-900">
                  {serviceLabel}
                </dd>
              </div>

              <div className="py-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Data
                </dt>

                <dd className="mt-2 font-semibold capitalize text-slate-900">
                  {appointmentDate}
                </dd>
              </div>

              <div className="py-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Orario
                </dt>

                <dd className="mt-2 font-semibold text-slate-900">
                  {appointment.appointment_time.slice(
                    0,
                    5
                  )}
                </dd>
              </div>

              <div className="py-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Durata
                </dt>

                <dd className="mt-2 font-semibold text-slate-900">
                  {
                    appointment.duration_minutes
                  }{" "}
                  minuti
                </dd>
              </div>

              <div className="py-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tariffa
                </dt>

                <dd className="mt-2 font-semibold text-slate-900">
                  {appointment.hourly_rate !==
                  null
                    ? `${Number(
                        appointment.hourly_rate
                      ).toFixed(
                        2
                      )} € / ora`
                    : "Non disponibile"}
                </dd>
              </div>
            </dl>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-600">
                  Totale
                </span>

                <strong className="text-xl text-slate-900">
                  {totalLabel}
                </strong>
              </div>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-500">
              La commissione della piattaforma
              viene gestita internamente da FG
              Home Care e non viene aggiunta al
              totale mostrato al paziente.
            </p>
          </aside>

          {/* STRIPE */}

          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Pagamento sicuro
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Inserisci i dati di pagamento
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Completa il pagamento utilizzando
              il modulo sicuro Stripe.
            </p>

            <div className="mt-7">
              <AppointmentPaymentForm
                appointmentId={
                  appointment.id
                }
                amountLabel={
                  totalLabel
                }
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}