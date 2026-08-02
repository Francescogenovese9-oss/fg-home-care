"use client";

import { ChangeEvent, useState } from "react";

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

type UploadResponse = {
  success?: boolean;
  message?: string;
  publicUrl?: string;
};

export default function ProfessionalDocumentsForm() {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFile(
    endpoint: string,
    file: File,
    documentType?: string
  ) {
    const formData = new FormData();
    formData.append("file", file);

    if (documentType) {
      formData.append("documentType", documentType);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const result =
      (await response.json()) as UploadResponse;

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
      );

      setAvatarUrl(result.publicUrl ?? "");
      setMessage("Foto profilo caricata correttamente.");
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
    documentType: "identity" | "registration" | "vat"
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setMessage("");
    setIsUploading(true);

    try {
      await uploadFile(
        "/api/professional/documents",
        file,
        documentType
      );

      setMessage("Documento caricato correttamente.");
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

  return (
    <Card className="mt-8 shadow-sm">
      <CardHeader>
        <CardTitle>
          Foto e documenti professionali
        </CardTitle>

        <CardDescription>
          I documenti saranno conservati in un’area privata e
          utilizzati esclusivamente per la verifica del profilo.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        <div className="space-y-3">
          <Label htmlFor="avatar">
            Foto profilo
          </Label>

          {avatarUrl && (
            <img
              src={avatarUrl}
              alt="Foto profilo"
              className="h-28 w-28 rounded-full object-cover"
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
            JPG, PNG o WebP. Massimo 2 MB.
          </p>
        </div>

        <div className="space-y-3">
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
        </div>

        <div className="space-y-3">
          <Label htmlFor="registration">
            Documento iscrizione albo
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
        </div>

        <div className="space-y-3">
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
        </div>

        {isUploading && (
          <p className="text-sm text-blue-700">
            Caricamento in corso...
          </p>
        )}

        {message && (
          <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
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