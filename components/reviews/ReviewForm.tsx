"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type ReviewFormProps = {
  appointmentId: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
};

export default function ReviewForm({
  appointmentId,
}: ReviewFormProps) {
  const router = useRouter();

  const [rating, setRating] =
    useState(5);

  const [comment, setComment] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function submitReview(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      rating < 1 ||
      rating > 5
    ) {
      setError(
        "Seleziona una valutazione."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/reviews",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              appointmentId,
              rating,
              comment,
            }),
          }
        );

      const result =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(
          result.message ??
            "Impossibile pubblicare la recensione."
        );

        return;
      }

      setSuccess(
        result.message ??
          "Recensione pubblicata."
      );

      router.refresh();
    } catch (requestError) {
      console.error(
        "Errore recensione:",
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
    <form
      onSubmit={submitReview}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Recensione verificata
      </p>

      <h4 className="mt-2 text-lg font-bold text-slate-900">
        Valuta la prestazione
      </h4>

      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4, 5].map(
          (value) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setRating(value)
              }
              aria-label={`${value} stelle`}
              className="text-3xl transition hover:scale-110"
            >
              {value <= rating
                ? "★"
                : "☆"}
            </button>
          )
        )}
      </div>

      <p className="mt-2 text-sm font-semibold text-slate-700">
        {rating}/5
      </p>

      <label
        htmlFor={`review-${appointmentId}`}
        className="mt-5 block text-sm font-semibold text-slate-700"
      >
        Commento
      </label>

      <textarea
        id={`review-${appointmentId}`}
        rows={4}
        maxLength={1500}
        value={comment}
        onChange={(event) =>
          setComment(
            event.target.value
          )
        }
        placeholder="Racconta la tua esperienza..."
        className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />

      <div className="mt-2 text-right text-xs text-slate-400">
        {comment.length}/1500
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting
          ? "Pubblicazione..."
          : "Pubblica recensione"}
      </button>
    </form>
  );
}