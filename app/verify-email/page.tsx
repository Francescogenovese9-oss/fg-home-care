import Link from "next/link";
import { MailCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface VerifyEmailPageProps {
  searchParams: Promise<{
    email?: string;
  }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { email } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <MailCheck className="mx-auto h-14 w-14 text-blue-700" />

          <CardTitle className="mt-4 text-3xl">
            Controlla la tua email
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-slate-600">
            Abbiamo inviato un collegamento di conferma
            {email ? (
              <>
                {" "}
                all’indirizzo{" "}
                <strong className="text-slate-900">
                  {email}
                </strong>
              </>
            ) : null}
            .
          </p>

          <p className="text-sm text-slate-500">
            Apri il messaggio e conferma l’account prima di
            effettuare l’accesso. Controlla anche la cartella spam.
          </p>

          <Link
  href="/login"
  className={cn(buttonVariants(), "w-full")}
>
  Vai alla pagina di accesso
</Link>
        </CardContent>
      </Card>
    </main>
  );
}