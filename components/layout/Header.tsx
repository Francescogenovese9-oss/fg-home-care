import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="relative z-50 border-b border-slate-100 bg-white">
      <div className="mx-auto flex min-h-[104px] max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/images/logo.png"
            alt="FG Home Care"
            width={300}
            height={110}
            priority
            className="h-auto w-[245px] object-contain lg:w-[275px]"
          />
          </Link>

        <nav
          className="hidden items-center gap-8 text-[17px] font-medium text-slate-700 lg:flex"
          aria-label="Navigazione principale"
        >
          <Link href="/chi-siamo" className="transition hover:text-blue-700">
            Chi siamo
          </Link>

          <Link href="/servizi" className="transition hover:text-blue-700">
            Servizi
          </Link>

          <Link
            href="/professionisti"
            className="transition hover:text-blue-700"
          >
            Professionisti
          </Link>

          <Link
            href="/videoconsulti"
            className="transition hover:text-blue-700"
          >
            Videoconsulti
          </Link>

          <Link href="/contatti" className="transition hover:text-blue-700">
            Contatti
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Accedi
          </Link>

          <Link
            href="/register"
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Registrati
          </Link>
        </div>
      </div>
    </header>
  );
}