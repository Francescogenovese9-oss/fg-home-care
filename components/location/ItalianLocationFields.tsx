"use client";

import { useEffect, useMemo, useState } from "react";

type Comune = { nome: string; sigla: string | null; cap: string[]; provincia: { nome: string; sigla: string | null } };
type Props = {
  province: string; city: string; postalCode?: string;
  onChange: (values: { province: string; city: string; postalCode: string }) => void;
  showPostalCode?: boolean;
};
let cached: Comune[] | null = null;
let loading: Promise<Comune[]> | null = null;
function loadComuni() {
  if (cached) return Promise.resolve(cached);
  if (!loading) loading = fetch("https://cdn.jsdelivr.net/gh/RP92/comuni-italiani/data/comuni.json")
    .then(async (r) => { if (!r.ok) throw new Error("Archivio non disponibile"); return (await r.json()) as Comune[]; })
    .then((rows) => { cached = rows.filter((c) => c.nome && c.sigla); return cached; })
    .catch((error) => { loading = null; throw error; });
  return loading;
}
const selectClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100";

export default function ItalianLocationFields({ province, city, postalCode = "", onChange, showPostalCode = true }: Props) {
  const [comuni, setComuni] = useState<Comune[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    loadComuni().then((rows) => { if (active) setComuni(rows); }).catch(() => {
      if (active) setError("Impossibile caricare l'elenco dei comuni. Ricarica la pagina.");
    });
    return () => { active = false; };
  }, []);
  const provinces = useMemo(() => Array.from(new Map(comuni.map((c) => [c.sigla, { code: c.sigla!, name: c.provincia.nome }])).values())
    .sort((a, b) => a.name.localeCompare(b.name, "it")), [comuni]);
  const cities = useMemo(() => comuni.filter((c) => c.sigla === province).sort((a, b) => a.nome.localeCompare(b.nome, "it")), [comuni, province]);
  const selected = cities.find((c) => c.nome === city);
  const caps = selected?.cap ?? [];
  return (
    <div className={showPostalCode ? "grid gap-4 md:grid-cols-3" : "grid gap-4 md:grid-cols-2"}>
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="location-province">Provincia</label>
        <select id="location-province" className={selectClass} value={province} disabled={!comuni.length}
          onChange={(e) => onChange({ province: e.target.value, city: "", postalCode: "" })}>
          <option value="">Seleziona provincia</option>
          {provinces.map((p) => <option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="location-city">Comune</label>
        <select id="location-city" className={selectClass} value={city} disabled={!province || !comuni.length}
          onChange={(e) => {
            const found = cities.find((c) => c.nome === e.target.value);
            onChange({ province, city: e.target.value, postalCode: found?.cap.length === 1 ? found.cap[0] : "" });
          }}>
          <option value="">Seleziona comune</option>
          {cities.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
        </select>
      </div>
      {showPostalCode && <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="location-cap">CAP</label>
        <select id="location-cap" className={selectClass} value={postalCode} disabled={!selected || !caps.length}
          onChange={(e) => onChange({ province, city, postalCode: e.target.value })}>
          <option value="">{caps.length ? "Seleziona CAP" : "CAP non disponibile"}</option>
          {caps.map((cap) => <option key={cap} value={cap}>{cap}</option>)}
        </select>
        {selected && !caps.length && <p className="text-xs text-amber-700">CAP non disponibile nell'archivio: contatta l'assistenza.</p>}
      </div>}
      {error && <p role="alert" className="text-sm text-red-600 md:col-span-3">{error}</p>}
    </div>
  );
}
