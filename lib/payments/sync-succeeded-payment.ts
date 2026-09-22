import "server-only";

import Stripe from "stripe";

import {
  sendIdempotentTransactionalEmail,
} from "@/lib/email/send-idempotent-transactional-email";

import {
  paymentConfirmedTemplate,
} from "@/lib/email/templates/payment-confirmed";

import {
  getSupabaseAdmin,
} from "@/lib/supabase/admin";

type SyncedAppointment = {
  id: string;
  patient_id: string;
  professional_id: string;
  status: string;
  payment_status: string;
  appointment_date: string;
  appointment_time: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  paid_at: string | null;
  payment_updated_at: string | null;
  updated_at: string;
};

export type SyncSucceededPaymentResult = {
  appointment: SyncedAppointment;
  notificationId: string | null;
  notificationCreated: boolean;
  emailEventId: string | null;
  emailMessageId: string | null;
  emailSent: boolean;
  emailSkipped: boolean;
};

function getAppointmentId(
  paymentIntent: Stripe.PaymentIntent
) {
  return (
    paymentIntent.metadata
      ?.fg_home_care_appointment_id ??
    null
  );
}

function getLatestChargeId(
  paymentIntent: Stripe.PaymentIntent
) {
  return typeof paymentIntent.latest_charge ===
    "string"
    ? paymentIntent.latest_charge
    : paymentIntent.latest_charge?.id ??
        null;
}

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

export async function syncSucceededPayment(
  paymentIntent: Stripe.PaymentIntent
): Promise<SyncSucceededPaymentResult> {
  /*
   * =====================================================
   * VERIFICA STATO STRIPE
   * =====================================================
   */

  if (
    paymentIntent.status !==
    "succeeded"
  ) {
    throw new Error(
      `Il PaymentIntent ${paymentIntent.id} non risulta succeeded su Stripe.`
    );
  }

  /*
   * =====================================================
   * APPOINTMENT ID DAI METADATA
   * =====================================================
   */

  const appointmentId =
    getAppointmentId(
      paymentIntent
    );

  if (!appointmentId) {
    throw new Error(
      `PaymentIntent ${paymentIntent.id} senza fg_home_care_appointment_id nei metadata.`
    );
  }

  const supabase =
    getSupabaseAdmin();

  /*
   * =====================================================
   * LETTURA APPUNTAMENTO
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
        stripe_payment_intent_id,
        stripe_charge_id,
        paid_at,
        payment_updated_at,
        updated_at
      `
    )
    .eq(
      "id",
      appointmentId
    )
    .maybeSingle();

  if (
    currentAppointmentError
  ) {
    console.error(
      "Errore lettura appuntamento durante sincronizzazione pagamento:",
      {
        appointmentId,

        paymentIntentId:
          paymentIntent.id,

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
      `Nessun appuntamento FG Home Care trovato per ${appointmentId}.`
    );
  }

  /*
   * =====================================================
   * VERIFICA COLLEGAMENTO PAYMENT INTENT
   * =====================================================
   */

  if (
    !currentAppointment
      .stripe_payment_intent_id
  ) {
    throw new Error(
      `La prenotazione ${appointmentId} non contiene uno Stripe PaymentIntent associato.`
    );
  }

  if (
    currentAppointment
      .stripe_payment_intent_id !==
    paymentIntent.id
  ) {
    throw new Error(
      `Il PaymentIntent ${paymentIntent.id} non corrisponde a quello registrato sulla prenotazione ${appointmentId}.`
    );
  }

  /*
   * =====================================================
   * DATI PAGAMENTO
   * =====================================================
   */

  const now =
    new Date().toISOString();

  const latestChargeId =
    getLatestChargeId(
      paymentIntent
    );

  /*
   * Una reconciliation successiva non deve
   * alterare il paid_at originario.
   */

  const paidAt =
    currentAppointment.paid_at ??
    now;

  /*
   * =====================================================
   * SINCRONIZZAZIONE APPUNTAMENTO → PAID
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
      payment_status:
        "PAID",

      stripe_charge_id:
        latestChargeId ??
        currentAppointment
          .stripe_charge_id,

      paid_at:
        paidAt,

      payment_updated_at:
        now,

      updated_at:
        now,
    })
    .eq(
      "id",
      appointmentId
    )
    .eq(
      "stripe_payment_intent_id",
      paymentIntent.id
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
        stripe_payment_intent_id,
        stripe_charge_id,
        paid_at,
        payment_updated_at,
        updated_at
      `
    )
    .maybeSingle();

  if (
    updateError
  ) {
    console.error(
      "Errore sincronizzazione pagamento Stripe → appointment:",
      {
        appointmentId,

        paymentIntentId:
          paymentIntent.id,

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
      `La prenotazione ${appointmentId} non è stata aggiornata durante la sincronizzazione del pagamento.`
    );
  }

  /*
   * =====================================================
   * NOTIFICA PAGAMENTO PROFESSIONISTA
   * =====================================================
   *
   * È idempotente grazie al controllo applicativo
   * e al vincolo UNIQUE parziale PostgreSQL.
   * =====================================================
   */

  const notificationLink =
    `/dashboard/professional/appointments?appointmentId=${encodeURIComponent(
      updatedAppointment.id
    )}`;

  let notificationId:
    string | null =
    null;

  let notificationCreated =
    false;

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
      updatedAppointment
        .professional_id
    )
    .eq(
      "appointment_id",
      updatedAppointment.id
    )
    .eq(
      "type",
      "APPOINTMENT_PAYMENT_RECEIVED"
    )
    .maybeSingle();

  if (
    existingNotificationError
  ) {
    console.error(
      "Errore controllo notifica pagamento professionista:",
      {
        appointmentId:
          updatedAppointment.id,

        professionalId:
          updatedAppointment
            .professional_id,

        paymentIntentId:
          paymentIntent.id,

        message:
          existingNotificationError.message,

        code:
          existingNotificationError.code,

        details:
          existingNotificationError.details,

        hint:
          existingNotificationError.hint,
      }
    );

    throw existingNotificationError;
  }

  if (
    existingNotification
  ) {
    notificationId =
      existingNotification.id;

    console.log(
      "ℹ️ Notifica pagamento già esistente:",
      {
        appointmentId:
          updatedAppointment.id,

        notificationId,
      }
    );
  } else {
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
          updatedAppointment
            .professional_id,

        appointment_id:
          updatedAppointment.id,

        review_report_id:
          null,

        type:
          "APPOINTMENT_PAYMENT_RECEIVED",

        title:
          "Pagamento ricevuto",

        message:
          "Il pagamento della prestazione è stato completato con successo.",

        link:
          notificationLink,

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
       * 23505 = un altro processo ha appena creato
       * la stessa notifica.
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
            updatedAppointment
              .professional_id
          )
          .eq(
            "appointment_id",
            updatedAppointment.id
          )
          .eq(
            "type",
            "APPOINTMENT_PAYMENT_RECEIVED"
          )
          .maybeSingle();

        if (
          concurrentNotificationError
        ) {
          throw concurrentNotificationError;
        }

        notificationId =
          concurrentNotification?.id ??
          null;

        console.log(
          "ℹ️ Notifica pagamento già creata da processo concorrente:",
          {
            appointmentId:
              updatedAppointment.id,

            notificationId,
          }
        );
      } else {
        console.error(
          "Pagamento sincronizzato ma errore creazione notifica professionista:",
          {
            appointmentId:
              updatedAppointment.id,

            professionalId:
              updatedAppointment
                .professional_id,

            paymentIntentId:
              paymentIntent.id,

            message:
              notificationError.message,

            code:
              notificationError.code,

            details:
              notificationError.details,

            hint:
              notificationError.hint,
          }
        );

        throw notificationError;
      }
    } else {
      notificationId =
        createdNotification?.id ??
        null;

      notificationCreated =
        true;
    }
  }

  /*
   * =====================================================
   * EMAIL PAGAMENTO CONFERMATO AL PAZIENTE
   * =====================================================
   *
   * L'email NON deve rendere fallito un pagamento
   * già confermato da Stripe.
   *
   * L'idempotenza è gestita da
   * transactional_email_events + claim atomico SQL.
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
          updatedAppointment.patient_id,
          updatedAppointment.professional_id,
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
          updatedAppointment.patient_id
      );

    const professionalProfile =
      emailProfiles?.find(
        (profile) =>
          profile.id ===
          updatedAppointment.professional_id
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
        patientProfile?.first_name,
        patientProfile?.last_name,
        "Paziente"
      );

    const professionalName =
      buildDisplayName(
        professionalProfile?.first_name,
        professionalProfile?.last_name,
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
        "NEXT_PUBLIC_SITE_URL non configurata per email pagamento."
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
      paymentConfirmedTemplate({
        patientName,

        professionalName,

        appointmentDate:
          formattedAppointmentDate,

        appointmentTime:
          formattedAppointmentTime,

        appointmentsUrl,
      });

    /*
     * eventKey deterministico:
     * lo stesso pagamento + paziente non può
     * produrre due email di conferma.
     */
    const eventKey =
      `PAYMENT_CONFIRMED:${updatedAppointment.id}:${patientEmail}`;

    const emailResult =
      await sendIdempotentTransactionalEmail({
        eventKey,

        eventType:
          "PAYMENT_CONFIRMED",

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
          updatedAppointment.patient_id,

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
        "Pagamento confermato ma email paziente non completata:",
        {
          appointmentId:
            updatedAppointment.id,

          patientId:
            updatedAppointment.patient_id,

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
  } catch (emailError) {
    console.error(
      "Pagamento confermato ma errore pipeline email paziente:",
      {
        appointmentId:
          updatedAppointment.id,

        patientId:
          updatedAppointment.patient_id,

        paymentIntentId:
          paymentIntent.id,

        error:
          emailError instanceof Error
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
    "✅ Pagamento FG Home Care sincronizzato:",
    {
      appointmentId:
        updatedAppointment.id,

      professionalId:
        updatedAppointment
          .professional_id,

      paymentIntentId:
        paymentIntent.id,

      chargeId:
        updatedAppointment
          .stripe_charge_id,

      paymentStatus:
        updatedAppointment
          .payment_status,

      paidAt:
        updatedAppointment.paid_at,

      notificationId,

      notificationCreated,

      emailEventId,

      emailMessageId,

      emailSent,

      emailSkipped,
    }
  );

  return {
    appointment:
      updatedAppointment as SyncedAppointment,

    notificationId,

    notificationCreated,

    emailEventId,

    emailMessageId,

    emailSent,

    emailSkipped,
  };
}