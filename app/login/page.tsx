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
        <Link
          href="/"
          className="mb-8 text-xl font-bold text-blue-900"
        >
          FG Home Care
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
