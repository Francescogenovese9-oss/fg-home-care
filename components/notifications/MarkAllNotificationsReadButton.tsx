"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ApiResponse = {
  success?: boolean;
  message?: string;
};

export default function MarkAllNotificationsReadButton() {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  async function markAllAsRead() {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/notifications/read",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            markAll: true,
          }),
        }
      );

      const result =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(
          result.message ||
            "Aggiornamento non riuscito."
        );
        return;
      }

      router.refresh();
    } catch (requestError) {
      console.error(
        "Errore lettura notifiche:",
        requestError
      );

      setError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          void markAllAsRead()
        }
        disabled={isSubmitting}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting
          ? "Aggiornamento..."
          : "Segna tutte come lette"}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-2 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}