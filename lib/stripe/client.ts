import { loadStripe } from "@stripe/stripe-js";

let stripePromise: ReturnType<
  typeof loadStripe
> | null = null;

export function getStripeClient() {
  const publishableKey =
    process.env
      .NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      ?.trim();

  if (!publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY non configurata."
    );
  }

  if (!stripePromise) {
    stripePromise =
      loadStripe(publishableKey);
  }

  return stripePromise;
}