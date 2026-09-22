import "server-only";

export type CancellationPolicyResult = {
  hoursUntilAppointment: number;
  refundPercent: number;
  refundAllowed: boolean;
  policyLabel: string;
};

const APPOINTMENT_TIME_ZONE =
  "Europe/Rome";

function getTimeZoneOffsetMilliseconds(
  date: Date,
  timeZone: string
): number {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }
    );

  const parts =
    formatter.formatToParts(
      date
    );

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (
      part.type !==
      "literal"
    ) {
      values[part.type] =
        part.value;
    }
  }

  const asUtc =
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second)
    );

  return (
    asUtc -
    date.getTime()
  );
}

export function parseRomeDateTime(
  appointmentDate: string,
  appointmentTime: string
): Date {
  /*
   * appointment_date e appointment_time nel DB
   * rappresentano l'orario locale italiano.
   *
   * Non utilizziamo:
   *
   * new Date(`${date}T${time}`)
   *
   * perché il risultto dipenderebbe dal timezone
   * del server.
   */

  const dateMatch =
    appointmentDate.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  const timeMatch =
    appointmentTime.match(
      /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/
    );

  if (
    !dateMatch ||
    !timeMatch
  ) {
    throw new Error(
      "Data o orario appuntamento non validi."
    );
  }

  const year =
    Number(dateMatch[1]);

  const month =
    Number(dateMatch[2]);

  const day =
    Number(dateMatch[3]);

  const hour =
    Number(timeMatch[1]);

  const minute =
    Number(timeMatch[2]);

  const second =
    Number(
      timeMatch[3] ?? "0"
    );

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    throw new Error(
      "Data o orario appuntamento non validi."
    );
  }

  /*
   * Creiamo inizialmente una rappresentazione UTC
   * con gli stessi componenti numerici.
   *
   * Serve esclusivamente come punto di partenza
   * per calcolare l'offset Europe/Rome.
   */
  const localComponentsAsUtc =
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second
    );

  const validationDate =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    validationDate.getUTCFullYear() !==
      year ||
    validationDate.getUTCMonth() !==
      month - 1 ||
    validationDate.getUTCDate() !==
      day
  ) {
    throw new Error(
      "Data o orario appuntamento non validi."
    );
  }

  /*
   * Primo calcolo dell'offset.
   */
  let offset =
    getTimeZoneOffsetMilliseconds(
      new Date(
        localComponentsAsUtc
      ),
      APPOINTMENT_TIME_ZONE
    );

  let timestamp =
    localComponentsAsUtc -
    offset;

  /*
   * Secondo passaggio necessario vicino ai cambi
   * CET/CEST: l'offset corretto dipende
   * dall'istante UTC risultante.
   */
  const correctedOffset =
    getTimeZoneOffsetMilliseconds(
      new Date(timestamp),
      APPOINTMENT_TIME_ZONE
    );

  if (
    correctedOffset !== offset
  ) {
    offset =
      correctedOffset;

    timestamp =
      localComponentsAsUtc -
      offset;
  }

  const result =
    new Date(timestamp);

  if (
    Number.isNaN(
      result.getTime()
    )
  ) {
    throw new Error(
      "Data o orario appuntamento non validi."
    );
  }

  /*
   * Verifica finale.
   *
   * Impedisce di accettare orari locali inesistenti,
   * per esempio durante il passaggio all'ora legale.
   */
  const verificationFormatter =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          APPOINTMENT_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }
    );

  const verificationParts =
    verificationFormatter.formatToParts(
      result
    );

  const verificationValues: Record<
    string,
    string
  > = {};

  for (
    const part of
    verificationParts
  ) {
    if (
      part.type !==
      "literal"
    ) {
      verificationValues[
        part.type
      ] = part.value;
    }
  }

  if (
    Number(
      verificationValues.year
    ) !== year ||
    Number(
      verificationValues.month
    ) !== month ||
    Number(
      verificationValues.day
    ) !== day ||
    Number(
      verificationValues.hour
    ) !== hour ||
    Number(
      verificationValues.minute
    ) !== minute ||
    Number(
      verificationValues.second
    ) !== second
  ) {
    throw new Error(
      "Data o orario appuntamento non validi nel fuso orario Europe/Rome."
    );
  }

  return result;
}

export function calculateCancellationPolicy({
  appointmentDate,
  appointmentTime,
  now = new Date(),
}: {
  appointmentDate: string;
  appointmentTime: string;
  now?: Date;
}): CancellationPolicyResult {
  const appointmentDateTime =
    parseRomeDateTime(
      appointmentDate,
      appointmentTime
    );

  const millisecondsDifference =
    appointmentDateTime.getTime() -
    now.getTime();

  const hoursUntilAppointment =
    millisecondsDifference /
    (1000 * 60 * 60);

  /*
   * Appuntamento già iniziato/passato.
   */
  if (
    hoursUntilAppointment <= 0
  ) {
   return {
      hoursUntilAppointment,
      refundPercent: 0,
      refundAllowed: false,
      policyLabel:
        "L'appuntamento è già iniziato o trascorso.",
    };
  }

  /*
   * Almeno 24 ore.
   */
  if (
    hoursUntilAppointment >= 24
  ) {
    return {
      hoursUntilAppointment,
      refundPercent: 100,
      refundAllowed: true,
      policyLabel:
        "Rimborso completo.",
    };
  }

  /*
   * Tra 12 e 24 ore.
   */
  if (
    hoursUntilAppointment >= 12
  ) {
    return {
      hoursUntilAppointment,
      refundPercent: 50,
      refundAllowed: true,
      policyLabel:
        "Rimborso del 50%.",
    };
  }

  /*
   * Meno di 12 ore.
   */
  return {
    hoursUntilAppointment,
    refundPercent: 0,
    refundAllowed: false,
    policyLabel:
      "Nessun rimborso previsto a meno di 12 ore dall'appuntamento.",
  };
}
