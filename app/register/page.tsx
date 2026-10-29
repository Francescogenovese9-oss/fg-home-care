import RegisterForm from "@/components/auth/RegisterForm";
import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center">
        <Link href="/" aria-label="FG Home Care - torna alla homepage" className="mb-7 inline-flex justify-center">
          <Image
            src="/images/logo.png"
            alt="FG Home Care"
            width={300}
            height={110}
            priority
            className="h-auto w-[245px] object-contain mix-blend-multiply lg:w-[275px]"
          />
        </Link>

        <RegisterForm />
      </div>
    </main>
  );
}