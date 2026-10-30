import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { syncRefund } from "@/lib/payments/sync-refund";
import { parseRomeDateTime } from "@/lib/payments/cancellation-policy";
import { sendIdempotentTransactionalEmail } from "@/lib/email/send-idempotent-transactional-email";

type Context = { params: Promise<{ appointmentId: string }> };
type ClaimRow = { claimed: boolean; payment_status: string | null };

async function emailPatient(appointmentId: string, patientId: string, reason: string, directPayment = false) {
  try {
    const admin = getSupabaseAdmin();
    const { data: patient, error } = await admin.from("profiles")
      .select("email,first_name,last_name").eq("id", patientId).maybeSingle();
    if (error) throw error;
    if (!patient?.email) {
      console.error("Email annullamento non inviata: indirizzo paziente mancante", appointmentId);
      return;
    }
    const patientName = [patient.first_name, patient.last_name].filter(Boolean).join(" ") || "paziente";
    const { data: appointment } = await admin.from("appointments")
      .select("appointment_date,appointment_time").eq("id", appointmentId).maybeSingle();
    const date = appointment?.appointment_date || "da verificare";
    const time = appointment?.appointment_time || "da verificare";
    const textContent = "Ciao " + patientName + ",\\n\\nIl professionista ha annullato la tua prenotazione del " + date + " alle " + time + ".\\nMotivazione: " + reason + "\\n\\n" + (directPayment ? "Per eventuali importi pagati direttamente, contatta il professionista per concordare il rimborso." : "Se hai gia pagato sulla piattaforma, e previsto il rimborso integrale. Riceverai una comunicazione separata alla conferma del rimborso.") + "\\n\\nFG Home Care";
    const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    const htmlContent = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px'><h2>Prestazione annullata</h2><p>Ciao " + escapeHtml(patientName) + ",</p><p>Il professionista ha annullato la prenotazione del " + escapeHtml(date) + " alle " + escapeHtml(time) + ".</p><p><strong>Motivazione:</strong> " + escapeHtml(reason) + "</p><p>" + (directPayment ? "Per eventuali importi pagati direttamente, contatta il professionista per concordare il rimborso." : "Se hai già pagato sulla piattaforma, è previsto il rimborso integrale. Riceverai una comunicazione separata alla conferma del rimborso.") + "</p><p>FG Home Care</p></div>";
    const result = await sendIdempotentTransactionalEmail({
      eventKey: "appointment:" + appointmentId + ":cancelled-by-professional:patient",
      eventType: "APPOINTMENT_CANCELLED",
      to: [{ email: patient.email, name: patientName }],
      subject: "Prestazione annullata dal professionista - FG Home Care",
      htmlContent,
      textContent,
      recipientUserId: patientId,
      appointmentId,
    });
    if (!result.success) console.error("Email annullamento professionista non inviata:", result.error);
  } catch (error) {
    console.error("Errore email annullamento professionista:", error);
  }
}

async function notifyPatient(appointmentId: string, patientId: string, reason: string, directPayment = false) {
  try {
    const admin = getSupabaseAdmin();
    const { data: existing, error: lookupError } = await admin.from("notifications")
      .select("id").eq("user_id", patientId).eq("appointment_id", appointmentId)
      .eq("type", "APPOINTMENT_CANCELLED").maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return;
    const { error } = await admin.from("notifications").insert({
      user_id: patientId,
      appointment_id: appointmentId,
      review_report_id: null,
      type: "APPOINTMENT_CANCELLED",
      title: "Prestazione annullata dal professionista",
      message: "Il professionista ha annullato la prenotazione. Motivazione: " + reason + (directPayment ? ". Per eventuali somme pagate direttamente, contatta il professionista." : ". Se hai pagato sulla piattaforma, riceverai il rimborso integrale."),
      link: "/dashboard/patient/appointments?appointmentId=" + encodeURIComponent(appointmentId),
      read: false,
    });
    if (error && error.code !== "23505") throw error;
  } catch (error) {
    console.error("Errore notifica annullamento professionista:", error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { appointmentId } = await context.params;
    const body = (await request.json()) as { reason?: string };
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 5 || reason.length > 1000) {
      return NextResponse.json({ message: "Inserisci una motivazione da 5 a 1000 caratteri." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Utente non autenticato." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "PROFESSIONAL") {
      return NextResponse.json({ message: "Operazione riservata ai professionisti." }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { data: appointment, error } = await supabase.from("appointments")
      .select("id,patient_id,professional_id,status,payment_status,service_payment_route,appointment_date,appointment_time,subtotal_amount,stripe_payment_intent_id")
      .eq("id", appointmentId).eq("professional_id", user.id).maybeSingle();
    if (error) throw error;
    if (!appointment) return NextResponse.json({ message: "Prenotazione non trovata." }, { status: 404 });
    if (appointment.status !== "ACCEPTED") {
      return NextResponse.json({ message: "Puoi annullare solo una prenotazione accettata." }, { status: 409 });
    }
    const start = parseRomeDateTime(appointment.appointment_date, appointment.appointment_time);
    if (start.getTime() <= Date.now()) {
      return NextResponse.json({ message: "Per prestazioni già iniziate, contatta l'assistenza." }, { status: 409 });
    }
    const now = new Date().toISOString();
    const policyLabel = "Annullamento del professionista: rimborso integrale. Motivazione: " + reason;

    if (appointment.service_payment_route === "PAY_PROFESSIONAL_DIRECTLY") {
      if (appointment.payment_status !== "NOT_REQUIRED") {
        return NextResponse.json({ message: "Stato pagamento DIRECT incoerente: contatta l'assistenza." }, { status: 409 });
      }
      const { data: cancelled, error: cancelError } = await admin.from("appointments")
        .update({ status: "CANCELLED", professional_notes: reason,
          cancellation_policy: "Annullamento DIRECT: eventuali rimborsi sono gestiti dal professionista. " + reason,
          cancelled_at: now, updated_at: now })
        .eq("id", appointment.id).eq("professional_id", user.id)
        .eq("status", "ACCEPTED").eq("payment_status", "NOT_REQUIRED")
        .eq("service_payment_route", "PAY_PROFESSIONAL_DIRECTLY")
        .select("id").maybeSingle();
      if (cancelError) throw cancelError;
      if (!cancelled) return NextResponse.json({ message: "La prenotazione è già stata modificata." }, { status: 409 });
      await notifyPatient(appointment.id, appointment.patient_id, reason, true);
      await emailPatient(appointment.id, appointment.patient_id, reason, true);
      return NextResponse.json({ success: true, message: "Prenotazione DIRECT annullata. Nessun rimborso Stripe previsto." });
    }

    if (appointment.payment_status === "REQUIRES_PAYMENT" || appointment.payment_status === "PAYMENT_FAILED") {
      const { data: cancelled, error: cancelError } = await admin.from("appointments")
        .update({ status: "CANCELLED", payment_status: "CANCELLED", professional_notes: reason,
          cancellation_policy: policyLabel, cancelled_at: now, updated_at: now, payment_updated_at: now })
        .eq("id", appointment.id).eq("professional_id", user.id).eq("status", "ACCEPTED")
        .in("payment_status", ["REQUIRES_PAYMENT", "PAYMENT_FAILED"]).select("id").maybeSingle();
      if (cancelError) throw cancelError;
      if (!cancelled) return NextResponse.json({ message: "La prenotazione è già stata modificata." }, { status: 409 });
      await notifyPatient(appointment.id, appointment.patient_id, reason);
      await emailPatient(appointment.id, appointment.patient_id, reason);
      return NextResponse.json({ success: true, message: "Prenotazione annullata. Nessun pagamento da rimborsare." });
    }

    if (appointment.payment_status !== "PAID") {
      return NextResponse.json({ message: "Pagamento in elaborazione o rimborso già avviato. Riprova dopo la sincronizzazione." }, { status: 409 });
    }
    if (!Number.isInteger(appointment.subtotal_amount) || appointment.subtotal_amount <= 0 || !appointment.stripe_payment_intent_id) {
      return NextResponse.json({ message: "Dati di pagamento incompleti. Contatta l'assistenza." }, { status: 409 });
    }

    // Riutilizza il claim atomico impiegato nei rimborsi del paziente: impedisce doppi rimborsi concorrenti.
    const { data: claimData, error: claimError } = await admin.rpc("claim_appointment_refund", {
      p_appointment_id: appointment.id, p_patient_id: appointment.patient_id,
    });
    if (claimError) throw claimError;
    const claim = ((claimData as ClaimRow[] | null) ?? [])[0];
    if (!claim?.claimed) {
      return NextResponse.json({ message: "Il rimborso è già in corso oppure la prenotazione è stata modificata." }, { status: 409 });
    }

    // Stato REFUND_PENDING finché Stripe/webhook non confermano il rimborso.
    const { error: noteError } = await admin.from("appointments")
      .update({ professional_notes: reason, cancellation_policy: policyLabel, updated_at: now })
      .eq("id", appointment.id).eq("payment_status", "REFUND_PENDING");
    if (noteError) console.error("Impossibile salvare la motivazione di cancellazione:", noteError);

    let refund;
    try {
      refund = await getStripe().refunds.create({
        payment_intent: appointment.stripe_payment_intent_id,
        amount: appointment.subtotal_amount,
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: {
          fg_home_care_appointment_id: appointment.id,
          fg_home_care_patient_id: appointment.patient_id,
          fg_home_care_professional_id: user.id,
          fg_home_care_refund_percent: "100",
          fg_home_care_cancellation_actor: "PROFESSIONAL",
        },
      }, { idempotencyKey: `fg-home-care-professional-cancellation-${appointment.id}-100` });
    } catch (stripeError) {
      console.error("Rimborso professionista Stripe in attesa di verifica:", stripeError);
      await notifyPatient(appointment.id, appointment.patient_id, reason);
      await emailPatient(appointment.id, appointment.patient_id, reason);
      return NextResponse.json({ success: true, message: "Annullamento acquisito. Rimborso in verifica; riceverai aggiornamenti dopo la sincronizzazione." }, { status: 202 });
    }
    await notifyPatient(appointment.id, appointment.patient_id, reason);
      await emailPatient(appointment.id, appointment.patient_id, reason);
    if (refund.status !== "succeeded") {
      return NextResponse.json({ success: true, message: "Annullamento acquisito. Rimborso integrale in elaborazione." }, { status: 202 });
    }
    try {
      await syncRefund(refund);
    } catch (syncError) {
      console.error("Rimborso riuscito su Stripe, sincronizzazione in attesa:", syncError);
      return NextResponse.json({ success: true, message: "Rimborso eseguito su Stripe. Aggiornamento della prenotazione in corso." }, { status: 202 });
    }
    return NextResponse.json({ success: true, message: "Prenotazione annullata e rimborso integrale elaborato." });
  } catch (error) {
    console.error("Errore annullamento professionista:", error);
    return NextResponse.json({ message: "Impossibile completare l'annullamento. Contatta l'assistenza se il pagamento è in corso." }, { status: 500 });
  }
}
