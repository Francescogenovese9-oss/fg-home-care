import { z } from "zod";

export const unavailabilitySchema = z
  .object({
    unavailableDate: z
      .string()
      .min(1, "Seleziona una data."),

    allDay: z.boolean(),

    startTime: z.string().optional(),
    endTime: z.string().optional(),

    reason: z
      .string()
      .trim()
      .max(
        500,
        "La motivazione non può superare 500 caratteri."
      )
      .optional(),
  })
  .superRefine((values, context) => {
    const selectedDate = new Date(
      `${values.unavailableDate}T12:00:00`
    );

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate.getTime() <
        new Date().setHours(0, 0, 0, 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["unavailableDate"],
        message:
          "La data non può essere precedente a oggi.",
      });
    }

    if (!values.allDay) {
      if (!values.startTime) {
        context.addIssue({
          code: "custom",
          path: ["startTime"],
          message: "Inserisci l’orario iniziale.",
        });
      }

      if (!values.endTime) {
        context.addIssue({
          code: "custom",
          path: ["endTime"],
          message: "Inserisci l’orario finale.",
        });
      }

      if (
        values.startTime &&
        values.endTime &&
        values.startTime >= values.endTime
      ) {
        context.addIssue({
          code: "custom",
          path: ["endTime"],
          message:
            "L’orario finale deve essere successivo a quello iniziale.",
        });
      }
    }
  });

export type UnavailabilityValues = z.infer<
  typeof unavailabilitySchema
>;