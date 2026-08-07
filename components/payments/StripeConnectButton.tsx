"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StripeConnectButtonProps = {
  isConnected: boolean;
  onboardingCompleted: boolean;
};

type OnboardingResponse = {
  success?: boolean;
  url?: string;
  message?: string;
};

export default function StripeConnectButton({
  isConnected,
  onboardingCompleted,
}: StripeConnectButtonProps) {
  const router = useRouter();

  const [isStarting, setIsStarting] =
    useState(false);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  async function startOnboarding() {
    setError("");
    setIsStarting(true);

    try {
      const response = await fetch(
        "/api/stripe/connect/onboarding",
        {
          method: "POST",
        }
      );

      const result =
        (await response.json()) as OnboardingResponse;

      if (
        !response.ok ||
        !result.url
      ) {
        setError(
          result.message ||
            "Impossibile avviare Stripe."
        );

        return;
      }

      window.location.href =
        result.url;
    } catch (requestError) {
      console.error(
        "Errore Stripe onboarding:",
        requestError
      );

      setError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsStarting(false);
    }
  }

  async function refreshStatus() {
    setError("");
    setIsRefreshing(true);

    try {
      const response = await fetch(
        "/api/stripe/connect/status",
        {
          method: "POST",
        }
      );

      const result =
        (await response.json()) as {
          message?: string;
        };

      if (!response.ok) {
        setError(
          result.message ||
            "Impossibile aggiornare lo stato."
        );

        return;
      }

      router.refresh();
    } catch (requestError) {
      console.error(
        "Errore aggiornamento Stripe:",
        requestError
      );

      setError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="space-y-4">
      {!onboardingCompleted && (
        <button
          type="button"
          onClick={() =>
            void startOnboarding()
          }
          disabled={isStarting}
          className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStarting
            ? "Collegamento a Stripe..."
            : isConnected
              ? "Continua configurazione Stripe"
              : "Collega Stripe"}
        </button>
      )}

      <button
        type="button"
        onClick={() =>
          void refreshStatus()
        }
        disabled={isRefreshing}
        className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRefreshing
          ? "Aggiornamento..."
          : "Aggiorna stato Stripe"}
      </button>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
    </div>
  );
}