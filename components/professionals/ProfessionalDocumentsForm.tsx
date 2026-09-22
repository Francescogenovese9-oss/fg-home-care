"use client";

import { ChangeEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfessionCategory, type Profession } from "@/lib/professions";

type DocumentType =
  | "identity"
  | "registration"
  | "vat"
  | "cv";

type ProfessionalDocument = {
  id: string;
  document_type: DocumentType;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  is_public: boolean;
  verification_status: "PENDING" | "APPROVED" | "REJECTED";
  rejection_reason: string | null;
  expires_at: string | null;
  uploaded_at: string;
  updated_at: string;
};

type UploadResponse = {
  success?: boolean;
  message?: string;
  publicUrl?: string;
  document?: ProfessionalDocument;
};

type DocumentsResponse = {
  success?: boolean;
  message?: string;
  documents?: ProfessionalDocument[];
};

type ProfessionalDocumentsFormProps = {
  profession: Profession | null;
};

export default function ProfessionalDocumentsForm({
  profession,
}: ProfessionalDocumentsFormProps) {
  const professionCategory = profession
    ? getProfessionCategory(profession)
    : null;

  const registrationDocumentLabel =
    professionCategory === "HEALTH_OPERATOR"
      ? "Attestato / qualifica OSS"
      : professionCategory === "CARE_ASSISTANCE"
        ? "Attestati o documentazione professionale"
        : "Documento iscrizione all'Ordine/albo";

  const registrationDocumentDescription =
    professionCategory === "HEALTH_OPERATOR"
      ? "Carica l'attestato che certifica la qualifica di Operatore Socio Sanitario."
      : professionCategory === "CARE_ASSISTANCE"
        ? "Puoi caricare eventuali attestati, qualifiche o altra documentazione relativa alla tua esperienza assistenziale."
        : "Carica il certificato o una prova dell'iscrizione professionale.";

  const [avatarUrl, setAvatarUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [documents, setDocuments] = useState<ProfessionalDocument[]>([]);
  const [cvIsPublic, setCvIsPublic] = useState(false);
  const [isSavingCvVisibility, setIsSavingCvVisibility] = useState(false);
  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      try {
        const response = await fetch("/api/professional/documents", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as DocumentsResponse;

        if (!response.ok) {
          throw new Error(
            result.message || "Impossibile recuperare i documenti."
          );
        }

          if (!cancelled) {
            const loadedDocuments = result.documents ?? [];

            setDocuments(loadedDocuments);

            const cvDocument = loadedDocuments.find(
              (document) => document.document_type === "cv"
            );

            setCvIsPublic(cvDocument?.is_public ?? false);
          }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossibile recuperare i documenti."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDocuments(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, []);

  async function uploadFile(
    endpoint: string,
    file: File,
    documentType?: string,
    isPublic?: boolean
  ) {
    const formData = new FormData();

    formData.append("file", file);

    if (documentType) {
      formData.append("documentType", documentType);
    }

    if (documentType === "cv") {
      formData.append(
        "isPublic",
        isPublic ? "true" : "false"
      );
    }

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as UploadResponse;

    if (!response.ok) {
      throw new Error(
        result.message || "Caricamento non riuscito."
      );
    }

    return result;
  }
  async function handleAvatar(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setMessage("");
    setIsUploading(true);

    try {
      const result = await uploadFile(
        "/api/professional/avatar",
        file
      );      setAvatarUrl(result.publicUrl ?? "");


      setMessage(
        "Foto profilo caricata correttamente."
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Caricamento non riuscito."
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleDocument(
    event: ChangeEvent<HTMLInputElement>,
    documentType: DocumentType
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setMessage("");
    setIsUploading(true);

    try {
      const result = await uploadFile(
        "/api/professional/documents",
        file,
        documentType,
        documentType === "cv" ? cvIsPublic : false
      );

      if (result.document) {
        const savedDocument = result.document;

        setDocuments((currentDocuments) => [
          savedDocument,
          ...currentDocuments.filter(
            (document) =>
              document.document_type !== documentType
          ),
        ]);
      }

      setMessage(
        "Documento caricato correttamente."
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Caricamento non riuscito."
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleCvVisibilityChange(
    isPublic: boolean
  ) {
    const previousValue = cvIsPublic;

    setCvIsPublic(isPublic);
    setError("");
    setMessage("");

    const cvDocument = documents.find(
      (document) => document.document_type === "cv"
    );

    if (!cvDocument) {
      return;
    }

    setIsSavingCvVisibility(true);

    try {
      const response = await fetch(
        "/api/professional/documents",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentType: "cv",
            isPublic,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Impossibile aggiornare la visibilità del curriculum."
        );
      }

      setDocuments((currentDocuments) =>
        currentDocuments.map((document) =>
          document.document_type === "cv"
            ? {
                ...document,
                is_public: isPublic,
             }
            : document
        )
      );

      setMessage(
        isPublic
          ? "Curriculum reso pubblico."
          : "Curriculum reso privato."
      );
    } catch (visibilityError) {
      setCvIsPublic(previousValue);

      setError(
        visibilityError instanceof Error
          ? visibilityError.message
          : "Impossibile aggiornare la visibilità del curriculum."
     );
    } finally {
      setIsSavingCvVisibility(false);
    }
  }
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>
          Foto e documenti professionali
        </CardTitle>

        <CardDescription>
          I documenti saranno conservati in un’area privata e
          utilizzati esclusivamente per verificare il profilo.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        <section className="space-y-3">
          <Label htmlFor="avatar">
            Foto profilo
          </Label>

          {avatarUrl && (
            <img
              src={avatarUrl}
              alt="Foto profilo del professionista"
              className="h-28 w-28 rounded-full border object-cover"
            />
          )}

          <Input
            id="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatar}
            disabled={isUploading}
          />

          <p className="text-xs text-slate-500">
            Formati ammessi: JPG, PNG e WebP. Dimensione massima:
            2 MB.
          </p>
        </section>

        <section className="space-y-3">
          <Label htmlFor="identity">
            Documento di identità
          </Label>

          <Input
            id="identity"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(event) =>
              handleDocument(event, "identity")
            }
            disabled={isUploading}
          />

          <p className="text-xs text-slate-500">
            PDF, JPG o PNG. Dimensione massima: 6 MB.
          </p>
        </section>

        <section className="space-y-3">
          <Label htmlFor="registration">
            {registrationDocumentLabel}{professionCategory === "CARE_ASSISTANCE" ? " (facoltativo)" : ""}
          </Label>

          <Input
            id="registration"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(event) =>
              handleDocument(event, "registration")
            }
            disabled={isUploading}
          />

          <p className="text-xs text-slate-500">
            {registrationDocumentDescription}
          </p>
        </section>

        <section className="space-y-3">
          <Label htmlFor="vat">
            Documento Partita IVA
          </Label>

          <Input
            id="vat"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(event) =>
              handleDocument(event, "vat")
            }
            disabled={isUploading}
          />

          <p className="text-xs text-slate-500">
            Campo facoltativo nella fase iniziale.
          </p>
        </section>

          <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
            <div>
              <Label htmlFor="cv">
                Curriculum Vitae (obbligatorio)
              </Label>

              <p className="mt-1 text-xs text-slate-600">
                Il curriculum è necessario per la verifica del profilo professionale.
              </p>
            </div>

            <Input
              id="cv"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) =>
                handleDocument(event, "cv")
              }
              disabled={isUploading}
            />

            <p className="text-xs text-slate-500">
              PDF, JPG o PNG. Dimensione massima: 6 MB.
            </p>

            <label className="flex items-start gap-3 rounded-lg border bg-white p-3">
              <input
                type="checkbox"
                checked={cvIsPublic}
                onChange={(event) =>
                  handleCvVisibilityChange(event.target.checked)
                }
                disabled={isSavingCvVisibility || isUploading}
                  className="mt-1 h-4 w-4"
              />

              <span>
                <span className="block text-sm font-medium text-slate-900">
                  Rendi pubblico il mio curriculum
                </span>

                <span className="mt-1 block text-xs text-slate-600">
                  Se non selezioni questa opzione, il curriculum sarà visibile solo a te e agli amministratori FG Home Care.
                </span>
              </span>
            </label>
          </section>

          <section className="space-y-3 rounded-xl border p-4">
            <h3 className="font-medium">
              Documenti caricati
            </h3>

            {isLoadingDocuments ? (
              <p className="text-sm text-slate-500">
                Caricamento documenti...
              </p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nessun documento caricato.
              </p>
            ) : (
              <div className="space-y-3">
                {documents.map((document) => {
                    const documentLabel =
                      document.document_type === "identity"
                        ? "Documento di identità"
                        : document.document_type === "registration"
                          ? registrationDocumentLabel
                          : document.document_type === "cv"
                            ? "Curriculum Vitae"
                            : "Partita IVA";
                  const statusLabel =
                    document.verification_status === "APPROVED"
                   ? "Verificato"
                      : document.verification_status === "REJECTED"
                        ? "Rifiutato"
                        : "In attesa di verifica";

                  return (
                    <div
                      key={document.id}
                      className="rounded-lg border px-3 py-3"
                    >
                      <p className="text-sm font-medium">
                        {documentLabel}
                      </p>

                      <p className="text-sm text-slate-600">
                        {document.original_filename ||
                          "Documento caricato"}
                      </p>

                      <p className="text-xs text-slate-500">
                        {statusLabel} · Caricato il{" "}
                       {new Date(
                          document.uploaded_at
                        ).toLocaleDateString("it-IT")}
                      </p>

                        {document.document_type === "cv" && (
                          <p className="mt-1 text-xs font-medium text-slate-600">
                            Visibilità:{" "}
                            {document.is_public ? "Pubblico" : "Privato"}
                          </p>
                        )}

                      {document.verification_status ===
                        "REJECTED" &&
                        document.rejection_reason && (
                          <p className="mt-2 text-xs text-red-700">
                            Motivo:{" "}
                            {document.rejection_reason}
                          </p>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {isUploading && (
            <p className="text-sm font-medium text-blue-700">            Caricamento in corso...
          </p>
        )}

        {message && (
          <div
            role="status"
            className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <Button type="button" disabled>
          Verifica in attesa
        </Button>
      </CardContent>
    </Card>
  );
}
