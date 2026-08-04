import { z } from "zod";

export const appointmentSchema = z
  .object({
    professionalId: z
      .string()
      .uuid("Professionista non valido."),

    serviceType: z.enum([
      "HOME_VISIT",
      "VIDEO_CONSULTATION",
    ]),

    appointmentDate: z
      .string()
      .min(1, "Seleziona una data."),

    appointmentTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Seleziona un orario valido."
      ),

    durationMinutes: z.coerce
      .number()
      .int()
      .min(15, "La durata minima è 15 minuti.")
      .max(480, "La durata massima è 8 ore."),

    patientNotes: z
      .string()
      .trim()
      .max(
        2000,
        "Le note non possono superare 2.000 caratteri."
      )
      .optional(),
  })
  .superRefine((values, context) => {
    const selectedDate = new Date(
      `${values.appointmentDate}T${values.appointmentTime}:00`
    );

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate.getTime() <= Date.now()
    ) {
      context.addIssue({
        code: "custom",
        path: ["appointmentDate"],
        message:
          "La data e l’orario devono essere successivi al momento attuale.",
      });
    }
  });

export type AppointmentInput = z.input<
  typeof appointmentSchema
>;

export type AppointmentValues = z.output<
  typeof appointmentSchema
>;