import { z } from "zod";

export const professionalProfileSchema = z.object({
  profession: z
    .string()
    .trim()
    .min(2, "Inserisci la professione."),

  specialization: z
    .string()
    .trim()
    .optional(),

  registrationNumber: z
    .string()
    .trim()
    .optional(),

  vatNumber: z
    .string()
    .trim()
    .optional(),

  bio: z
    .string()
    .trim()
    .max(1500, "La descrizione non può superare 1.500 caratteri.")
    .optional(),

  city: z
    .string()
    .trim()
    .min(2, "Inserisci la città."),

  province: z
    .string()
    .trim()
    .min(2, "Inserisci la provincia."),

  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Inserisci un CAP italiano valido."),

  serviceRadiusKm: z.coerce
    .number()
    .int()
    .min(1, "Il raggio minimo è 1 km.")
    .max(200, "Il raggio massimo è 200 km."),

  hourlyRate: z.coerce
    .number()
    .min(0, "La tariffa non può essere negativa."),

  availableWeekdays: z
    .array(z.string())
    .min(1, "Seleziona almeno un giorno."),

  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),

  homeVisits: z.boolean(),
  videoConsultations: z.boolean(),
});

export type ProfessionalProfileInput = z.input<
  typeof professionalProfileSchema
>;

export type ProfessionalProfileValues = z.output<
  typeof professionalProfileSchema
>;