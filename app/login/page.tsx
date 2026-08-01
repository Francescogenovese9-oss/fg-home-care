import Link from "next/link";

import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center">
        <Link
          href="/"
          className="mb-8 text-xl font-bold text-blue-900"
        >
          FG Home Care
        </Link>

        <LoginForm />
      </div>
    </main>
  );
}