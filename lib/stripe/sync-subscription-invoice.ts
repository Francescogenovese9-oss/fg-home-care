import "server-only";

import Stripe from "stripe";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SubscriptionInvoiceStatus =
  | "PAID"
  | "FAILED";

function getCustomerId(
  invoice: Stripe.Invoice
) {
  if (!invoice.customer) {
    return null;
  }

  return typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer.id;
}

function getSubscriptionId(
  invoice: Stripe.Invoice
) {
  const subscription =
    invoice.parent?.subscription_details
      ?.subscription;

  if (!subscription) {
    return null;
  }

  return typeof subscription === "string"
    ? subscription
    : subscription.id;
}

export async function syncSubscriptionInvoice(
  invoice: Stripe.Invoice,
  status: SubscriptionInvoiceStatus
) {
  const customerId =
    getCustomerId(invoice);

  if (!customerId) {
    console.log(
      "Invoice ignorata: customer Stripe assente.",
      invoice.id
    );

    return {
      ignored: true,
    };
  }

  const subscriptionId =
    getSubscriptionId(invoice);

  if (!subscriptionId) {
    console.log(
      "Invoice ignorata: non collegata a subscription.",
      invoice.id
    );

    return {
      ignored: true,
    };
  }

  const supabase =
    getSupabaseAdmin();

  const {
    data: professional,
    error: professionalError,
  } = await supabase
    .from("professional_profiles")
    .select(
      `
        user_id,
        stripe_customer_id,
        stripe_subscription_id
      `
    )
    .eq(
      "stripe_customer_id",
      customerId
    )
    .maybeSingle();

  if (professionalError) {
    throw professionalError;
  }

  if (!professional) {
    console.log(
      "Invoice ignorata: customer non associato a professionista.",
      {
        invoiceId: invoice.id,
        customerId,
      }
    );

    return {
      ignored: true,
    };
  }

  if (
    professional.stripe_subscription_id &&
    professional.stripe_subscription_id !==
      subscriptionId
  ) {
    console.log(
      "Invoice ignorata: subscription diversa da quella Premium registrata.",
      {
        invoiceId: invoice.id,
        subscriptionId,
        professionalId:
          professional.user_id,
      }
    );

    return {
      ignored: true,
    };
  }

  const paidTimestamp =
    invoice.status_transitions?.paid_at ??
    null;

  const paidAt =
    status === "PAID"
      ? new Date(
          (paidTimestamp ??
            invoice.created) * 1000
        ).toISOString()
      : null;

  const amountPaid =
    status === "PAID"
      ? invoice.amount_paid
      : 0;

  const {
    error: upsertError,
  } = await supabase
    .from(
      "professional_subscription_payments"
    )
    .upsert(
      {
        professional_id:
          professional.user_id,

        stripe_invoice_id:
          invoice.id,

        stripe_subscription_id:
          subscriptionId,

        stripe_payment_intent_id:
          null,

        amount_paid:
          amountPaid,

        currency:
          invoice.currency,

        status,

        paid_at:
          paidAt,
      },
      {
        onConflict:
          "stripe_invoice_id",
      }
    );

  if (upsertError) {
    throw upsertError;
  }

  console.log(
    "Subscription invoice sincronizzata:",
    {
      invoiceId:
        invoice.id,
      professionalId:
        professional.user_id,
      subscriptionId,
      amountPaid,
      status,
    }
  );

  return {
    ignored: false,
    professionalId:
      professional.user_id,
    subscriptionId,
    amountPaid,
    status,
    paidAt,
  };
}
