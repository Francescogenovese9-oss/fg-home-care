import Link from "next/link";
import { redirect } from "next/navigation";

import PatientProfileForm from "@/components/patient/PatientProfileForm";
import { createClient } from "@/lib/supabase/server";

export default async function PatientProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "Errore autenticazione profilo paziente:",
      userError
    );
  }

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, email, role, city, province"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Errore lettura profilo paziente:",
      profileError
    );
  }

  if (profile?.role === "PROFESSIONAL") {
    redirect("/dashboard/professional");
  }

  if (profile?.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (!profile || profile.role !== "PATIENT") {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              Il mio profilo
            </h1>
          </div>

          <Link
            href="/dashboard/patient"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            Torna alla dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <section className="        <sectorder border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900">
              Dati personali
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Mantieni aggiornati i tuoi dati. La città viene utilizzata
              anche per individuare professionisti pertinenti alla tua zona.
            </p>
          </div>

          <PatientProfileForm
            initialFirstName={profile.first_name ?? ""}
            initialLastName={profile.last_name ?? ""}
            email={profile.email ?? user.email ?? ""}
            initialCity={profile.city ?? ""}
            initialProvince={profile.province ?? ""}
          />
        </section>
      </div>
    </main>
  );
}
