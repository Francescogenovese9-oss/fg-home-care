import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { createClient } from "@/lib/supabase/server";
  import { calculatePaymentBreakdown } from "@/lib/payments/calculate-payment";
  
  type PreviewRequestBody = {
    appointmentId?: string;
  };
  
  export async function POST(
    request: NextRequest
  ) {
    try {
      const body =
        (await request.json()) as PreviewRequestBody;
  
      if (!body.appointmentId) {
        return NextResponse.json(
          {
            message:
              "Identificativo prenotazione mancante.",
          },
          { status: 400 }
        );
      }
  
      const supabase = await createClient();
  
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
        error: appointmentError,
      } = await supabase
        .from("appointments")
        .select(
          `
            id,
            patient_id,
            professional_id,
            hourly_rate,
            duration_minutes,
            status
          `
        )
        .eq("id", body.appointmentId)
        .maybeSingle();
  
      if (appointmentError) {
        console.error(
          "Errore lettura prenotazione:",
          appointmentError
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
  
      const isParticipant =
        appointment.patient_id === user.id ||
        appointment.professional_id === user.id;
  
      if (!isParticipant) {
        return NextResponse.json(
          {
            message:
              "Non sei autorizzato a visualizzare questo importo.",
          },
          { status: 403 }
        );
      }
  
      if (
        appointment.hourly_rate === null
      ) {
        return NextResponse.json(
          {
            message:
              "La tariffa della prenotazione non è disponibile.",
          },
          { status: 400 }
        );
      }
  
      const breakdown =
        calculatePaymentBreakdown({
          hourlyRate: Number(
            appointment.hourly_rate
          ),
          durationMinutes:
            appointment.duration_minutes,
        });
  
      return NextResponse.json({
        success: true,
        appointmentId:
          appointment.id,
        appointmentStatus:
          appointment.status,
        payment: breakdown,
      });
    } catch (error) {
      console.error(
        "Errore anteprima pagamento:",
        error
      );
  
      return NextResponse.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "Errore interno del server.",
        },
        { status: 500 }
      );
    }
  }