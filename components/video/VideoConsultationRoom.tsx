"use client";

import { useEffect, useState } from "react";

type Props = {
  appointmentId: string;
};

export default function VideoConsultationRoom({
  appointmentId,
}: Props) {
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
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

  if (!roomUrl) {
    return (
      <div className="flex min-h-[500px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-center text-sm font-medium text-slate-600">
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-black shadow-sm">
      <iframe
        src={roomUrl}
        title="Videoconsulto FG Home Care"
        allow="camera; microphone; fullscreen; display-capture"
        className="h-[75vh] min-h-[600px] w-full border-0"
      />
    </div>
  );
}
