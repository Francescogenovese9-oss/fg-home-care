"use client";

import { useEffect, useState } from "react";

type Props = {
  appointmentId: string;
};

export default function VideoConsultationRoom({
  appointmentId,
}: Props) {
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [ended,setEnded]=useState(false);
  const [ending,setEnding]=useState(false);
  const [message, setMessage] = useState("Preparazione del videoconsulto...");

  useEffect(() => {
    let active = true;

    async function loadRoom() {
      try {
        const response = await fetch(
          `/api/appointments/${appointmentId}/video`,
          {
            method: "POST",
          }
        );

        const data = await response.json();

        if (!active) {
          return;
        }

        if (!response.ok) {
          setMessage(
            data.message ??
              "Videoconsulto non disponibile."
          );
          return;
        }

        if (!data.roomUrl) {
          setMessage(
            "Impossibile aprire il videoconsulto."
          );
          return;
        }

        setRoomUrl(data.roomUrl);
      } catch (error) {
        console.error(
          "Errore caricamento videoconsulto:",
          error
        );

        if (active) {
          setMessage(
            "Impossibile aprire il videoconsulto."
          );
        }
      }
    }

    loadRoom();

    return () => {
      active = false;
    };
  }, [appointmentId]);

  async function endConsultation(){
    if(ending)return;
    setEnding(true);
    try{
      const response=await fetch(`/api/appointments/${appointmentId}/video/documents`,{method:"DELETE"});
      if(!response.ok)throw new Error("Cancellazione dei documenti non riuscita. Riprova.");
      setRoomUrl(null);setEnded(true);setMessage("Videoconsulto chiuso. I documenti caricati sono stati eliminati.");
    }catch(error){setMessage(error instanceof Error?error.message:"Impossibile chiudere il videoconsulto.");}
    finally{setEnding(false);}
  }
  if (!roomUrl) {
    return (
      <div className="flex min-h-[500px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-center text-sm font-medium text-slate-600">
          {ended?message:message}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-black shadow-sm">
      <div className="flex items-center justify-between gap-3 bg-slate-900 px-5 py-3 text-white"><span className="text-sm">I documenti sanitari vengono eliminati alla chiusura del videoconsulto.</span><button type="button" disabled={ending} onClick={endConsultation} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold disabled:opacity-60">{ending?"Chiusura...":"Termina videoconsulto"}</button></div>
      <iframe
        src={roomUrl}
        title="Videoconsulto FG Home Care"
        allow="camera; microphone; fullscreen; display-capture"
        className="h-[75vh] min-h-[600px] w-full border-0"
      />
    </div>
  );
}
