export default function HowItWorks() {
    return (
      <section className="bg-slate-50 py-24">
  
        <div className="max-w-7xl mx-auto px-6">
  
          <h2 className="text-4xl font-bold text-center">
            Come funziona
          </h2>
  
          <div className="grid md:grid-cols-3 gap-10 mt-16">
  
            <div className="text-center">
  
              <div className="text-6xl">🔍</div>
  
              <h3 className="text-2xl font-semibold mt-6">
                Cerca
              </h3>
  
              <p className="mt-3 text-gray-600">
                Seleziona professione e città.
              </p>
  
            </div>
  
            <div className="text-center">
  
              <div className="text-6xl">📅</div>
  
              <h3 className="text-2xl font-semibold mt-6">
                Prenota
              </h3>
  
              <p className="mt-3 text-gray-600">
                Scegli giorno e orario.
              </p>
  
            </div>
  
            <div className="text-center">
  
              <div className="text-6xl">🏠</div>
  
              <h3 className="text-2xl font-semibold mt-6">
                Ricevi assistenza
              </h3>
  
              <p className="mt-3 text-gray-600">
                Il professionista arriverà a domicilio.
              </p>
  
            </div>
  
          </div>
  
        </div>
      </section>
    );
  }