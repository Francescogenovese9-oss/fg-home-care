import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import ProfessionalDocumentReviewActions from "@/components/admin/ProfessionalDocumentReviewActions";
import ProfessionalReviewActions from "@/components/admin/ProfessionalReviewActions";
import LogoutButton from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";
import { getProfessionCategory, isProfession } from "@/lib/professions";

type VerificationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};

type AccountProfile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
};

type ProfessionalProfile = {
  user_id: string;
  profession: string;
  specialization: string | null;
  registration_number: string | null;
  vat_number: string | null;
  bio: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  service_radius_km: number;
  hourly_rate: number | null;
  available_weekdays: string[];
  available_from: string | null;
  available_to: string | null;
  home_visits: boolean;
  video_consultations: boolean;
  profile_completed: boolean;
  documents_submitted: boolean;
  avatar_path: string | null;
  identity_document_path: string | null;
  registration_document_path: string | null;
  vat_document_path: string | null;
  verification_status: VerificationStatus;
  verification_notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

type ProfessionalDocument = {
  id: string;
  document_type: "identity" | "registration" | "vat" | "cv";
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  is_public: boolean;  verification_status: VerificationStatus;
  rejection_reason: string | null;
  expires_at: string | null;
  uploaded_at: string;
  verified_at: string | null;
  verified_by: string | null;
  updated_at: string;
};

type DocumentLink = {
  documentId: string | null;
  documentType: "identity" | "registration" | "vat" | "cv" | null;
  label: string;
  path: string;
  url: string | null;
  originalFilename: string | null;
  fileSize: number | null;
  verificationStatus: VerificationStatus | null;
  rejectionReason: string | null;
  uploadedAt: string | null;
  isPublic: boolean | null;
};

const weekdayLabels: Record<string, string> = {
  MONDAY: "Lunedì",
  TUESDAY: "Martedì",
  WEDNESDAY: "Mercoledì",
  THURSDAY: "Giovedì",
  FRIDAY: "Venerdì",
  SATURDAY: "Sabato",
  SUNDAY: "Domenica",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Non disponibile";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  return value?.slice(0, 5) || "Non indicato";
}

function getStatusLabel(status: VerificationStatus) {
  switch (status) {
    case "APPROVED":
      return "Approvato";

    case "REJECTED":
      return "Rifiutato";

    default:
      return "In attesa";
  }
}

function getStatusClass(status: VerificationStatus) {
  switch (status) {
    case "APPROVED":
      return "border-green-300 bg-green-50 text-green-700";

    case "REJECTED":
      return "border-red-300 bg-red-50 text-red-700";

    default:
      return "border-amber-300 bg-amber-50 text-amber-700";
  }
}

export default async function ProfessionalReviewPage({
  params,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (!adminUser) {
    redirect("/login");
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", adminUser.id)
    .maybeSingle();

  if (adminProfile?.role !== "ADMIN") {
    redirect("/dashboard/patient");
  }

  const { userId } = await params;

  const {
    data: accountProfileData,
    error: accountProfileError,
  } = await supabase
    .from("profiles")
    .select(
      `
        id,
        email,
        first_name,
        last_name,
        role
      `
    )
    .eq("id", userId)
    .maybeSingle();

  const {
    data: professionalProfileData,
    error: professionalProfileError,
  } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const {
    data: professionalDocumentsData,
    error: professionalDocumentsError,
  } = await supabase
    .from("professional_documents")
    .select(
      `
        id,
        document_type,
        storage_path,
        original_filename,
        mime_type,
        file_size,
        verification_status,
          is_public,        rejection_reason,
        expires_at,
        uploaded_at,
        verified_at,
        verified_by,
        updated_at
      `
    )
    .eq("professional_id", userId)
    .order("uploaded_at", { ascending: false });

  if (
    accountProfileError ||
    professionalProfileError ||
      professionalDocumentsError
  ) {
    console.error("Errore lettura revisione:", {
      accountProfileError,
      professionalProfileError,
        professionalDocumentsError,
    });
  }

  if (
    !accountProfileData ||
    !professionalProfileData
  ) {
    notFound();
  }

  const accountProfile =
    accountProfileData as AccountProfile;

  const professionalProfile =
    professionalProfileData as ProfessionalProfile;

  const professionalDocuments =
    (professionalDocumentsData ?? []) as ProfessionalDocument[];

  const professionCategory = isProfession(professionalProfile.profession)
    ? getProfessionCategory(professionalProfile.profession)
    : null;

  const registrationDocumentLabel =
    professionCategory === "HEALTH_OPERATOR"
      ? "Attestato / qualifica OSS"
      : professionCategory === "CARE_ASSISTANCE"
        ? "Attestati o documentazione professionale"
        : "Documento iscrizione all'Ordine/albo";

  const registrationNumberLabel =
    professionCategory === "HEALTH_OPERATOR"
      ? "Numero qualifica / attestato OSS"
      : professionCategory === "CARE_ASSISTANCE"
        ? "Iscrizione professionale"
        : "Numero iscrizione albo";

  async function createDocumentLink(
    label: string,
    path: string | null,
    document: ProfessionalDocument | null = null
  ): Promise<DocumentLink | null> {
    if (!path) {
      return null;
    }

    const { data, error } = await supabase.storage
      .from("professional-documents")
      .createSignedUrl(path, 60 * 15);

    if (error) {
      console.error(
        `Errore URL firmato ${label}:`,
        error
      );
    }

    return {
      documentId: document?.id ?? null,
      documentType: document?.document_type ?? null,
      label,
      path,
      url: data?.signedUrl ?? null,
      originalFilename: document?.original_filename ?? null,
      fileSize: document?.file_size ?? null,
      verificationStatus: document?.verification_status ?? null,
      rejectionReason: document?.rejection_reason ?? null,
      uploadedAt: document?.uploaded_at ?? null,
      isPublic: document?.is_public ?? null,
    };  }

  const identityDocument = professionalDocuments.find(
    (document) => document.document_type === "identity"
  ) ?? null;

  const registrationDocument = professionalDocuments.find(
    (document) => document.document_type === "registration"
  ) ?? null;

  const vatDocument = professionalDocuments.find(
    (document) => document.document_type === "vat"
  ) ?? null;

  const cvDocument = professionalDocuments.find(
    (document) => document.document_type === "cv"
  ) ?? null;
  const documentLinks = (
    await Promise.all([
      createDocumentLink(
        "Documento di identità",
        identityDocument?.storage_path ??
          professionalProfile.identity_document_path,
        identityDocument
      ),
      createDocumentLink(
        registrationDocumentLabel,
        registrationDocument?.storage_path ??
          professionalProfile.registration_document_path,
        registrationDocument
      ),
        createDocumentLink(
          "Documento Partita IVA",
          vatDocument?.storage_path ??
            professionalProfile.vat_document_path,
          vatDocument
        ),
        createDocumentLink(
          "Curriculum Vitae",
          cvDocument?.storage_path ?? null,
          cvDocument
        ),
      ])
    ).filter(    (document): document is DocumentLink =>
      document !== null
  );

  let avatarUrl: string | null = null;

  if (professionalProfile.avatar_path) {
    const {
      data: { publicUrl },
    } = supabase.storage
      .from("avatars")
      .getPublicUrl(
        professionalProfile.avatar_path
      );

    const version =
      professionalProfile.updated_at
        ? encodeURIComponent(
            professionalProfile.updated_at
          )
        : Date.now().toString();

    avatarUrl =
      `${publicUrl}?v=${version}`;
  }

  const fullName =
    [
      accountProfile.first_name,
      accountProfile.last_name,
    ]
      .filter(Boolean)
      .join(" ") || "Professionista";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              FG Home Care
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Revisione professionista
            </h1>
          </div>

          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/dashboard/admin/professionals"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Torna all’elenco
        </Link>

        <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`Foto di ${fullName}`}
                className="h-28 w-28 rounded-full border object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-200 text-3xl font-bold text-slate-600">
                {fullName.charAt(0)}
              </div>
            )}

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-bold text-slate-900">
                  {fullName}
                </h2>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                    professionalProfile.verification_status
                  )}`}
                >
                  {getStatusLabel(
                    professionalProfile.verification_status
                  )}
                </span>
              </div>

              <p className="mt-2 text-slate-600">
                {accountProfile.email ??
                  "Email non disponibile"}
              </p>

              <p className="mt-1 font-semibold text-blue-700">
                {professionalProfile.profession}
              </p>

              {professionalProfile.specialization && (
                <p className="mt-1 text-sm text-slate-500">
                  {
                    professionalProfile.specialization
                  }
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Dati professionali
            </h2>

            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  {registrationNumberLabel}
                </dt>

                <dd className="mt-1 text-slate-900">
                  {professionalProfile.registration_number ||
                    "Non indicato"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Partita IVA
                </dt>

                <dd className="mt-1 text-slate-900">
                  {professionalProfile.vat_number ||
                    "Non indicata"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Presentazione
                </dt>

                <dd className="mt-1 whitespace-pre-line text-slate-900">
                  {professionalProfile.bio ||
                    "Nessuna descrizione inserita."}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Località
                </dt>

                <dd className="mt-1 text-slate-900">
                  {[
                    professionalProfile.city,
                    professionalProfile.province,
                    professionalProfile.postal_code,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                    "Non indicata"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Raggio d’intervento
                </dt>

                <dd className="mt-1 text-slate-900">
                  {
                    professionalProfile.service_radius_km
                  }{" "}
                  km
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Tariffa oraria
                </dt>

                <dd className="mt-1 text-slate-900">
                  {professionalProfile.hourly_rate !==
                  null
                    ? `${Number(
                        professionalProfile.hourly_rate
                      ).toFixed(2)} €`
                    : "Non indicata"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Disponibilità
            </h2>

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-500">
                Giorni disponibili
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {professionalProfile.available_weekdays
                  .length > 0 ? (
                  professionalProfile.available_weekdays.map(
                    (day) => (
                      <span
                        key={day}
                        className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700"
                      >
                        {weekdayLabels[day] ?? day}
                      </span>
                    )
                  )
                ) : (
                  <p className="text-slate-600">
                    Nessun giorno indicato.
                  </p>
                )}
              </div>
            </div>

            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Orario
                </dt>

                <dd className="mt-1 text-slate-900">
                  {formatTime(
                    professionalProfile.available_from
                  )}{" "}
                  –{" "}
                  {formatTime(
                    professionalProfile.available_to
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Assistenza domiciliare
                </dt>

                <dd className="mt-1 text-slate-900">
                  {professionalProfile.home_visits
                    ? "Disponibile"
                    : "Non disponibile"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Videoconsulti
                </dt>

                <dd className="mt-1 text-slate-900">
                  {professionalProfile.video_consultations
                    ? "Disponibile"
                    : "Non disponibile"}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Documenti
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            I link restano validi per 15 minuti.
          </p>

          {documentLinks.length === 0 ? (
            <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Non è stato caricato alcun documento.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {documentLinks.map((document) => (
                <article
                  key={document.path}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900">
                      {document.label}
                    </h3>

                      {document.verificationStatus && (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                            document.verificationStatus
                          )}`}
                        >
                          {getStatusLabel(
                            document.verificationStatus
                          )}
                        </span>
                      )}
                    </div>

                    {document.documentType === "cv" && (
                      <p className="mt-2 text-xs font-semibold text-slate-600">
                        Visibilità:{" "}
                        <span
                          className={
                            document.isPublic
                              ? "text-green-700"
                              : "text-slate-500"
                          }
                        >
                         {document.isPublic ? "Pubblico" : "Privato"}
                        </span>
                      </p>
                    )}                  {document.originalFilename && (
                    <p className="mt-3 break-all text-sm text-slate-600">
                      File: {document.originalFilename}
                    </p>
                  )}

                  {document.uploadedAt && (
                    <p className="mt-1 text-sm text-slate-600">
                      Caricato: {formatDate(document.uploadedAt)}
                    </p>
                  )}

                  {document.fileSize !== null && (
                    <p className="mt-1 text-sm text-slate-600">
                      Dimensione:{" "}
                      {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}

                  {document.rejectionReason && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      Motivo del rifiuto: {document.rejectionReason}
                    </div>
                  )}

                  {document.url ? (
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      Apri documento
                    </a>
                  ) : (
                    <p className="mt-4 text-sm text-red-600">
                      Link temporaneo non disponibile.
                    </p>
                  )}

                  {document.documentId && document.verificationStatus ? (
                    <ProfessionalDocumentReviewActions
                      userId={professionalProfile.user_id}
                      documentId={document.documentId}
                      currentStatus={document.verificationStatus}
                      currentRejectionReason={document.rejectionReason}
                    />
                  ) : (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Documento legacy: deve essere ricaricato dal professionista prima della verifica individuale.
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Stato completamento
          </h2>

          <dl className="mt-6 grid gap-5 md:grid-cols-3">
            <div>
              <dt className="text-sm font-semibold text-slate-500">
                Profilo completato
              </dt>

              <dd className="mt-1 text-slate-900">
                {professionalProfile.profile_completed
                  ? "Sì"
                  : "No"}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-semibold text-slate-500">
                Documenti inviati
              </dt>

              <dd className="mt-1 text-slate-900">
                {professionalProfile.documents_submitted
                  ? "Sì"
                  : "No"}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-semibold text-slate-500">
                Pubblicato
              </dt>

              <dd className="mt-1 text-slate-900">
                {professionalProfile.published
                  ? "Sì"
                  : "No"}
              </dd>
            </div>
          </dl>

          <p className="mt-6 text-xs text-slate-400">
            Ultimo aggiornamento:{" "}
            {formatDate(
              professionalProfile.updated_at
            )}
          </p>
        </section>

        <div className="mt-8">
          <ProfessionalReviewActions
            userId={professionalProfile.user_id}
            currentStatus={
              professionalProfile.verification_status
            }
            currentNotes={
              professionalProfile.verification_notes
            }
            profileCompleted={
              professionalProfile.profile_completed
            }
            documentsSubmitted={
              professionalProfile.documents_submitted
            }
          />
        </div>
      </div>
    </main>
  );
}
