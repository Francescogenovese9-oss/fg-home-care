"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VerifyEmailFormProps {
  email: string;
}

export function VerifyEmailForm({
  email,
}: VerifyEmailFormProps) {
  const router = useRouter();

  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!/^\d{8}$/.test(token)) {
      setError("Inserisci il codice di 8 cifre ricevuto via email.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Codice non valido.");
        return;
      }

      router.replace("/login?confirmed=true");
    } catch {
      setError("Impossibile verificare il codice. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={8}
        value={token}
        onChange={(event) =>
          setToken(event.target.value.replace(/\D/g, "").slice(0, 8))
        }
        placeholder="000000"
        className="text-center text-xl tracking-[0.4em]"
        aria-label="Codice di verifica"
        required
      />

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={loading || token.length !== 8}
      >
        {loading ? "Verifica in corso..." : "Conferma email"}
      </Button>
    </form>
  );
}
