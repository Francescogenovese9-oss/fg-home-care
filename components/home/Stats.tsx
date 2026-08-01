const stats = [
    {
      number: "500+",
      title: "Professionisti verificati"
    },
    {
      number: "20",
      title: "Regioni coperte"
    },
    {
      number: "10.000+",
      title: "Prenotazioni"
    },
    {
      number: "98%",
      title: "Utenti soddisfatti"
    }
  ];
  
  export default function Stats() {
    return (
      <section className="bg-blue-700 py-20 text-white">
  
        <div className="max-w-7xl mx-auto px-6">
  
          <div className="grid md:grid-cols-4 gap-10">
  
            {stats.map((item) => (
  
              <div
                key={item.title}
                className="text-center"
              >
  
                <h2 className="text-5xl font-bold">
                  {item.number}
                </h2>
  
                <p className="mt-4 opacity-90">
                  {item.title}
                </p>
  
              </div>
  
            ))}
  
          </div>
  
        </div>
  
      </section>
    );
  }