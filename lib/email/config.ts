import "server-only";

const BREVO_API_URL =
  "https://api.brevo.com/v3";

function getRequiredEnvironmentVariable(
  name: string
) {
  const value =
    process.env[name]
      ?.trim();

  if (!value) {
    throw new Error(
      `${name} non configurata.`
    );
  }

  return value;
}

export function getBrevoApiKey() {
  return getRequiredEnvironmentVariable(
    "BREVO_API_KEY"
  );
}

export function getBrevoSenderEmail() {
  return getRequiredEnvironmentVariable(
    "BREVO_SENDER_EMAIL"
  );
}

export function getBrevoSenderName() {
  return getRequiredEnvironmentVariable(
    "BREVO_SENDER_NAME"
  );
}

export function getBrevoApiUrl() {
  return BREVO_API_URL;
}
