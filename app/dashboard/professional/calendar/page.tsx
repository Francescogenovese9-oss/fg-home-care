import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import ProfessionalAvailabilityManager from "@/components/calendar/ProfessionalAvailabilityManager";
import { createClient } from "@/lib/supabase/server";

type AppointmentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

type AppointmentRecord = {
  id: string;
  patient_id: string;
  service_type:
    | "HOME_VISIT"
    | "VIDEO_CONSULTATION";
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  patient_notes: string | null;
};

type PatientProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type UnavailabilityRecord = {
  id: string;
  unavailable_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  reason: string | null;
};

export default async function ProfessionalCalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?redirect=/dashboard/professional/calendar"
    );
  }

  const { data: accountProfile } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  if (
    accountProfile?.role !==
    "PROFESSIONAL"
  ) {
    redirect("/dashboard/patient");
  }

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const {
    data: appointmentsData,
    error: appointmentsError,
  } = await supabase
    .from("appointments")
    .select(
      `
        id,
        patient_id,
        service_type,
        appointment_date,
        appointment_time,
        duration_minutes,
        status,
        patient_notes
      `
    )
    .eq("professional_id", user.id)
    .gte("appointment_date", today)
    .in("status", [
      "PENDING",
      "ACCEPTED",
    ])
    .order("appointment_date", {
      ascending: true,
    })
    .order("appointment_time", {
      ascending: true,
    });

  if (appointmentsError) {
    console.error(
      "Errore lettura agenda:",
      appointmentsError
    );
  }

  const appointments =
    (appointmentsData ??
      []) as AppointmentRecord[];

  const patientIds = Array.from(
    new Set(
      appointments.map(
        (appointment) =>
          appointment.patient_id
      )
    )
  );

  let patients: PatientProfile[] = [];

  if (patientIds.length > 0) {
    const {
      data: patientsData,
      error: patientsError,
    } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name"
      )
      .in("id", patientIds);

    if (patientsError) {
      console.error(
        "Errore lettura pazienti agenda:",
        patientsError
      );
    }

    patients =
      (patientsData ??
        []) as PatientProfile[];
  }

  const patientsMap = new Map(
    patients.map((patient) => [
      patient.id,
      patient,
    ])
  );

  const calendarAppointments =
    appointments.map((appointment) => {
      const patient =
        patientsMap.get(
          appointment.patient_id
        );

      const patientName = patient
        ? [
            patient.first_name,
            patient.last_name,
          ]
            .filter(Boolean)
            .join(" ") || "Paziente"
        : "Paziente";

      return {
        id: appointment.id,
        patientName,
        serviceType:
          appointment.service_type,
        appointmentDate:
          appointment.appointment_date,
        appointmentTime:
          appointment.appointment_time,
        durationMinutes:
          appointment.duration_minutes,
        status: appointment.status,
        patientNotes:
          appointment.patient_notes,
      };
    });

  const {
    data: unavailabilityData,
    error: unavailabilityError,
  } = await supabase
    .from(
      "professional_unavailability"
    )
    .select(
      `
        id,
        unavailable_date,
        start_time,
        end_time,
        all_day,
        reason
      `
    )
    .eq("professional_id", user.id)
    .gte("unavailable_date", today)
    .order("unavailable_date", {
      ascending: true,
    })
    .order("start_time", {
      ascending: true,
    });

  if (unavailabilityError) {
    console.error(
      "Errore lettura indisponibilità:",
      unavailabilityError
    );
  }

  const unavailability =
    (unavailabilityData ??
      []) as UnavailabilityRecord[];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Agenda professionale
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/professional"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Dashboard
            </Link>

            <Link
              href="/dashboard/professional/appointments"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Richieste
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="mb-8">
          <p className="text-sm font-semibold text-blue-700">
            Calendario e disponibilità
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Organizza la tua agenda
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Controlla gli appuntamenti futuri e blocca
            giorni o fasce orarie in cui non sei
            disponibile.
          </p>
        </section>

        {appointmentsError ||
        unavailabilityError ? (
          <div className="mb-8 rounded-2xl border border-red-300 bg-red-50 p-5 text-red-700">
            Alcuni dati dell’agenda non sono stati
            caricati correttamente. Controlla le
            policy Supabase e il terminale.
          </div>
        ) : null}

        <ProfessionalAvailabilityManager
          appointments={
            calendarAppointments
          }
          initialUnavailability={
            unavailability
          }
        />
      </div>
    </main>
  );
}