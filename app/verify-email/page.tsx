import Link from "next/link";
import { MailCheck } from "lucide-react";

import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VerifyEmailPageProps {
  searchParams: Promise<{
    email?: string;
  }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { email } = await searchParams;
  const normalizedEmail = email?.trim().toLowerCase() ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <MailCheck className="mx-auto h-14 w-14 text-blue-700" />

          <CardTitle className="mt-4 text-3xl">
            Conferma la tua email
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {normalizedEmail ? (
            <>
              <p className="text-slate-600">
                Abbiamo inviato un codice di verifica di 8 cifre a{" "}
                <strong className="text-slate-900">
                  {normalizedEmail}
                </strong>
                .
              </p>

              <VerifyEmailForm email={normalizedEmail} />

              <p className="text-sm text-slate-500">
                Controlla anche la cartella spam se non trovi il messaggio.
              </p>
            </>
          ) : (
            <p className="text-red-600">
              Indirizzo email mancante. Ripeti la registrazione.
            </p>
          )}

          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full"
            )}
          >
            Vai alla pagina di accesso
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
