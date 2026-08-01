const reviews = [
    {
      name: "Maria R.",
      text: "Servizio eccellente. Ho trovato un infermiere in meno di un'ora."
    },
    {
      name: "Luigi B.",
      text: "Piattaforma semplice e professionisti molto preparati."
    },
    {
      name: "Anna C.",
      text: "Finalmente un servizio serio per l'assistenza domiciliare."
    }
  ];
  
  export default function Testimonials() {
    return (
      <section className="bg-slate-50 py-24">
  
        <div className="max-w-7xl mx-auto px-6">
  
          <h2 className="text-4xl font-bold text-center">
            Cosa dicono i nostri utenti
          </h2>
  
          <div className="grid md:grid-cols-3 gap-8 mt-16">
  
            {reviews.map((review) => (
  
              <div
                key={review.name}
                className="bg-white rounded-2xl shadow p-8"
              >
  
                <div className="text-yellow-500 text-xl">
                  ★★★★★
                </div>
  
                <p className="mt-5 italic">
                  "{review.text}"
                </p>
  
                <h3 className="mt-6 font-semibold">
                  {review.name}
                </h3>
  
              </div>
  
            ))}
  
          </div>
  
        </div>
  
      </section>
    );
  }