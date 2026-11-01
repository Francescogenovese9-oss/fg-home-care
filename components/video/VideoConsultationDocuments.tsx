"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Doc = { id: string; file_name: string; created_at: string };

export default function VideoConsultationDocuments({ appointmentId }: { appointmentId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const latestRequest = useRef(0);
  const base = `/api/appointments/${appointmentId}/video/documents`;

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const response = await fetch(base, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Aggiornamento non riuscito");
      // A slower earlier request must not hide a newly uploaded document.
      if (request === latestRequest.current) {
        setDocs(data.documents ?? []);
        setSyncError("");
      }
    } catch {
      if (request === latestRequest.current) {
        setSyncError("Aggiornamento documenti temporaneamente non disponibile. Nuovo tentativo automatico in corso.");
      }
    }
  }, [base]);

  useEffect(() => {
    const requestState = latestRequest;
    const supabase = createClient();
    const refresh = () => { void load(); };
    const refreshVisible = () => { if (document.visibilityState === "visible") refresh(); };
    const channel = supabase.channel(`video-documents:${appointmentId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "video_consultation_documents",
        filter: `appointment_id=eq.${appointmentId}`,
      }, refresh)
      .subscribe(status => {
        // Reload after subscribing/reconnecting, covering uploads during connection setup.
        if (status === "SUBSCRIBED") refresh();
      });
    refresh();
    // Recover from missed events, sleeping tabs and temporary WebSocket failures.
    const timer = window.setInterval(refreshVisible, 5000);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("online", refreshVisible);
    return () => {
      ++requestState.current;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("online", refreshVisible);
      void supabase.removeChannel(channel);
    };
  }, [appointmentId, load]);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch(base, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Caricamento non riuscito");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Caricamento non riuscito");
    } finally {
      setBusy(false);
    }
  }
  return <section className="mt-6 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3 text-xl">📄</span><div><h2 className="text-lg font-bold text-slate-900">Documenti per il videoconsulto</h2><p className="text-sm text-slate-600">Condividi documenti con il professionista o il paziente di questo appuntamento.</p></div></div><p className="mt-3 text-xs text-slate-500">PDF, JPG o PNG · massimo 6 MB. Non caricare documenti non pertinenti. I file non sono pubblici.</p><div className="mt-4 flex flex-wrap items-center gap-3"><input aria-label="Documento sanitario" ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={e=>setFile(e.target.files?.[0]??null)} className="max-w-full text-sm text-slate-700"/><button type="button" disabled={!file||busy} onClick={upload} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Caricamento...":"Carica documento"}</button></div>{syncError&&<p role="status" className="mt-3 text-sm text-amber-700">{syncError}</p>}{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<div className="mt-5 space-y-2">{docs.map(d=><a key={d.id} href={base+"/"+d.id} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm text-blue-700 hover:border-blue-300"><span className="truncate">{d.file_name}</span><span className="shrink-0 font-semibold">Apri ↗</span></a>)}{!docs.length&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nessun documento caricato.</p>}</div></section>}
