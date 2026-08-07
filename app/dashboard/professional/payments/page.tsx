import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import StripeConnectButton from "@/components/payments/StripeConnectButton";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  stripe?: string | string[];
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

function getSingleValue(
  value: string | string[] | undefined
) {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

export default async function ProfessionalPaymentsPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "Errore lettura utente pagina pagamenti:",
      userError
    );
  }

  if (!user) {
    redirect(
      "/login?redirect=/dashboard/professional/payments"
    );
  }

  /*
   * Controllo account.
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
      "Errore lettura profilo pagina pagamenti:",
      profileError
    );
  }

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "PATIENT") {
    redirect("/dashboard/patient");
  }

  if (profile.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (
    profile.role !==
    "PROFESSIONAL"
  ) {
    redirect("/login");
  }

  /*
   * Recupero configurazione Stripe
   * del professionista.
   */
  const {
    data: professionalProfile,
    error: professionalProfileError,
  } = await supabase
    .from("professional_profiles")
    .select(
      `
        profession,
        verification_status,

        stripe_account_id,
        stripe_account_created,

        stripe_onboarding_completed,

        stripe_charges_enabled,
        stripe_transfers_enabled,

        stripe_payouts_enabled,
        stripe_details_submitted,

        stripe_account_updated_at
      `
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (professionalProfileError) {
    console.error(
      "Errore lettura dati Stripe:",
      professionalProfileError
    );
  }

  if (!professionalProfile) {
    redirect(
      "/dashboard/professional/profile"
    );
  }

  const params = await searchParams;

  const stripeResult =
    getSingleValue(
      params.stripe
    );

  /*
   * Stato Stripe Connect.
   */
  const connected = Boolean(
    professionalProfile
      .stripe_account_id
  );

  const accountCreated =
    professionalProfile
      .stripe_account_created ??
    false;

  const detailsSubmitted =
    professionalProfile
      .stripe_details_submitted ??
    false;

  const transfersEnabled =
    professionalProfile
      .stripe_transfers_enabled ??
    false;

  const payoutsEnabled =
    professionalProfile
      .stripe_payouts_enabled ??
    false;

  const onboardingCompleted =
    professionalProfile
      .stripe_onboarding_completed ??
    false;

  const verificationApproved =
    professionalProfile
      .verification_status ===
    "APPROVED";

  /*
   * Campo legacy.
   *
   * Lo manteniamo nel DB per compatibilità
   * con lo Sprint Stripe precedente,
   * ma nella UI v2 utilizziamo
   * transfersEnabled.
   */
  const legacyChargesEnabled =
    professionalProfile
      .stripe_charges_enabled ??
    false;

  const displayName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Professionista";

  const lastStripeUpdate =
    professionalProfile
      .stripe_account_updated_at
      ? new Intl.DateTimeFormat(
          "it-IT",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        ).format(
          new Date(
            professionalProfile
              .stripe_account_updated_at
          )
        )
      : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Pagamenti
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
              href="/dashboard/professional/appointments"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Richieste
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* INTRODUZIONE */}

        <section>
          <p className="text-sm font-semibold text-blue-700">
            Stripe Connect
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Configura i pagamenti
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Ciao {displayName}. Collega il tuo
            account Stripe per poter ricevere
            gli accrediti relativi alle
            prestazioni effettuate attraverso
            FG Home Care.
          </p>
        </section>

        {/* MESSAGGI DI RITORNO STRIPE */}

        {stripeResult ===
          "return" && (
          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="font-semibold text-blue-900">
              Sei tornato da Stripe
            </p>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              La procedura Stripe è stata
              terminata o interrotta. Premi
              <strong>
                {" "}
                Aggiorna stato Stripe{" "}
              </strong>
              per sincronizzare FG Home Care
              con i dati più recenti del tuo
              account.
            </p>
          </div>
        )}

        {stripeResult ===
          "missing" && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-semibold text-amber-900">
              Account Stripe non trovato
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              Non risulta ancora un account
              Stripe collegato al tuo profilo.
            </p>
          </div>
        )}

        {stripeResult ===
          "error" && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-800">
              Errore Stripe
            </p>

            <p className="mt-2 text-sm leading-6 text-red-700">
              Non è stato possibile continuare
              la configurazione Stripe.
              Riprova oppure aggiorna lo stato
              dell'account.
            </p>
          </div>
        )}

        {/* STATO GENERALE */}

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Stripe Connect
                </p>

                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  Stato account
                </h3>
              </div>

              {onboardingCompleted ? (
                <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                  Configurato
                </span>
              ) : (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                  Da completare
                </span>
              )}
            </div>

            <dl className="mt-7 divide-y divide-slate-100">
              {/* ACCOUNT */}

              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-slate-600">
                  Account collegato
                </dt>

                <dd
                  className={
                    connected
                      ? "font-semibold text-green-700"
                      : "font-semibold text-amber-700"
                  }
                >
                  {connected
                    ? "Sì"
                    : "No"}
                </dd>
              </div>

              {/* ACCOUNT CREATO */}

              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-slate-600">
                  Account Stripe creato
                </dt>

                <dd
                  className={
                    accountCreated
                      ? "font-semibold text-green-700"
                      : "font-semibold text-amber-700"
                  }
                >
                  {accountCreated
                    ? "Sì"
                    : "No"}
                </dd>
              </div>

              {/* DATI */}

              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-slate-600">
                  Dati richiesti
                </dt>

                <dd
                  className={
                    detailsSubmitted
                      ? "font-semibold text-green-700"
                      : "font-semibold text-amber-700"
                  }
                >
                  {detailsSubmitted
                    ? "Completati"
                    : "Da completare"}
                </dd>
              </div>

              {/* TRANSFERS V2 */}

              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-slate-600">
                  Trasferimenti abilitati
                </dt>

                <dd
                  className={
                    transfersEnabled
                      ? "font-semibold text-green-700"
                      : "font-semibold text-amber-700"
                  }
                >
                  {transfersEnabled
                    ? "Attivi"
                    : "Non attivi"}
                </dd>
              </div>

              {/* PAYOUT */}

              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-slate-600">
                  Accrediti abilitati
                </dt>

                <dd
                  className={
                    payoutsEnabled
                      ? "font-semibold text-green-700"
                      : "font-semibold text-amber-700"
                  }
                >
                  {payoutsEnabled
                    ? "Attivi"
                    : "Non attivi"}
                </dd>
              </div>

              {/* CONFIGURAZIONE */}

              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-slate-600">
                  Configurazione
                </dt>

                <dd
                  className={
                    onboardingCompleted
                      ? "font-semibold text-green-700"
                      : "font-semibold text-amber-700"
                  }
                >
                  {onboardingCompleted
                    ? "Completata"
                    : "Da completare"}
                </dd>
              </div>
            </dl>

            {lastStripeUpdate && (
              <p className="mt-4 text-xs text-slate-400">
                Ultimo aggiornamento Stripe:{" "}
                {lastStripeUpdate}
              </p>
            )}

            {/* AZIONI */}

            <div className="mt-7">
              {verificationApproved ? (
                <StripeConnectButton
                  isConnected={
                    connected
                  }
                  onboardingCompleted={
                    onboardingCompleted
                  }
                />
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="font-semibold text-amber-900">
                    Profilo non ancora approvato
                  </p>

                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    Prima di collegare Stripe,
                    FG Home Care deve verificare
                    e approvare il tuo profilo
                    professionale.
                  </p>
                </div>
              )}
            </div>
          </article>

          {/* COME FUNZIONA */}

          <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Procedura
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-900">
              Come funziona
            </h3>

            <div className="mt-7 space-y-7">
              <div className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                  1
                </span>

                <div>
                  <p className="font-semibold text-slate-900">
                    Collega Stripe
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    FG Home Care crea il tuo
                    connected account Stripe e
                    apre la procedura sicura di
                    onboarding.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                  2
                </span>

                <div>
                  <p className="font-semibold text-slate-900">
                    Completa la verifica
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Stripe raccoglie i dati
                    necessari per identificazione,
                    verifica e accrediti.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                  3
                </span>

                <div>
                  <p className="font-semibold text-slate-900">
                    Abilita i trasferimenti
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Una volta completati i
                    requisiti Stripe, il tuo
                    account potrà ricevere
                    trasferimenti dalla
                    piattaforma.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                  4
                </span>

                <div>
                  <p className="font-semibold text-slate-900">
                    Ricevi gli accrediti
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Dopo l'attivazione dei
                    pagamenti FG Home Care,
                    gli importi spettanti
                    saranno destinati al tuo
                    saldo Stripe.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* ARCHITETTURA PAGAMENTO */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">
            Flusso economico
          </p>

          <h3 className="mt-1 text-xl font-bold text-slate-900">
            Come sarà gestito il pagamento
          </h3>

          <div className="mt-7 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-5 text-center">
              <p className="font-bold text-slate-900">
                Paziente
              </p>

              <p className="mt-2 text-sm text-slate-600">
                paga la prestazione
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-5 text-center">
              <p className="font-bold text-blue-900">
                FG Home Care
              </p>

              <p className="mt-2 text-sm text-blue-700">
                gestisce il pagamento
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5 text-center">
              <p className="font-bold text-slate-900">
                Commissione
              </p>

              <p className="mt-2 text-sm text-slate-600">
                quota della piattaforma
              </p>
            </div>

            <div className="rounded-2xl bg-green-50 p-5 text-center">
              <p className="font-bold text-green-900">
                Professionista
              </p>

              <p className="mt-2 text-sm text-green-700">
                riceve il netto
              </p>
            </div>
          </div>
        </section>

        {/* ACCOUNT ID */}

        {connected && (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Account collegato
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-900">
              Identificativo Stripe
            </h3>

            <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3">
              <code className="break-all text-sm text-slate-700">
                {
                  professionalProfile
                    .stripe_account_id
                }
              </code>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Questo identificativo viene
              utilizzato internamente da
              FG Home Care per associare i
              trasferimenti al tuo account
              Stripe.
            </p>
          </section>
        )}

        {/* DEBUG LEGACY SOLO DEV */}

        {process.env.NODE_ENV ===
          "development" && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Debug sviluppo
            </p>

            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <p>
                Transfers v2:{" "}
                {String(
                  transfersEnabled
                )}
              </p>

              <p>
                Charges legacy:{" "}
                {String(
                  legacyChargesEnabled
                )}
              </p>

              <p>
                Payouts:{" "}
                {String(
                  payoutsEnabled
                )}
              </p>

              <p>
                Details submitted:{" "}
                {String(
                  detailsSubmitted
                )}
              </p>
            </div>
          </section>
        )}

        {/* AVVISO */}

        <section className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-7">
          <h3 className="text-lg font-bold text-blue-900">
            Modalità di configurazione
          </h3>

          <p className="mt-3 text-sm leading-6 text-blue-800">
            In questa fase FG Home Care sta
            configurando Stripe Connect.
            Non vengono ancora effettuati
            pagamenti reali, addebiti al
            paziente o trasferimenti al
            professionista.
          </p>
        </section>
      </div>
    </main>
  );
}