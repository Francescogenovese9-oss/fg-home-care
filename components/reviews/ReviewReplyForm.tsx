"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type ReviewReplyFormProps = {
  reviewId: string;

  initialReply?:
    | string
    | null;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
};

export default function ReviewReplyForm({
  reviewId,
  initialReply = null,
}: ReviewReplyFormProps) {
  const router =
    useRouter();

  const [reply, setReply] =
    useState(
      initialReply ?? ""
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const hasExistingReply =
    Boolean(
      initialReply?.trim()
    );

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanedReply =
      reply.trim();

    if (!cleanedReply) {
      setError(
        "Inserisci una risposta."
      );

      return;
    }

    if (
      cleanedReply.length >
      1500
    ) {
      setError(
        "La risposta non può superare 1.500 caratteri."
      );

      return;
    }

    setIsSubmitting(
      true
    );

    try {
      const response =
        await fetch(
          "/api/reviews/reply",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              {
                reviewId,
                reply:
                  cleanedReply,
              }
            ),
          }
        );

      const result =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(
          result.message ??
            "Impossibile salvare la risposta."
        );

        return;
      }

      setSuccess(
        result.message ??
          "Risposta salvata."
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Errore invio risposta recensione:",
        error
      );

      setError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Risposta pubblica
      </p>

      <h5 className="mt-2 font-bold text-slate-900">
        {hasExistingReply
          ? "Modifica la tua risposta"
          : "Rispondi alla recensione"}
      </h5>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        La risposta sarà
        visibile pubblicamente
        nel tuo profilo
        professionale.
      </p>

      <label
        htmlFor={`reply-${reviewId}`}
        className="sr-only"
      >
        Risposta alla recensione
      </label>

      <textarea
        id={`reply-${reviewId}`}
        rows={4}
        maxLength={1500}
        value={reply}
        onChange={(
          event
        ) =>
          setReply(
            event.target.value
          )
        }
        placeholder="Ringrazia il paziente o rispondi in modo professionale al feedback..."
        className="mt-4 w-full resize-none rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          Mantieni una risposta
          professionale e non
          inserire informazioni
          sanitarie personali del
          paziente.
        </p>

        <p className="shrink-0 text-xs text-slate-400">
          {
            reply.length
          }
          /1500
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={
          isSubmitting
        }
        className="mt-4 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting
          ? "Salvataggio..."
          : hasExistingReply
            ? "Aggiorna risposta"
            : "Pubblica risposta"}
      </button>
    </form>
  );
}