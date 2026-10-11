import Link from "next/link";

export default function Footer() {
    return (
      <footer className="bg-blue-900 text-white py-10 mt-20">
        <div className="max-w-7xl mx-auto text-center">
  
          <h2 className="text-2xl font-bold">
            FG Home Care
          </h2>
  
          <p className="mt-2">
            La salute direttamente a casa tua.
          </p>
  
          <nav aria-label="Documenti informativi" className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">\n            <Link href="/carta-dei-servizi" className="underline-offset-4 hover:underline">Carta dei Servizi</Link>\n          </nav>\n\n          <p className="mt-6 text-sm opacity-80">
            © 2026 FG Home Care
          </p>
  
        </div>
      </footer>
    );
  }