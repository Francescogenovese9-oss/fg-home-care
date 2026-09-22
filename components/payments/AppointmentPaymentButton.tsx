"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AppointmentPaymentButtonProps = {
  appointmentId: string;
};

type PaymentResponse = {
  success?: boolean;
  clientSecret?: string | null;
  paymentIntentId?: string;
  message?: string;
};

export default function AppointmentPaymentButton({
  appointmentId,
}: AppointmentPaymentButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function preparePayment() {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "/api/payments/create-intent",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            appointmentId,
          }),
        }
      );

      const result =
        (await response.json()) as PaymentResponse;

      if (
        !response.ok ||
        !result.clientSecret
      ) {
        setError(
          result.message ||
            "Impossibile preparare il pagamento."
        );

        return;
      }

      /*
       * Nel prossimo punto monteremo
       * Stripe Elements.
       *
       * Per ora portiamo il paziente
       * alla pagina pagamento.
       */
      router.push(
        `/dashboard/patient/appointments/${appointmentId}/payment`
      );
    } catch (requestError) {
      console.error(
        "Errore preparazione pagamento:",
        requestError
      );

      setError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          void preparePayment()
        }
        disabled={isLoading}
        className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading
          ? "Preparazione pagamento..."
          : "Paga prestazione"}
      </button>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
    </div>
  );
}