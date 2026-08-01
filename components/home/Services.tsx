const services = [
    {
      icon: "🩺",
      title: "Infermieri",
      description: "Assistenza infermieristica a domicilio."
    },
    {
      icon: "❤️",
      title: "OSS",
      description: "Operatori Socio Sanitari qualificati."
    },
    {
      icon: "🦴",
      title: "Fisioterapisti",
      description: "Riabilitazione direttamente a casa."
    },
    {
      icon: "👨‍⚕️",
      title: "Medici",
      description: "Visite mediche domiciliari."
    },
    {
      icon: "💻",
      title: "Videoconsulti",
      description: "Consulti online in pochi minuti."
    },
    {
      icon: "👵",
      title: "Badanti",
      description: "Supporto domiciliare per anziani."
    }
  ];
  
  export default function Services() {
    return (
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
  
          <h2 className="text-4xl font-bold text-center text-slate-900">
            I servizi più richiesti
          </h2>
  
          <p className="text-center text-gray-500 mt-4">
            Trova rapidamente il professionista più adatto alle tue esigenze.
          </p>
  
          <div className="grid md:grid-cols-3 gap-8 mt-14">
  
            {services.map((service) => (
  
              <div
                key={service.title}
                className="rounded-2xl border p-8 hover:shadow-xl transition"
              >
  
                <div className="text-5xl">
                  {service.icon}
                </div>
  
                <h3 className="mt-5 text-2xl font-semibold">
                  {service.title}
                </h3>
  
                <p className="mt-3 text-gray-600">
                  {service.description}
                </p>
  
              </div>
  
            ))}
  
          </div>
  
        </div>
      </section>
    );
  }