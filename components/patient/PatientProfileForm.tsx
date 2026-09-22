"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PatientProfileFormProps = {
  initialFirstName: string;
  initialLastName: string;
  email: string;
  initialCity: string;
  initialProvince: string;
};

export default function PatientProfileForm({
  initialFirstName,
  initialLastName,
  email,
  initialCity,
  initialProvince,
}: PatientProfileFormProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [city, setCity] = useState(initialCity);
  const [province, setProvince] = useState(initialProvince);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/patient/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          city,
          province,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        setError(
          data.message ??
            "Non è stato possibile aggiornare il profilo."
        );
        return;
      }
      setSuccess(
        data.message ?? "Profilo aggiornato correttamente."
      );
    } catch {
      setError(
        "Si è verificato un errore. Riprova tra poco."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nome</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Cognome</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            autoComplete="family-name"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          readOnly
          disabled
        />
        <p className="text-xs text-slate-500">
          L'indirizzo email non può essere modificato da questa pagina.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">Città</Label>
          <Input
            id="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            autoComplete="address-level2"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="province">Provincia</Label>
          <Input
            id="province"
            value={province}
            onChange={(event) => setProvince(event.target.value)}
            autoComplete="address-level1"
            required
          />
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-600">
        La città viene utilizzata per mostrarti professionisti più pertinenti
        alla tua zona quando utilizzi l'assistenza personalizzata.
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
          {success}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSaving}
        className="min-h-11 px-5"
      >
        {isSaving ? "Salvataggio..." : "Salva modifiche"}
      </Button>
    </form>
  );
}
