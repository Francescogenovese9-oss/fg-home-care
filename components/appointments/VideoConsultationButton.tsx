"use client";

import { useRouter } from "next/navigation";

type Props = {
  appointmentId: string;
};

export default function VideoConsultationButton({
  appointmentId,
}: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() =>
        router.push(
          `/dashboard/appointments/${appointmentId}/video`
        )
      }
      className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
    >
      Partecipa al videoconsulto
    </button>
  );
}
