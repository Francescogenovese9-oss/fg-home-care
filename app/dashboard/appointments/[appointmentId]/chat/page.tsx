import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import AppointmentChat, {
  type ChatMessage,
} from "@/components/chat/AppointmentChat";
import LogoutButton from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";

type AppointmentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

type PageProps = {
  params: Promise<{
    appointmentId: string;
  }>;
};

type AccountProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
};

function getFullName(
  profile: AccountProfile | null
) {
  if (!profile) {
    return "Utente FG Home Care";
  }

  return (
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ") || "Utente FG Home Care"
  );
}

function getStatusLabel(
  status: AppointmentStatus
) {
  switch (status) {
    case "ACCEPTED":
      return "Accettata";

    case "REJECTED":
      return "Rifiutata";

    case "CANCELLED":
      return "Annullata";

    case "COMPLETED":
      return "Completata";

    default:
      return "In attesa";
  }
}

function getServiceLabel(
  serviceType: string
) {
  return serviceType ===
    "VIDEO_CONSULTATION"
    ? "Videoconsulto"
    : "Assistenza domiciliare";
}

export default async function AppointmentChatPage({
  params,
}: PageProps) {
  const { appointmentId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=/dashboard/appointments/${appointmentId}/chat`
    );
  }

  const {
    data: currentProfile,
    error: currentProfileError,
  } = await supabase
    .from("profiles")
    .select(
      `
        id,
        first_name,
        last_name,
        role
      `
    )
    .eq("id", user.id)
    .maybeSingle();

  if (currentProfileError) {
    console.error(
      "Errore lettura profilo chat:",
      currentProfileError
    );
  }

  if (!currentProfile) {
    redirect("/login");
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
        service_type,
        appointment_date,
        appointment_time,
        duration_minutes,
        status
      `
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (appointmentError) {
    console.error(
      "Errore lettura appuntamento chat:",
      appointmentError
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

  const otherParticipantId = isPatient
    ? appointment.professional_id
    : appointment.patient_id;

  const {
    data: otherProfileData,
    error: otherProfileError,
  } = await supabase
    .from("profiles")
    .select(
      `
        id,
        first_name,
        last_name,
        role
      `
    )
    .eq("id", otherParticipantId)
    .maybeSingle();

  if (otherProfileError) {
    console.error(
      "Errore lettura partecipante chat:",
      otherProfileError
    );
  }

  const otherProfile =
    otherProfileData as AccountProfile | null;

  const {
    data: messagesData,
    error: messagesError,
  } = await supabase
    .from("appointment_messages")
    .select(
      `
        id,
        appointment_id,
        sender_id,
        message,
        read,
        read_at,
        created_at
      `
    )
    .eq("appointment_id", appointmentId)
    .order("created_at", {
      ascending: true,
    });

  if (messagesError) {
    console.error(
      "Errore lettura messaggi chat:",
      messagesError
    );
  }

  const messages =
    (messagesData ?? []) as ChatMessage[];

  const dashboardHref = isProfessional
    ? "/dashboard/professional"
    : "/dashboard/patient";

  const appointmentsHref = isProfessional
    ? "/dashboard/professional/appointments"
    : "/dashboard/patient/appointments";

  const chatEnabled = [
    "PENDING",
    "ACCEPTED",
    "COMPLETED",
  ].includes(appointment.status);

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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Chat della prenotazione
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
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

      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href={appointmentsHref}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Torna alle prenotazioni
        </Link>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Servizio
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {getServiceLabel(
                  appointment.service_type
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Data
              </p>

              <p className="mt-1 font-bold capitalize text-slate-900">
                {appointmentDate}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Orario
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {appointment.appointment_time.slice(
                  0,
                  5
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Stato
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {getStatusLabel(
                  appointment.status
                )}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <AppointmentChat
            appointmentId={appointment.id}
            currentUserId={user.id}
            otherParticipantName={getFullName(
              otherProfile
            )}
            initialMessages={messages}
            chatEnabled={chatEnabled}
          />
        </div>
      </div>
    </main>
  );
}