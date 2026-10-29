import Image from "next/image";
import Link from "next/link";

import LoginForm from "@/components/auth/LoginForm";

interface LoginPageProps {
  searchParams: Promise<{
    confirmed?: string;
  }>;
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const { confirmed } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center">
        <Link href="/" aria-label="FG Home Care - torna alla homepage" className="mb-5 flex w-full max-w-md items-center justify-center">
          <Image
            src="/images/logo.png"
            alt="FG Home Care"
            width={300}
            height={110}
            priority
            className="mx-auto h-auto w-[205px] object-contain mix-blend-multiply sm:w-[225px]"
          />
        </Link>

        {confirmed === "true" ? (
          <div
            role="status"
            className="mb-6 w-full max-w-md rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-800"
          >
            Email confermata. Ora puoi accedere.
          </div>
        ) : null}

        <LoginForm />
      </div>
    </main>
  );
}
