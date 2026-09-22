"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  appointmentId: string;
  isPaid: boolean;
  currency?: string;
};

type PreviewResponse = {
  success?: boolean;

  refundPercent?: number;
  refundAmount?: number;

  refundAllowed?: boolean;

  policyLabel?: string;

  message?: string;
};

type RefundResponse = {
  success?: boolean;
  message?: string;
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

export default function CancelPaidAppointmentButton({
  appointmentId,
  isPaid,
  currency = "EUR",
}: Props) {
  const router = useRouter();

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function cancelAppointment() {
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      /*
       * Prima calcoliamo la policy.
       */
      const previewResponse =
        await fetch(
          "/api/payments/refund-preview",
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

      const preview =
        (await previewResponse.json()) as PreviewResponse;

      if (!previewResponse.ok) {
        setError(
          preview.message ??
            "Impossibile calcolare la cancellazione."
        );

        return;
      }

      const refundPercent =
        preview.refundPercent ??
        0;

      const refundAmount =
        preview.refundAmount ??
        0;

      let confirmationMessage =
        "Vuoi davvero annullare questa prenotazione?";

      if (isPaid) {
        if (
          refundPercent === 100
        ) {
          confirmationMessage =
            `Vuoi annullare la prenotazione? Riceverai un rimborso completo di ${formatMoney(
              refundAmount,
              currency
            )}.`;
        } else if (
          refundPercent === 50
        ) {
          confirmationMessage =
            `Vuoi annullare la prenotazione? In base alla policy riceverai il 50%, pari a ${formatMoney(
              refundAmount,
              currency
            )}.`;
        } else {
          confirmationMessage =
            "Vuoi annullare la prenotazione? Mancano meno di 12 ore e non è previsto alcun rimborso.";
        }
      }

      const confirmed =
        window.confirm(
          confirmationMessage
        );

      if (!confirmed) {
        return;
      }

      const response =
        await fetch(
          "/api/payments/refund",
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
        (await response.json()) as RefundResponse;

      if (!response.ok) {
        setError(
          result.message ??
            "Operazione non riuscita."
        );

        return;
      }

      setMessage(
        result.message ??
          "Prenotazione annullata."
      );

      router.refresh();
    } catch (requestError) {
      console.error(
        "Errore cancellazione:",
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
          void cancelAppointment()
        }
        disabled={isLoading}
        className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading
          ? "Verifica cancellazione..."
          : "Annulla prenotazione"}
      </button>

      {error && (
        <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-3 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
    </div>
  );
}