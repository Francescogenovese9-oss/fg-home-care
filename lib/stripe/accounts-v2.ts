import "server-only";

const STRIPE_V2_API_VERSION =
  "2026-07-29.dahlia";

export type StripeV2CapabilityStatus =
  | "active"
  | "pending"
  | "restricted"
  | "unsupported";

export type StripeV2Requirement = {
  awaiting_action_from?: "user" | "stripe";
  description?: string;
  minimum_deadline?: {
    status?:
      | "currently_due"
      | "eventually_due"
      | "past_due";
  };
};

export type StripeV2Account = {
  id: string;

  object: "v2.core.account";

  contact_email?: string | null;

  display_name?: string | null;

  dashboard?: "express" | "full" | "none" | null;

  applied_configurations?: string[];

  configuration?: {
    recipient?: {
      capabilities?: {
        stripe_balance?: {
          payouts?: {
            status: StripeV2CapabilityStatus;
          };

          stripe_transfers?: {
            status: StripeV2CapabilityStatus;
          };
        };
      };
    };
  };

  requirements?: {
    entries?: StripeV2Requirement[];
  } | null;

  future_requirements?: {
    entries?: StripeV2Requirement[];
  } | null;

  metadata?: Record<string, string>;
};

function getSecretKey() {
  const secretKey =
    process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY non configurata."
    );
  }

  return secretKey;
}

async function parseStripeResponse<T>(
  response: Response
): Promise<T> {
  const body = await response.json();

  if (!response.ok) {
    console.error(
      "Errore Stripe API v2:",
      body
    );

    const stripeMessage =
      body?.error?.message ??
      body?.message ??
      "Errore Stripe.";

    throw new Error(stripeMessage);
  }

  return body as T;
}

export async function createStripeV2Account({
  userId,
  email,
  displayName,
  profession,
}: {
  userId: string;
  email?: string | null;
  displayName: string;
  profession?: string | null;
}) {
  const response = await fetch(
    "https://api.stripe.com/v2/core/accounts",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        "Content-Type": "application/json",
        "Stripe-Version":
          STRIPE_V2_API_VERSION,
      },

      body: JSON.stringify({
        contact_email:
          email || undefined,

        display_name: displayName,

        identity: {
          country: "IT",
        },

        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: {
                  requested: true,
                },
              },
            },
          },
        },

        defaults: {
          responsibilities: {
            fees_collector:
              "application",

            losses_collector:
              "application",
          },

          currency: "eur",

          locales: ["it-IT"],

          profile: {
            product_description:
              profession
                ? `Servizi sanitari domiciliari - ${profession}`
                : "Servizi sanitari domiciliari",
          },
        },

        dashboard: "express",

        metadata: {
          fg_home_care_user_id:
            userId,
        },

        include: [
          "configuration.recipient",
          "defaults",
          "requirements",
          "future_requirements",
          "identity",
        ],
      }),
    }
  );

  return parseStripeResponse<StripeV2Account>(
    response
  );
}

export async function retrieveStripeV2Account(
  accountId: string
) {
  const url = new URL(
    `https://api.stripe.com/v2/core/accounts/${accountId}`
  );

  const includes = [
    "configuration.recipient",
    "defaults",
    "requirements",
    "future_requirements",
    "identity",
  ];

  includes.forEach(
    (value, index) => {
      url.searchParams.set(
        `include[${index}]`,
        value
      );
    }
  );

  const response = await fetch(
    url.toString(),
    {
      method: "GET",

      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        "Stripe-Version":
          STRIPE_V2_API_VERSION,
      },

      cache: "no-store",
    }
  );

  return parseStripeResponse<StripeV2Account>(
    response
  );
}