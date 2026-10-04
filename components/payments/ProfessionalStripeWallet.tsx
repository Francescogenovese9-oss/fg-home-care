"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type Payout = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrivalDate?: string | null;
  arrival_date?: string | null;
};

type BalanceResponse = {
  connected: boolean;
  currency?: string;
  available?: number;
  pending?: number;
  payoutsEnabled?: boolean;
  onboardingCompleted?: boolean;
  payouts?: Payout[];
  message?: string;
};

function formatMoney(
  amount: number,
  currency = "eur"
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

export default function ProfessionalStripeWallet() {
  const [data, setData] =
    useState<BalanceResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadBalance =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "/api/stripe/connect/balance",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const body =
          (await response.json()) as BalanceResponse;

        if (!response.ok) {
          throw new Error(
            body.message ||
              "Impossibile    uperare il saldo."
          );
        }

        setData(body);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Impossibile recuperare il saldo."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  if (loading) {
    return (
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold text-blue-700">
          I tuoi guadagni
        </p>

        <p className="mt-3 text-sm text-slate-500">
          Caricamento saldo Stripe...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-7">
        <p className="font-semibold text-red-800">
          Saldo non disponibile
        </p>

        <p className="mt-2 text-sm text-red-700">
          {error}
        </p>

        <button
          type="button"
          onClick={() => {
            void loadBalance();
          }}
          className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm"
        >
          Riprova
        </button>
      </section>
    );
  }

  if (!data?.connected) {
    return null;
  }

  const currency =
    data.currency ?? "eur";

  const available =
    data.available ?? 0;

  const pending =
    data.pending ?? 0;

  const payouts =
    data.payouts ?? [];

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            I tuoi guadagni
          </p>

          <h3 className="mt-1 text-xl font-bold text-slate-900">
            Saldo professionista
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Importi gestiti tramite Stripe.
          </p>
        </div>

        <span
          className={
            data.payoutsEnabled
              ? "rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700"
              : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"
          }
        >
          {data.payoutsEnabled
            ? "Accrediti attivi"
            : "Accrediti non attivi"}
        </span>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
          <p className="text-sm font-semibold text-green-800">
            Disponibile
          </p>

          <p className="mt-2 text-3xl font-bold text-green-950">
            {formatMoney(
              available,
              currency
            )}
          </p>

          <p className="mt-2 text-sm text-green-700">
            Saldo attualmente disponibile
            per l'accredito.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <p className="text-sm font-semibold text-blue-800">
            In elaborazione
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-950">
            {formatMoney(
              pending,
              currency
            )}
          </p>

          <p className="mt-2 text-sm text-blue-700">
            Compensi in attesa di diventare
            disponibili su Stripe.
          </p>
        </div>
      </div>

      <div className="mt-7 border-t border-slate-100 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-slate-900">
              Ultimi accrediti
            </h4>

            <p className="mt-1 text-sm text-slate-500">
              Storico degli accrediti inviati
              da Stripe.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadBalance();
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Aggiorna
          </button>
        </div>

        {payouts.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-600">
              Nessun accredito ancora
              effettuato.
            </p>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {payouts.map(
              (payout) => {
                const arrivalDate =
                  payout.arrivalDate ??
                  payout.arrival_date ??
                  null;

                return (
                  <div
                    key={payout.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {formatMoney(
                          payout.amount,
                          payout.currency
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {arrivalDate
                          ? new Intl.DateTimeFormat(
                              "it-IT",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }
                            ).format(
                              new Date(
                                arrivalDate
                              )
                            )
                          : "Data accredito non disponibile"}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {payout.status}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </section>
  );
}
