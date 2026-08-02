import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function ProfessionalReviewPage({
  params,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (currentProfile?.role !== "ADMIN") {
    redirect("/dashboard/patient");
  }

  const { userId } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard/admin/professionals"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Torna ai professionisti
        </Link>

        <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">
            Revisione professionista
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Dettaglio profilo
          </h1>

          <p className="mt-4 text-slate-600">
            ID professionista:
          </p>

          <code className="mt-2 block rounded-xl bg-slate-100 p-4 text-sm">
            {userId}
          </code>

          <p className="mt-6 text-slate-600">
            La visualizzazione completa dei dati,
            documenti e pulsanti di approvazione sarà
            realizzata nello Sprint 2.5C.
          </p>
        </section>
      </div>
    </main>
  );
}