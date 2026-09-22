"use client";

import {
  useState,
} from "react";

type Props = {
  plan: "BASIC" | "PREMIUM";
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  verificationApproved: boolean;
};

export default function ProfessionalSubscriptionCard({
  plan,
  status,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  verificationApproved,
}: Props) {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const isPremium =
    plan === "PREMIUM" &&
    status === "active";

  const periodEndFormatted =
    currentPeriodEnd
      ? new Intl.DateTimeFormat(
          "it-IT",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }
        ).format(
          new Date(
            currentPeriodEnd
          )
        )
      : null;

  async function openStripe(
    endpoint: string
  ) {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          endpoint,
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.url
      ) {
        throw new Error(
          data.message ||
            "Operazione non disponibile."
        );
      }

      window.location.href =
        data.url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Si è verificato un errore."
      );

      setLoading(false);
    }
  }

  return (
    <section
      className={
        isPremium
          ? "mt-8 rounded-3xl border border-blue-200 bg-white p-7 shadow-sm"
          : "mt-8 rounded-3xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 via-white to-white p-7 shadow-md"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Piano professionale
          </p>

          <h3 className="mt-1 text-2xl font-bold text-slate-900">
            {isPremium
              ? "FG Home Care Premium"
              : "FG Home Care Basic"}
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {isPremium
              ? "Commissione ridotta all'8% sulle prestazioni, maggiore visibilità e funzionalità Premium."             : "Il piano Basic non prevede un canone mensile e applica una commissione del 15% sulle prestazioni. È possibile passare in qualsiasi momento al piano Premium da 19,90 €/mese, con commissione ridotta all'8%."}
          </p>
        </div>

        <span
          className={
            isPremium
              ? "rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"
              : "rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700"
          }
        >
          {isPremium
            ? "PREMIUM"
            : "BASIC"}
        </span>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">
            Canone
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {isPremium
              ? "19,90 € / mese"
              : "0 € / mese"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">
            Commissione
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {isPremium
              ? "8%"
              : "15%"}
          </p>
        </div>
      </div>

      {isPremium &&
        cancelAtPeriodEnd && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">
              Disdetta programmata
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Il piano Premium rimarrà attivo
              {periodEndFormatted
                ? ` fino al ${periodEndFormatted}.`
                : " fino alla fine del periodo già pagato."}
            </p>
        </div>
        )}

      {!verificationApproved && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Il piano Premium sarà disponibile dopo l'approvazione del profilo professionale.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-7">
        {isPremium ? (
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              openStripe(
                "/api/stripe/subscription/portal"
              )
            }
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Apertura..."
              : "Gestisci abbonamento"}
          </button>
        ) : (
          <button
            type="button"
            disabled={
              loading ||
              !verificationApproved
            }
            onClick={() =>
              openStripe(
                "/api/stripe/subscription/checkout"
              )
            }
            className="wll rounded-2xl bg-blue-700 px-6 py-4 text-base font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {loading
              ? "Apertura..."
              : "Passa a Premium — 19,90 €/mese"}
          </button>
        )}
      </div>
    </section>
  );
}
