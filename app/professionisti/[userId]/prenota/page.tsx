import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import AppointmentRequestForm from "@/components/appointments/AppointmentRequestForm";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
  searchParams: Promise<{
    source?: string | string[];
  }>;
};

export default async function BookProfessionalPage({
  params,
  searchParams,
}: PageProps) {
  const { userId } = await params;

  const search = await searchParams;
  const source = Array.isArray(search.source) ? search.source[0] : search.source;
  const isCareGuidance = source === "care";

  const bookingPath = `/professionisti/${userId}/prenota${isCareGuidance ? "?source=care" : ""}`;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(bookingPath)}`
    );
  }

  const { data: accountProfile } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  if (accountProfile?.role !== "PATIENT") {
    redirect(
      `/professionisti/${userId}`
    );
  }

  const { data, error } =
    await supabase
      .from("public_professionals")
      .select(
        `
          user_id,
          first_name,
          last_name,
          profession,
          specialization,
          city,
          province,
          hourly_rate,
          available_weekdays,
          available_from,
          available_to,
          home_visits,
          video_consultations
        `
      )
      .eq("user_id", userId)
      .maybeSingle();

  if (error) {
    console.error(
      "Errore lettura professionista:",
      error
    );
  }

  if (!data) {
    notFound();
  }

  const professionalName =
    [
      data.first_name,
      data.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Professionista sanitario";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-xl font-bold text-blue-900"
          >
            FG Home Care
          </Link>

          <Link
            href={`/professionisti/${userId}`}
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            Torna al profilo
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {isCareGuidance && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="font-semibold text-blue-900">
              Assistenza personalizzata
            </p>
            <p className="mt-1 text-sm text-blue-800">
              Hai scelto questo professionista tra quelli suggeriti da FG Home Care per la tua esigenza.
            </p>
          </div>
        )}

        <section className="mb-8">
          <p className="text-sm font-semibold text-blue-700">
            Richiesta di assistenza
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Prenota con {professionalName}
          </h1>

          <p className="mt-3 text-slate-600">
            {data.profession}

            {data.specialization
              ? ` – ${data.specialization}`
              : ""}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {[data.city, data.province]
              .filter(Boolean)
              .join(", ")}
          </p>
        </section>

        <AppointmentRequestForm
          professionalId={data.user_id}
          bookingSource={isCareGuidance ? "CARE_GUIDANCE" : "DIRECT"}
          professionalName={
            professionalName
          }
          homeVisits={data.home_visits}
          videoConsultations={
            data.video_consultations
          }
          availableFrom={
            data.available_from
          }
          availableTo={
            data.available_to
          }
          hourlyRate={
            data.hourly_rate
          }
        />
      </div>
    </main>
  );
}