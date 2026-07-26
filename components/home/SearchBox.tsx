export default function SearchBox() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mt-10 max-w-5xl">

      <div className="grid md:grid-cols-3 gap-4">

        <select className="border rounded-xl p-4">
          <option>Infermiere</option>
          <option>OSS</option>
          <option>Medico</option>
          <option>Fisioterapista</option>
          <option>Badante</option>
          
        </select>

        <input
          type="text"
          placeholder="Inserisci città o CAP"
          className="border rounded-xl p-4"
        />

        <button className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl p-4 font-semibold">
          Cerca
        </button>

      </div>

    </div>
  );
}