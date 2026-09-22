import "server-only";

import Stripe from "stripe";

import {
  sendIdempotentTransactionalEmail,
} from "@/lib/email/send-idempotent-transactional-email";

import {
  refundConfirmedTemplate,
} from "@/lib/email/templates/refund-confirmed";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

type SyncedRefundAppointment = {
  id: string;
  patient_id: string;
  professional_id: string;

  status: string;
  payment_status: string;

  appointment_date: string;
  appointment_time: string;

  subtotal_amount: number | null;

  stripe_payment_intent_id:
    | string
    | null;

  stripe_charge_id:
    | string
    | null;

  stripe_refund_id:
    | string
    | null;

  refund_amount:
    | number
    | null;

  refund_percent:
    | number
    | null;

  cancellation_policy:
    | string
    | null;

  paid_at:
    | string
    | null;

  refunded_at:
    | string
    | null;

  cancelled_at:
    | string
    | null;

  payment_updated_at:
    | string
    | null;

  updated_at: string;
};

type RefundNotificationType =
  | "APPOINTMENT_REFUND_CONFIRMED"
  | "APPOINTMENT_REFUND_RECEIVED";

type EnsureRefundNotificationInput = {
  supabase: ReturnType<
    typeof getSupabaseAdmin
  >;

  userId: string;
  appointmentId: string;

  type:
    RefundNotificationType;

  title: string;
  message: string;
  link: string;
};

type EnsureRefundNotificationResult = {
  id: string | null;
  created: boolean;
};

export type SyncRefundResult = {
  appointment:
    SyncedRefundAppointment;

  refundId:
    string;

  refundAmount:
    number;

  refundPercent:
    number;

  fullRefund:
    boolean;

  paymentStatus:
    | "REFUNDED"
    | "PARTIALLY_REFUNDED";

  patientNotificationId:
    string | null;

  patientNotificationCreated:
    boolean;

  professionalNotificationId:
    string | null;

  professionalNotificationCreated:
    boolean;

  emailEventId:
    string | null;

  emailMessageId:
    string | null;

  emailSent:
    boolean;

  emailSkipped:
    boolean;
};

/*
 * =====================================================
 * STRIPE HELPERS
 * =====================================================
 */

function getPaymentIntentId(
  refund: Stripe.Refund
) {
  return typeof refund.payment_intent ===
    "string"
    ? refund.payment_intent
    : refund.payment_intent?.id ??
        null;
}

function getChargeId(
  refund: Stripe.Refund
) {
  return typeof refund.charge ===
    "string"
    ? refund.charge
    : refund.charge?.id ??
        null;
}

function getAppointmentId(
  refund: Stripe.Refund
) {
  return (
    refund.metadata
      ?.fg_home_care_appointment_id ??
    null
  );
}

/*
 * =====================================================
 * DISPLAY HELPERS
 * =====================================================
 */

function buildDisplayName(
  firstName:
    | string
    | null
    | undefined,
  lastName:
    | string
    | null
    | undefined,
  fallback: string
) {
  return (
    [
      firstName,
      lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    fallback
  );
}

function formatRefundAmount(
  amount: number
) {
  return new Intl.NumberFormat(
    "it-IT",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(
    amount / 100
  );
}

/*
 * =====================================================
 * REFUND PERCENT
 * =====================================================
 */

function resolveRefundPercent({
  refund,
  subtotalAmount,
}: {
  refund: Stripe.Refund;
  subtotalAmount: number;
}) {
  const metadataPercent =
    refund.metadata
      ?.fg_home_care_refund_percent;

  if (metadataPercent) {
    const parsed =
      Number(metadataPercent);

    if (
      Number.isFinite(parsed) &&
      parsed > 0 &&
      parsed <= 100
    ) {
      return parsed;
    }
  }

  if (subtotalAmount <= 0) {
    throw new Error(
      "Subtotal non valido durante la sincronizzazione del rimborso."
    );
  }

  const calculated =
    Math.round(
      (
        refund.amount /
        subtotalAmount
      ) *
        100
    );

  if (
    calculated <= 0 ||
    calculated > 100
  ) {
    throw new Error(
      `Percentuale rimborso non valida per Refund ${refund.id}.`
    );
  }

  return calculated;
}

function buildCancellationPolicy(
  refundPercent: number
) {
  if (refundPercent === 100) {
    return "Rimborso completo.";
  }

  if (refundPercent === 50) {
    return "Rimborso del 50%.";
  }

  return `Rimborso del ${refundPercent}%.`;
}

/*
 * =====================================================
 * NOTIFICA IDEMPOTENTE
 * =====================================================
 *
 * Il vincolo UNIQUE parziale PostgreSQL resta
 * l'ultima barriera contro notifiche duplicate.
 * =====================================================
 */

async function ensureRefundNotification({
  supabase,
  userId,
  appointmentId,
  type,
  title,
  message,
  link,
}: EnsureRefundNotificationInput): Promise<EnsureRefundNotificationResult> {
  const {
    data:
      existingNotification,

    error:
      existingNotificationError,
  } = await supabase
    .from(
      "notifications"
    )
    .select(
      "id"
    )
    .eq(
      "user_id",
      userId
    )
    .eq(
      "appointment_id",
      appointmentId
    )
    .eq(
      "type",
      type
    )
    .maybeSingle();

  if (
    existingNotificationError
  ) {
    throw existingNotificationError;
  }

  if (
    existingNotification
  ) {
    return {
      id:
        existingNotification.id,

      created:
        false,
    };
  }

  const {
    data:
      createdNotification,

    error:
      notificationError,
  } = await supabase
    .from(
      "notifications"
    )
    .insert({
      user_id:
        userId,

      appointment_id:
        appointmentId,

      review_report_id:
        null,

      type,

      title,

      message,

      link,

      read:
        false,
    })
    .select(
      "id"
    )
    .maybeSingle();

  if (
    notificationError
  ) {
    /*
     * 23505:
     * un altro processo ha creato la stessa
     * notifica tra SELECT e INSERT.
     */
    if (
      notificationError.code ===
      "23505"
    ) {
      const {
        data:
          concurrentNotification,

        error:
          concurrentNotificationError,
      } = await supabase
        .from(
          "notifications"
        )
        .select(
          "id"
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "appointment_id",
          appointmentId
        )
        .eq(
          "type",
          type
        )
        .maybeSingle();

      if (
        concurrentNotificationError
      ) {
        throw concurrentNotificationError;
      }

      return {
        id:
          concurrentNotification
            ?.id ??
          null,

        created:
          false,
      };
    }

    throw notificationError;
  }

  return {
    id:
      createdNotification?.id ??
      null,

    created:
      true,
  };
}

/*
 * =====================================================
 * SYNC REFUND
 * =====================================================
 */

export async function syncRefund(
  refund: Stripe.Refund
): Promise<SyncRefundResult> {
  /*
   * =====================================================
   * VERIFICA STATO STRIPE
   * =====================================================
   */

  if (
    refund.status !==
    "succeeded"
  ) {
    throw new Error(
      `Il Refund ${refund.id} non risulta succeeded su Stripe.`
    );
  }

  /*
   * =====================================================
   * IDENTIFICATORI STRIPE
   * =====================================================
   */

  const paymentIntentId =
    getPaymentIntentId(
      refund
    );

  if (!paymentIntentId) {
    throw new Error(
      `Refund ${refund.id} senza PaymentIntent Stripe.`
    );
  }

  const refundAppointmentId =
    getAppointmentId(
      refund
    );

  const chargeId =
    getChargeId(
      refund
    );

  const supabase =
    getSupabaseAdmin();

  /*
   * =====================================================
   * LETTURA APPOINTMENT
   * =====================================================
   */

  const {
    data:
      currentAppointment,

    error:
      currentAppointmentError,
  } = await supabase
    .from(
      "appointments"
    )
    .select(
      `
        id,
        patient_id,
        professional_id,

        status,
        payment_status,

        appointment_date,
        appointment_time,

        subtotal_amount,

        stripe_payment_intent_id,
        stripe_charge_id,
        stripe_refund_id,

        refund_amount,
        refund_percent,
        cancellation_policy,

        paid_at,
        refunded_at,
        cancelled_at,

        payment_updated_at,
        updated_at
      `
    )
    .eq(
      "stripe_payment_intent_id",
      paymentIntentId
    )
    .maybeSingle();

  if (
    currentAppointmentError
  ) {
    console.error(
      "Errore lettura appointment durante sincronizzazione refund:",
      {
        refundId:
          refund.id,

        paymentIntentId,

        message:
          currentAppointmentError.message,

        code:
          currentAppointmentError.code,

        details:
          currentAppointmentError.details,

        hint:
          currentAppointmentError.hint,
      }
    );

    throw currentAppointmentError;
  }

  if (
    !currentAppointment
  ) {
    throw new Error(
      `Nessun appointment FG Home Care trovato per PaymentIntent ${paymentIntentId}.`
    );
  }

  /*
   * Se Stripe contiene anche appointmentId nei metadata,
   * deve corrispondere al record trovato.
   */

  if (
    refundAppointmentId &&
    refundAppointmentId !==
      currentAppointment.id
  ) {
    throw new Error(
      `Refund ${refund.id}: appointment metadata ${refundAppointmentId} non corrisponde all'appointment ${currentAppointment.id}.`
    );
  }

  if (
    currentAppointment
      .stripe_payment_intent_id !==
    paymentIntentId
  ) {
    throw new Error(
      `PaymentIntent ${paymentIntentId} non corrisponde a quello registrato sull'appointment ${currentAppointment.id}.`
    );
  }

  /*
   * =====================================================
   * VALIDAZIONE IMPORTI
   * =====================================================
   */

  if (
    currentAppointment
      .subtotal_amount ===
    null
  ) {
    throw new Error(
      `Subtotal mancante per appointment ${currentAppointment.id}.`
    );
  }

  if (
    currentAppointment
      .subtotal_amount <=
    0
  ) {
    throw new Error(
      `Subtotal non valido per appointment ${currentAppointment.id}.`
    );
  }

  if (
    !Number.isInteger(
      refund.amount
    ) ||
    refund.amount <= 0
  ) {
    throw new Error(
      `Importo non valido per Refund ${refund.id}.`
    );
  }

  if (
    refund.amount >
    currentAppointment
      .subtotal_amount
  ) {
    throw new Error(
      `Refund ${refund.id} superiore al subtotal dell'appointment ${currentAppointment.id}.`
    );
  }

  const refundPercent =
    resolveRefundPercent({
      refund,

      subtotalAmount:
        currentAppointment
          .subtotal_amount,
    });

  const fullRefund =
    refundPercent ===
    100;

  const paymentStatus:
    | "REFUNDED"
    | "PARTIALLY_REFUNDED" =
    fullRefund
      ? "REFUNDED"
      : "PARTIALLY_REFUNDED";

  const now =
    new Date()
      .toISOString();

  /*
   * Preserviamo i timestamp originari
   * quando la sincronizzazione viene ripetuta.
   */

  const cancelledAt =
    currentAppointment
      .cancelled_at ??
    now;

  const refundedAt =
    currentAppointment
      .refunded_at ??
    now;

  const cancellationPolicy =
    currentAppointment
      .cancellation_policy ??
    buildCancellationPolicy(
      refundPercent
    );

  /*
   * =====================================================
   * SINCRONIZZAZIONE REFUND -> APPOINTMENT
   * =====================================================
   */

  const {
    data:
      updatedAppointment,

    error:
      updateError,
  } = await supabase
    .from(
      "appointments"
    )
    .update({
      status:
        "CANCELLED",

      payment_status:
        paymentStatus,

      stripe_charge_id:
        chargeId ??
        currentAppointment
          .stripe_charge_id,

      stripe_refund_id:
        refund.id,

      refund_amount:
        refund.amount,

      refund_percent:
        refundPercent,

      cancellation_policy:
        cancellationPolicy,

      refunded_at:
        refundedAt,

      cancelled_at:
        cancelledAt,

      payment_updated_at:
        now,

      updated_at:
        now,
    })
    .eq(
      "id",
      currentAppointment.id
    )
    .eq(
      "stripe_payment_intent_id",
      paymentIntentId
    )
    .select(
      `
        id,
        patient_id,
        professional_id,

        status,
        payment_status,

        appointment_date,
        appointment_time,

        subtotal_amount,

        stripe_payment_intent_id,
        stripe_charge_id,
        stripe_refund_id,

        refund_amount,
        refund_percent,
        cancellation_policy,

        paid_at,
        refunded_at,
        cancelled_at,

        payment_updated_at,
        updated_at
      `
    )
    .maybeSingle();

  if (
    updateError
  ) {
    console.error(
      "Errore sincronizzazione Stripe Refund -> appointment:",
      {
        appointmentId:
          currentAppointment.id,

        refundId:
          refund.id,

        paymentIntentId,

        message:
          updateError.message,

        code:
          updateError.code,

        details:
          updateError.details,

        hint:
          updateError.hint,
      }
    );

    throw updateError;
  }

  if (
    !updatedAppointment
  ) {
    throw new Error(
      `Appointment ${currentAppointment.id} non trovato dopo la sincronizzazione del Refund ${refund.id}.`
    );
  }

  /*
   * =====================================================
   * NOTIFICHE REFUND
   * =====================================================
   *
   * Sono operazioni secondarie.
   *
   * Un errore di notifica NON deve rendere fallito
   * un rimborso Stripe gia riuscito.
   * =====================================================
   */

  let patientNotificationId:
    string | null =
    null;

  let patientNotificationCreated =
    false;

  let professionalNotificationId:
    string | null =
    null;

  let professionalNotificationCreated =
    false;

  const refundAmountFormatted =
    formatRefundAmount(
      refund.amount
    );

  const refundLabel =
    fullRefund
      ? "rimborso completo"
      : `rimborso del ${refundPercent}%`;

  try {
    const patientNotification =
      await ensureRefundNotification({
        supabase,

        userId:
          updatedAppointment
            .patient_id,

        appointmentId:
          updatedAppointment.id,

        type:
          "APPOINTMENT_REFUND_CONFIRMED",

        title:
          "Rimborso confermato",

        message:
          `Il ${refundLabel} di ${refundAmountFormatted} e stato confermato.`,

        link:
          `/dashboard/patient/appointments?appointmentId=${encodeURIComponent(
            updatedAppointment.id
          )}`,
      });

    patientNotificationId =
      patientNotification.id;

    patientNotificationCreated =
      patientNotification.created;
  } catch (
    notificationError
  ) {
    console.error(
      "Refund sincronizzato ma errore notifica paziente:",
      {
        appointmentId:
          updatedAppointment.id,

        patientId:
          updatedAppointment
            .patient_id,

        refundId:
          refund.id,

        error:
          notificationError instanceof
          Error
            ? notificationError.message
            : notificationError,
      }
    );
  }

  try {
    const professionalNotification =
      await ensureRefundNotification({
        supabase,

        userId:
          updatedAppointment
            .professional_id,

        appointmentId:
          updatedAppointment.id,

        type:
          "APPOINTMENT_REFUND_RECEIVED",

        title:
          "Prenotazione rimborsata",

        message:
          `La prenotazione e stata cancellata con ${refundLabel}. Importo rimborsato al paziente: ${refundAmountFormatted}.`,

        link:
          `/dashboard/professional/appointments?appointmentId=${encodeURIComponent(
            updatedAppointment.id
          )}`,
      });

    professionalNotificationId =
      professionalNotification.id;

    professionalNotificationCreated =
      professionalNotification.created;
  } catch (
    notificationError
  ) {
    console.error(
      "Refund sincronizzato ma errore notifica professionista:",
      {
        appointmentId:
          updatedAppointment.id,

        professionalId:
          updatedAppointment
            .professional_id,

        refundId:
          refund.id,

        error:
          notificationError instanceof
          Error
            ? notificationError.message
            : notificationError,
      }
    );
  }

  /*
   * =====================================================
   * EMAIL RIMBORSO AL PAZIENTE
   * =====================================================
   *
   * Anche l'email e una side effect non bloccante.
   * L'idempotenza e gestita da
   * transactional_email_events.
   * =====================================================
   */

  let emailEventId:
    string | null =
    null;

  let emailMessageId:
    string | null =
    null;

  let emailSent =
    false;

  let emailSkipped =
    false;

  try {
    const {
      data:
        emailProfiles,

      error:
        emailProfilesError,
    } = await supabase
      .from(
        "profiles"
      )
      .select(
        `
          id,
          first_name,
          last_name,
          email
        `
      )
      .in(
        "id",
        [
          updatedAppointment
            .patient_id,

          updatedAppointment
            .professional_id,
        ]
      );

    if (
      emailProfilesError
    ) {
      throw emailProfilesError;
    }

    const patientProfile =
      emailProfiles?.find(
        (profile) =>
          profile.id ===
          updatedAppointment
            .patient_id
      );

    const professionalProfile =
      emailProfiles?.find(
        (profile) =>
          profile.id ===
          updatedAppointment
            .professional_id
      );

    const patientEmail =
      patientProfile?.email
        ?.trim()
        .toLowerCase();

    if (
      !patientEmail
    ) {
      throw new Error(
        `Email paziente mancante per appointment ${updatedAppointment.id}.`
      );
    }

    const patientName =
      buildDisplayName(
        patientProfile
          ?.first_name,

        patientProfile
          ?.last_name,

        "Paziente"
      );

    const professionalName =
      buildDisplayName(
        professionalProfile
          ?.first_name,

        professionalProfile
          ?.last_name,

        "Professionista"
      );

    const siteUrl =
      process.env
        .NEXT_PUBLIC_SITE_URL
        ?.trim()
        .replace(
          /\/+$/,
          ""
        );

    if (
      !siteUrl
    ) {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL non configurata per email rimborso."
      );
    }

    const formattedAppointmentDate =
      new Intl.DateTimeFormat(
        "it-IT",
        {
          day:
            "2-digit",

          month:
            "2-digit",

          year:
            "numeric",
        }
      ).format(
        new Date(
          `${updatedAppointment.appointment_date}T12:00:00`
        )
      );

    const formattedAppointmentTime =
      updatedAppointment
        .appointment_time
        .slice(
          0,
          5
        );

    const appointmentsUrl =
      `${siteUrl}/dashboard/patient/appointments`;

    const emailTemplate =
      refundConfirmedTemplate({
        patientName,

        professionalName,

        appointmentDate:
          formattedAppointmentDate,

        appointmentTime:
          formattedAppointmentTime,

        refundAmount:
          refundAmountFormatted,

        refundPercent,

        fullRefund,

        appointmentsUrl,
      });

    /*
     * Lo Stripe Refund ID identifica in modo
     * univoco l'operazione finanziaria.
     */
    const eventKey =
      `REFUND_CONFIRMED:${refund.id}:${patientEmail}`;

    const emailResult =
      await sendIdempotentTransactionalEmail({
        eventKey,

        eventType:
          "REFUND_CONFIRMED",

        to: [
          {
            email:
              patientEmail,

            name:
              patientName,
          },
        ],

        subject:
          emailTemplate.subject,

        htmlContent:
          emailTemplate.htmlContent,

        textContent:
          emailTemplate.textContent,

        recipientUserId:
          updatedAppointment
            .patient_id,

        appointmentId:
          updatedAppointment.id,
      });

    emailEventId =
      emailResult.eventId;

    emailMessageId =
      emailResult.messageId;

    emailSent =
      emailResult.sent;

    emailSkipped =
      emailResult.skipped;

    if (
      !emailResult.success
    ) {
      console.error(
        "Refund confermato ma email paziente non completata:",
        {
          appointmentId:
            updatedAppointment.id,

          patientId:
            updatedAppointment
              .patient_id,

          refundId:
            refund.id,

          eventId:
            emailResult.eventId,

          sent:
            emailResult.sent,

          skipped:
            emailResult.skipped,

          error:
            emailResult.error,
        }
      );
    }
  } catch (
    emailError
  ) {
    console.error(
      "Refund confermato ma errore pipeline email paziente:",
      {
        appointmentId:
          updatedAppointment.id,

        patientId:
          updatedAppointment
            .patient_id,

        refundId:
          refund.id,

        paymentIntentId,

        error:
          emailError instanceof
          Error
            ? emailError.message
            : emailError,
      }
    );
  }

  /*
   * =====================================================
   * RISULTATO
   * =====================================================
   */

  console.log(
    "Refund FG Home Care sincronizzato:",
    {
      appointmentId:
        updatedAppointment.id,

      refundId:
        refund.id,

      paymentIntentId,

      chargeId:
        updatedAppointment
          .stripe_charge_id,

      refundAmount:
        updatedAppointment
          .refund_amount,

      refundPercent:
        updatedAppointment
          .refund_percent,

      paymentStatus:
        updatedAppointment
          .payment_status,

      refundedAt:
        updatedAppointment
          .refunded_at,

      patientNotificationId,

      patientNotificationCreated,

      professionalNotificationId,

      professionalNotificationCreated,

      emailEventId,

      emailMessageId,

      emailSent,

      emailSkipped,
    }
  );

  return {
    appointment:
      updatedAppointment as
        SyncedRefundAppointment,

    refundId:
      refund.id,

    refundAmount:
      refund.amount,

    refundPercent,

    fullRefund,

    paymentStatus,

    patientNotificationId,

    patientNotificationCreated,

    professionalNotificationId,

    professionalNotificationCreated,

    emailEventId,

    emailMessageId,

    emailSent,

    emailSkipped,
  };
}
