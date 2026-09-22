type CreateWherebyRoomInput = {
  startDate: Date;
  endDate: Date;
};

type WherebyRoomResponse = {
  roomUrl: string;
  meetingId?: string;
  hostRoomUrl?: string;
};

export async function createWherebyRoom({
  startDate,
  endDate,
}: CreateWherebyRoomInput) {
  const apiKey = process.env.WHEREBY_API_KEY;

  if (!apiKey) {
    throw new Error("WHEREBY_API_KEY non configurata.");
  }

  const response = await fetch(
    "https://api.whereby.dev/v1/meetings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endDate: endDate.toISOString(),
        roomMode: "normal",
        isLocked: true,
        fields: ["hostRoomUrl"],
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "Errore creazione stanza Whereby:",
      response.status,
      errorText
    );

    throw new Error(
      "Impossibile creare il videoconsulto."
    );
  }

  const data =
    (await response.json()) as WherebyRoomResponse;

  if (!data.roomUrl) {
    throw new Error(
      "Whereby non ha restituito la stanza."
    );
  }

  return {
    roomUrl: data.roomUrl,
    hostRoomUrl: data.hostRoomUrl ?? null,
    meetingId: data.meetingId ?? null,
  };
}
