"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Props = {
  reportId: string;

  reviewHidden: boolean;

  reportStatus:
    | "OPEN"
    | "RESOLVED"
    | "DISMISSED";
};

type Action =
  | "HIDE"
  | "RESTORE"
  | "DISMISS";

export default function ReviewModerationActions({
  reportId,
  reviewHidden,
  reportStatus,
}: Props) {
  const router =
    useRouter();

  const [
    adminNotes,
    setAdminNotes,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  async function moderate(
    action: Action
  ) {
    setError("");
    setMessage("");
    setIsLoading(
      true
    );

    try {
      const response =
        await fetch(
          "/api/admin/reviews/moderate",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                reportId,
                action,
                adminNotes,
              }),
          }
        );

      const result =
        (await response.json()) as {
          success?: boolean;
          message?: string;
        };

      if (!response.ok) {
        setError(
          result.message ??
            "Operazione non riuscita."
        );

        return;
      }

      setMessage(
        result.message ??
          "Operazione completata."
      );

      router.refresh();
    } catch (requestError) {
      console.error(
        requestError
      );

      setError(
        "Impossibile comunicare con il server."
      );
    } finally {
      setIsLoading(
        false
      );
    }
  }

  return (
    <div className="mt-5 rounded-2xl bg-slate-50 p-5">
      <label className="text-sm font-semibold text-slate-700">
        Nota amministratore
      </label>

      <textarea
        rows={3}
        maxLength={1500}
        value={
          adminNotes
        }
        onChange={(
          event
        ) =>
          setAdminNotes(
            event.target.value
          )
        }
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
        placeholder="Motivazione della decisione..."
      />

      <div className="mt-4 flex flex-wrap gap-3">
        {!reviewHidden && (
          <button
            type="button"
            disabled={
              isLoading
            }
            onClick={() =>
              void moderate(
                "HIDE"
              )
            }
            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Nascondi recensione
          </button>
        )}

        {reviewHidden && (
          <button
            type="button"
            disabled={
              isLoading
            }
            onClick={() =>
              void moderate(
                "RESTORE"
              )
            }
            className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Ripristina
          </button>
        )}

        {reportStatus ===
          "OPEN" && (
          <button
            type="button"
            disabled={
              isLoading
            }
            onClick={() =>
              void moderate(
                "DISMISS"
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Respinge segnalazione
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p className="mt-3 text-sm text-green-700">
          {message}
        </p>
      )}
    </div>
  );
}