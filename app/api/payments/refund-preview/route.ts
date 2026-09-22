import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { calculateCancellationPolicy } from "@/lib/payments/cancellation-policy";
  import { calculateRefundAmount } from "@/lib/payments/calculate-refund";
  import { createClient } from "@/lib/supabase/server";
  
  type RequestBody = {
    appointmentId?: string;
  };
  
  export async function POST(
    request: NextRequest
  ) {
    try {
      const body =
        (await request.json()) as RequestBody;
  
      if (!body.appointmentId) {
        return NextResponse.json(
          {
            message:
              "Prenotazione mancante.",
          },
          { status: 400 }
        );
      }
  
      const supabase =
        await createClient();
  
      const {
        data: { user },
      } = await supabase.auth.getUser();
  
      if (!user) {
        return NextResponse.json(
          {
            message:
              "Utente non autenticato.",
          },
          { status: 401 }
        );
      }
  
      const {
        data: appointment,
      } = await supabase
        .from("appointments")
        .select(
          `
            id,
            patient_id,
            appointment_date,
            appointment_time,
            subtotal_amount,
            payment_status
          `
        )
        .eq(
          "id",
          body.appointmentId
        )
        .maybeSingle();
  
      if (
        !appointment ||
        appointment.patient_id !==
          user.id
      ) {
        return NextResponse.json(
          {
            message:
              "Prenotazione non disponibile.",
          },
          { status: 404 }
        );
      }
  
      const policy =
        calculateCancellationPolicy({
          appointmentDate:
            appointment.appointment_date,
  
          appointmentTime:
            appointment.appointment_time,
        });
  
      const refundAmount =
        appointment.payment_status ===
          "PAID" &&
        appointment.subtotal_amount !==
          null
          ? calculateRefundAmount({
              subtotalAmount:
                appointment.subtotal_amount,
  
              refundPercent:
                policy.refundPercent,
            })
          : 0;
  
      return NextResponse.json({
        success: true,
  
        hoursUntilAppointment:
          policy.hoursUntilAppointment,
  
        refundPercent:
          policy.refundPercent,
  
        refundAmount,
  
        refundAllowed:
          policy.refundAllowed,
  
        policyLabel:
          policy.policyLabel,
      });
    } catch (error) {
      console.error(
        "Errore preview cancellazione:",
        error
      );
  
      return NextResponse.json(
        {
          message:
            "Impossibile calcolare la policy di cancellazione.",
        },
        { status: 500 }
      );
    }
  }