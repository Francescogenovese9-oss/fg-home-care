import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full bg-white shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">

        <Link href="/" className="flex items-center gap-3">

          <Image
            src="/images/logo.png"
            alt="FG Home Care"
            width={70}
            height={70}
          />

          <div>
            <h1 className="text-2xl font-bold text-blue-900">
              FG Home Care
            </h1>

            <p className="text-sm text-gray-500">
              La salute a casa tua
            </p>
          </div>

        </Link>

        <nav className="hidden md:flex gap-8">

          <Link href="/">Chi siamo</Link>

          <Link href="#">Servizi</Link>

          <Link href="#">Professionisti</Link>

          <Link href="#">Videoconsulti</Link>

          <Link href="#">Contatti</Link>

        </nav>

        <div className="flex gap-3">

          <button className="px-5 py-2 rounded-lg border">
            Accedi
          </button>

          <button className="px-5 py-2 rounded-lg bg-blue-700 text-white">
            Registrati
          </button>

        </div>

      </div>
    </header>
  );
}