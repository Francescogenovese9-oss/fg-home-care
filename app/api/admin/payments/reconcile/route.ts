import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  reconcileAppointmentPayment,
} from "@/lib/payments/reconcile-payment";

import {
  createClient,
} from "@/lib/supabase/server";

type RequestBody = {
  appointmentId?: string;
};

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * CLIENT UTENTE
     * =====================================================
     */

    const supabase =
      await createClient();

    /*
     * =====================================================
     * AUTENTICAZIONE ADMIN
     * =====================================================
     */

    const {
      data: {
        user:
          adminUser,
      },

      error:
        adminUserError,
    } =
      await supabase.auth.getUser();

    if (
      adminUserError
    ) {
      console.error(
        "Errore autenticazione amministratore reconciliation:",
        adminUserError
      );
    }

    if (
      !adminUser
    ) {
      return NextResponse.json(
        {
          message:
            "Utente non autenticato.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * =====================================================
     * VERIFICA RUOLO ADMIN
     * =====================================================
     */

    const {
      data:
        adminProfile,

      error:
        adminProfileError,
    } = await supabase
      .from(
        "profiles"
      )
      .select(
        "role"
      )
      .eq(
        "id",
        adminUser.id
      )
      .maybeSingle();

    if (
      adminProfileError
    ) {
      console.error(
        "Errore lettura profilo amministratore reconciliation:",
        adminProfileError
      );

      return NextResponse.json(
        {
          message:
            "Impossibile verificare il tuo account.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      adminProfile?.role !==
      "ADMIN"
    ) {
      return NextResponse.json(
        {
          message:
            "Questa operazione è riservata agli amministratori.",
        },
        {
         status: 403,
        }
      );
    }

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    let body:
      RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        {
          message:
            "Richiesta non valida.",
        },
        {
          status: 400,
        }
      );
    }

    const appointmentId =
      body.appointmentId
        ?.trim();

    if (
      !appointmentId
    ) {
      return NextResponse.json(
        {
          message:
            "Identificativo appuntamento mancante.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * RECONCILIATION
     * =====================================================
     *
     * Tutta la logica finanziaria resta centralizzata
     * nel servizio:
     *
     * lib/payments/reconcile-payment.ts
     *
     * Questa API si limita ad autenticare l'Admin
     * e richiamare il motore di reconciliation.
     * =====================================================
     */

    const result =
      await reconcileAppointmentPayment(
        appointmentId
      );

    /*
     * =====================================================
     * LOG
     * =====================================================
     */

    console.log(
      "Reconciliation pagamento eseguita da Admin:",
      {
        adminUserId:
          adminUser.id,

        appointmentId:
          result.appointmentId,

        paymentIntentId:
          result.paymentIntentId,

        stripeStatus:
          result.stripeStatus,

        previousPaymentStatus:
          result.previousPaymentStatus,

        currentPaymentStatus:
          result.currentPaymentStatus,

        action:
          result.action,

        repaired:
          result.repaired,

        anomaly:
          result.anomaly,

        notificationId:
          result.notificationId ??
          null,

        notificationCreated:
          result.notificationCreated ??
          false,
      }
    );

    /*
     * =====================================================
     * RISPOSTA
     * =====================================================
     */

    return NextResponse.json(
      {
        success:
          true,

        result,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Errore API reconciliation pagamento:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Non è stato possibile riconciliare il pagamento.",
      },
      {
       status: 500,
      }
    );
  }
}
