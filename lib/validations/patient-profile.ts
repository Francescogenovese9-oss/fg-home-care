import { z } from "zod";

export const patientProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "Inserisci almeno 2 caratteri.")
    .max(80, "Il nome è troppo lungo."),

  lastName: z
    .string()
    .trim()
    .min(2, "Inserisci almeno 2 caratteri.")
    .max(80, "Il cognome è troppo lungo."),

  city: z
    .string()
    .trim()
    .min(2, "Inserisci la tua citta.")
    .max(100, "La citta è troppo lunga."),

  province: z
    .string()
    .trim()
    .min(2, "Inserisci la tua provincia.")
    .max(100, "La provincia è troppo lunga."),
});

export type PatientProfileValues = z.infer<
  typeof patientProfileSchema
>;
