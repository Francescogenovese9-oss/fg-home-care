import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import VideoConsultationRoom from "@/components/video/VideoConsultationRoom";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    appointmentId: string;
  }>;
};

export default async function VideoConsultationPage({
  params,
}: PageProps) {
  const { appointmentId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=/dashboard/appointments/${appointmentId}/video`
    );
  }

  const {
    data: appointment,
    error,
  } = await supabase
    .from("appointments")
    .select(
      `
        id,
        patient_id,
        professional_id,
        service_type,
        appointment_date,
        appointment_time
      `
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) {
    console.error(
      "Errore lettura appuntamento video:",
      error
    );
  }

  if (!appointment) {
    notFound();
  }

  const isPatient =
    appointment.patient_id === user.id;

  const isProfessional =
    appointment.professional_id === user.id;

  if (!isPatient && !isProfessional) {
    notFound();
  }

  if (
    appointment.service_type !==
    "VIDEO_CONSULTATION"
  ) {
    notFound();
  }

  const dashboardHref = isProfessional
    ? "/dashboard/professional"
    : "/dashboard/patient";

  const appointmentsHref = isProfessional
    ? "/dashboard/professional/appointments"
    : "/dashboard/patient/appointments";

  const appointmentDate =
    new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(
      new Date(
        `${appointment.appointment_date}T12:00:00`
      )
    );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Videoconsulto
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href={dashboardHref}
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Dashboard
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={appointmentsHref}
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            ←orna alle prenotazioni
          </Link>

          <p className="text-sm text-slate-600">
            <span className="font-semibold capitalize">
              {appointmentDate}
            </span>
            {" · "}
            {appointment.appointment_time.slice(
              0,
              5
            )}
          </p>
        </div>

        <VideoConsultationRoom
          appointmentId={appointment.id}
        />

        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          Consenti l'accesso a videocamera e microfono quando richiesto dal browser.
        </p>
      </div>
    </main>
  );
}
