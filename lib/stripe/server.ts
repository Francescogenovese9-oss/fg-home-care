import "server-only";

import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe() {
  const secretKey =
    process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY non configurata."
    );
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      typescript: true,
      appInfo: {
        name: "FG Home Care",
      },
    });
  }

  return stripeInstance;
}