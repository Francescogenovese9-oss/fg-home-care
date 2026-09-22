import {
  NextRequest,
  NextResponse,
} from "next/server";

import { calculatePaymentBreakdown } from "@/lib/payments/calculate-payment";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

type RequestBody = {
  appointmentId?: string;
};

export async function POST(
  request: NextRequest
) {
  try {
    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        {
          message:
            "Richiesta non valida.",
        },
        { status: 400 }
      );
    }

    if (!body.appointmentId) {
      return NextResponse.json(
        {
          message:
            "Identificativo prenotazione mancante.",
        },
        { status: 400 }
      );
    }

    /*
     * Client Supabase dell'utente.
     * Mantiene attive le policy RLS.
     */
    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Errore autenticazione pagamento:",
        userError
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          message:
            "Devi effettuare l'accesso.",
        },
        { status: 401 }
      );
    }

    /*
     * Verifica ruolo.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Errore lettura ruolo pagamento:",
        profileError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare il tuo account.",
        },
        { status: 500 }
      );
    }

    if (
      !profile ||
      profile.role !== "PATIENT"
    ) {
      return NextResponse.json(
        {
          message:
            "Solo il paziente può effettuare il pagamento.",
        },
        { status: 403 }
      );
    }

    /*
     * Recupero prenotazione con client normale.
     */
    const {
      data: appointment,
      error: appointmentError,
    } = await supabase
      .from("appointments")
      .select(
        `
          id,
          patient_id,
          professional_id,
          status,
          payment_status,
          hourly_rate,
          duration_minutes,
          currency,
          subtotal_amount,
          platform_fee_amount,
          professional_amount,
          stripe_payment_intent_id
        `
      )
      .eq(
        "id",
        body.appointmentId
      )
      .maybeSingle();

    if (appointmentError) {
      console.error(
        "Errore lettura prenotazione pagamento:",
        {
          message:
            appointmentError.message,
          code:
            appointmentError.code,
          details:
            appointmentError.details,
          hint:
            appointmentError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            "Impossibile leggere la prenotazione.",
        },
        { status: 500 }
      );
    }

    if (!appointment) {
      return NextResponse.json(
        {
          message:
            "Prenotazione non trovata.",
        },
        { status: 404 }
      );
    }

    /*
     * Solo il paziente proprietario
     * può pagare.
     */
    if (
      appointment.patient_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          message:
            "Non sei autorizzato a pagare questa prenotazione.",
        },
        { status: 403 }
      );
    }

    /*
     * La prenotazione deve essere accettata.
     */
    if (
      appointment.status !==
      "ACCEPTED"
    ) {
      return NextResponse.json(
        {
          message:
            "Puoi pagare soltanto una prenotazione accettata.",
        },
        { status: 400 }
      );
    }

    /*
     * Se è già pagata fermiamo il flusso.
     */
    if (
      appointment.payment_status ===
      "PAID"
    ) {
      return NextResponse.json(
        {
          success: true,
          alreadyPaid: true,
          message:
            "Questa prenotazione risulta già pagata.",
        },
        { status: 200 }
      );
    }

    /*
     * Stati non pagabili.
     */
    if (
      appointment.payment_status ===
        "CANCELLED" ||
      appointment.payment_status ===
        "REFUNDED"
    ) {
      return NextResponse.json(
        {
          message:
            "Questa prenotazione non può essere pagata.",
        },
        { status: 409 }
      );
    }

    /*
     * Stati validi per iniziare/riprendere
     * il pagamento.
     */
    if (
      appointment.payment_status !==
        "REQUIRES_PAYMENT" &&
      appointment.payment_status !==
        "PROCESSING" &&
      appointment.payment_status !==
        "PAYMENT_FAILED"
    ) {
      return NextResponse.json(
        {
          message:
            "Il pagamento non è richiesto per questa prenotazione.",
        },
        { status: 409 }
      );
    }

    if (
      appointment.hourly_rate ===
      null
    ) {
      return NextResponse.json(
        {
          message:
            "La tariffa della prenotazione non è disponibile.",
        },
        { status: 400 }
      );
    }

    /*
     * Client amministrativo.
     *
     * Lo usiamo solo dopo aver verificato:
     * - utente autenticato
     * - ruolo PATIENT
     * - proprietà della prenotazione
     */
    const admin =
      getSupabaseAdmin();

    /*
     * Recupero dati Stripe privati
     * del professionista.
     */
    const {
      data: professional,
      error: professionalError,
    } = await admin
      .from("professional_profiles")
      .select(
        `
          user_id,
          subscription_plan,
          stripe_account_id,
          stripe_account_created,
          stripe_onboarding_completed,
          stripe_details_submitted,
          stripe_transfers_enabled,
          stripe_payouts_enabled
        `
      )
      .eq(
        "user_id",
        appointment.professional_id
      )
      .maybeSingle();

    if (professionalError) {
      console.error(
        "Errore lettura Stripe professionista:",
        {
          message:
            professionalError.message,
          code:
            professionalError.code,
          details:
            professionalError.details,
          hint:
            professionalError.hint,
        }
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare il conto Stripe del professionista.",
        },
        { status: 500 }
      );
    }

    if (!professional) {
      return NextResponse.json(
        {
          message:
            "Profilo professionista non trovato.",
        },
        { status: 404 }
      );
    }

    if (
      !professional.stripe_account_id
    ) {
      return NextResponse.json(
        {
          message:
            "Il professionista non ha ancora configurato i pagamenti.",
        },
        { status: 409 }
      );
    }

    /*
     * Verifica account Stripe Connect.
     */
    if (
      professional
        .stripe_account_created !==
        true ||
      professional
        .stripe_onboarding_completed !==
        true ||
      professional
        .stripe_transfers_enabled !==
        true
    ) {
      console.log(
        "Account Stripe professionista non pronto:",
        {
          accountCreated:
            professional
              .stripe_account_created,

          onboardingCompleted:
            professional
              .stripe_onboarding_completed,

          detailsSubmitted:
            professional
              .stripe_details_submitted,

          transfersEnabled:
            professional
              .stripe_transfers_enabled,

          payoutsEnabled:
            professional
              .stripe_payouts_enabled,
        }
      );

      return NextResponse.json(
        {
          message:
            "Il professionista non è ancora abilitato a ricevere pagamenti.",
        },
        { status: 409 }
      );
    }

    /*
     * Calcolo economico lato server.
     */
    const payment =
      calculatePaymentBreakdown({
        hourlyRate: Number(
          appointment.hourly_rate
        ),

        durationMinutes:
          appointment.duration_minutes,

        plan:
          professional.subscription_plan === "PREMIUM"
            ? "PREMIUM"
            : "BASIC",
      });

    if (
      payment.subtotalAmount <= 0
    ) {
      return NextResponse.json(
        {
          message:
            "L'importo della prestazione non è valido.",
        },
        { status: 400 }
      );
    }

    if (
      payment.platformFeeAmount <
        0 ||
      payment.professionalAmount <
        0
    ) {
      return NextResponse.json(
        {
          message:
            "La ripartizione del pagamento non è valida.",
        },
        { status: 500 }
      );
    }

    if (
      payment.platformFeeAmount +
        payment.professionalAmount !==
      payment.subtotalAmount
    ) {
      return NextResponse.json(
        {
          message:
            "Il calcolo economico della prenotazione non è coerente.",
        },
        { status: 500 }
      );
    }

    const stripe =
      getStripe();

    /*
     * Se esiste già un PaymentIntent,
     * proviamo a riutilizzarlo.
     */
    if (
      appointment
        .stripe_payment_intent_id
    ) {
      try {
        const existingIntent =
          await stripe.paymentIntents.retrieve(
            appointment
              .stripe_payment_intent_id
          );

        /*
         * Stripe lo considera già pagato.
         */
        if (
          existingIntent.status ===
          "succeeded"
        ) {
          return NextResponse.json(
            {
              success: true,

              alreadyPaid: true,

              paymentIntentId:
                existingIntent.id,

              message:
                "Il pagamento risulta già completato su Stripe.",
            },
            { status: 200 }
          );
        }

        /*
         * Finché non è cancellato,
         * aggiorniamo e riutilizziamo il PaymentIntent.
         */
        if (
          existingIntent.status !==
          "canceled"
        ) {
          const updatedIntent =
            await stripe.paymentIntents.update(
              existingIntent.id,
              {
                amount:
                  payment.subtotalAmount,

                application_fee_amount:
                  payment.platformFeeAmount,


                metadata: {
                  fg_home_care_appointment_id:
                    appointment.id,

                  fg_home_care_patient_id:
                    user.id,

                  fg_home_care_professional_id:
                    appointment.professional_id,

                  fg_home_care_platform_fee_amount:
                    String(
                      payment.platformFeeAmount
                    ),

                  fg_home_care_professional_amount:
                    String(
                      payment.professionalAmount
                    ),

                  fg_home_care_commission_percent:
                    String(
                      payment.commissionPercent
                    ),

                  fg_home_care_subscription_plan:
                    professional.subscription_plan === "PREMIUM"
                      ? "PREMIUM"
                      : "BASIC",
                },
              }
            );

          if (
            !updatedIntent.client_secret
          ) {
            return NextResponse.json(
              {
                message:
                  "Il PaymentIntent esistente non dispone del client secret.",
              },
              { status: 500 }
            );
          }

          return NextResponse.json({
            success: true,

            clientSecret:
              updatedIntent.client_secret,

            paymentIntentId:
              updatedIntent.id,

            payment: {
              currency:
                payment.currency,

              subtotalAmount:
                payment.subtotalAmount,

              platformFeeAmount:
                payment.platformFeeAmount,

              professionalAmount:
                payment.professionalAmount,

              commissionPercent:
                payment.commissionPercent,
            },
          });
        }
      } catch (retrieveError) {
        console.error(
          "PaymentIntent precedente non recuperabile:",
          retrieveError
        );
      }
    }

    /*
     * Creazione destination charge.
     */
    const paymentIntent =
      await stripe.paymentIntents.create(
        {
          amount:
            payment.subtotalAmount,

          currency:
            payment.currency,

          automatic_payment_methods: {
            enabled: true,
          },

          application_fee_amount:
            payment.platformFeeAmount,

          transfer_data: {
            destination:
              professional
                .stripe_account_id,
          },

          metadata: {
            fg_home_care_appointment_id:
              appointment.id,

            fg_home_care_patient_id:
              user.id,

            fg_home_care_professional_id:
              appointment.professional_id,

            fg_home_care_platform_fee_amount:
              String(
                payment.platformFeeAmount
              ),

            fg_home_care_professional_amount:
              String(
                payment.professionalAmount
              ),
          },

          description:
            `FG Home Care - Prenotazione ${appointment.id}`,
        },
        {
          /*
           * Impedisce duplicazioni dovute
           * a retry o doppio click.
           */
          idempotencyKey:
            `fg-home-care-appointment-${appointment.id}`,
        }
      );

    if (
      !paymentIntent.client_secret
    ) {
      console.error(
        "PaymentIntent senza client_secret:",
        paymentIntent.id
      );

      return NextResponse.json(
        {
          message:
            "Stripe non ha restituito i dati necessari al pagamento.",
        },
        { status: 500 }
      );
    }

    /*
     * Aggiornamento database con client admin.
     */
    const {
      data: updatedAppointment,
      error: updateError,
    } = await admin
      .from("appointments")
      .update({
        currency:
          payment.currency,

        subtotal_amount:
          payment.subtotalAmount,

        platform_fee_amount:
          payment.platformFeeAmount,

        professional_amount:
          payment.professionalAmount,

        payment_status:
          "PROCESSING",

        stripe_payment_intent_id:
          paymentIntent.id,

        payment_updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        appointment.id
      )
      .eq(
        "patient_id",
        user.id
      )
      .eq(
        "status",
        "ACCEPTED"
      )
      .in(
        "payment_status",
        [
          "REQUIRES_PAYMENT",
          "PROCESSING",
          "PAYMENT_FAILED",
        ]
      )
      .select(
        `
          id,
          status,
          payment_status,
          currency,
          subtotal_amount,
          platform_fee_amount,
          professional_amount,
          stripe_payment_intent_id,
          payment_updated_at
        `
      )
      .maybeSingle();

    if (updateError) {
      console.error(
        "Errore salvataggio PaymentIntent:",
        {
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

      return NextResponse.json(
        {
          message:
            "Il pagamento è stato creato su Stripe ma non sincronizzato correttamente con FG Home Care.",
        },
        { status: 500 }
      );
    }

    if (!updatedAppointment) {
      return NextResponse.json(
        {
          message:
            "Il pagamento è stato creato ma la prenotazione non è stata aggiornata.",
        },
        { status: 500 }
      );
    }

    console.log(
      "PaymentIntent FG Home Care creato:",
      {
        appointmentId:
          appointment.id,

        paymentIntentId:
          paymentIntent.id,

        subtotalAmount:
          payment.subtotalAmount,

        platformFeeAmount:
          payment.platformFeeAmount,

        professionalAmount:
          payment.professionalAmount,

        destination:
          professional
            .stripe_account_id,
      }
    );

    return NextResponse.json({
      success: true,

      clientSecret:
        paymentIntent.client_secret,

      paymentIntentId:
        paymentIntent.id,

      payment: {
        currency:
          payment.currency,

        subtotalAmount:
          payment.subtotalAmount,

        platformFeeAmount:
          payment.platformFeeAmount,

        professionalAmount:
          payment.professionalAmount,

        commissionPercent:
          payment.commissionPercent,
      },
    });
  } catch (error) {
    console.error(
      "Errore creazione PaymentIntent:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Non è stato possibile preparare il pagamento.",
      },
      { status: 500 }
    );
  }
}