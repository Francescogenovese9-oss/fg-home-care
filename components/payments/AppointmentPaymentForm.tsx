"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import { useRouter } from "next/navigation";

import { getStripeClient } from "@/lib/stripe/client";

type AppointmentPaymentFormProps = {
  appointmentId: string;
  amountLabel: string;
};

type CreateIntentResponse = {
  success?: boolean;

  alreadyPaid?: boolean;

  clientSecret?: string | null;

  paymentIntentId?: string;

  message?: string;

  payment?: {
    currency: string;
    subtotalAmount: number;
    platformFeeAmount: number;
    professionalAmount: number;
    commissionPercent: number;
  };
};

function PaymentForm({
  appointmentId,
  amountLabel,
}: AppointmentPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setError("");
    setSuccess(false);
    setIsSubmitting(true);

    try {
      /*
       * Chiediamo a Stripe Elements
       * di validare prima i campi.
       */
      const {
        error: submitError,
      } = await elements.submit();

      if (submitError) {
        setError(
          submitError.message ??
            "Controlla i dati inseriti."
        );

        return;
      }

      /*
       * Conferma PaymentIntent.
       */
      const {
        error: confirmError,
        paymentIntent,
      } = await stripe.confirmPayment({
        elements,

        confirmParams: {
          return_url:
            `${window.location.origin}/dashboard/patient/appointments/${appointmentId}/payment`,
        },

        /*
         * Per le carte normali Stripe
         * non effettua redirect.
         *
         * Per eventuali metodi che lo
         * richiedono utilizzerà return_url.
         */
        redirect: "if_required",
      });

      if (confirmError) {
        setError(
          confirmError.message ??
            "Il pagamento non è riuscito."
        );

        return;
      }

      if (!paymentIntent) {
        setError(
          "Stripe non ha restituito lo stato del pagamento."
        );

        return;
      }

      switch (paymentIntent.status) {
        case "succeeded":
          setSuccess(true);

          /*
           * Nel prossimo Sprint 4.5
           * sarà il webhook Stripe
           * ad aggiornare Supabase
           * da PROCESSING a PAID.
           */
          setTimeout(() => {
            router.push(
              "/dashboard/patient/appointments"
            );

            router.refresh();
          }, 1800);

          break;

        case "processing":
          setSuccess(true);

          setTimeout(() => {
            router.push(
              "/dashboard/patient/appointments"
            );

            router.refresh();
          }, 1800);

          break;

        case "requires_payment_method":
          setError(
            "Il metodo di pagamento non è stato accettato. Prova con un'altra carta."
          );
          break;

        default:
          setError(
            `Il pagamento è nello stato: ${paymentIntent.status}.`
          );
      }
    } catch (requestError) {
      console.error(
        "Errore conferma pagamento:",
        requestError
      );

      setError(
        "Si è verificato un errore durante il pagamento."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-2xl border border-green-300 bg-green-50 px-5 py-4 text-sm font-semibold text-green-700"
        >
          Pagamento confermato. Stai per essere
          reindirizzato alle tue prenotazioni.
        </div>
      )}

      <button
        type="submit"
        disabled={
          !stripe ||
          !elements ||
          isSubmitting ||
          success
        }
        className="w-full rounded-xl bg-green-700 px-6 py-4 text-base font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting
          ? "Pagamento in corso..."
          : `Paga ${amountLabel}`}
      </button>

      <p className="text-center text-xs leading-5 text-slate-500">
        Il pagamento viene elaborato in modo
        sicuro da Stripe. FG Home Care non
        memorizza i dati completi della carta.
      </p>
    </form>
  );
}

export default function AppointmentPaymentForm({
  appointmentId,
  amountLabel,
}: AppointmentPaymentFormProps) {
  const [clientSecret, setClientSecret] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function preparePayment() {
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
          (await response.json()) as CreateIntentResponse;

        if (cancelled) {
          return;
        }

        if (result.alreadyPaid) {
          setError(
            "Questa prestazione risulta già pagata."
          );

          return;
        }

        if (
          !response.ok ||
          !result.clientSecret
        ) {
          setError(
            result.message ??
              "Non è stato possibile inizializzare il pagamento."
          );

          return;
        }

        setClientSecret(
          result.clientSecret
        );
      } catch (requestError) {
        console.error(
          "Errore inizializzazione Stripe:",
          requestError
        );

        if (!cancelled) {
          setError(
            "Impossibile comunicare con il server."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void preparePayment();

    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="animate-pulse space-y-5">
          <div className="h-6 w-48 rounded bg-slate-200" />

          <div className="h-16 rounded-xl bg-slate-100" />

          <div className="h-16 rounded-xl bg-slate-100" />

          <div className="h-14 rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (
    error ||
    !clientSecret
  ) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Pagamento non disponibile
        </h2>

        <p className="mt-3 text-sm leading-6 text-red-700">
          {error ||
            "Impossibile inizializzare Stripe."}
        </p>
      </div>
    );
  }

  const stripePromise =
    getStripeClient();

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,

        appearance: {
          theme: "stripe",

          variables: {
            borderRadius: "12px",
          },
        },

        loader: "auto",
      }}
    >
      <PaymentForm
        appointmentId={
          appointmentId
        }
        amountLabel={
          amountLabel
        }
      />
    </Elements>
  );
}