import { z } from "zod";

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "Inserisci almeno 2 caratteri."),

    lastName: z
      .string()
      .trim()
      .min(2, "Inserisci almeno 2 caratteri."),

    email: z
      .string()
      .trim()
      .email("Inserisci un indirizzo email valido."),

    password: z
      .string()
      .min(8, "La password deve contenere almeno 8 caratteri."),

    confirmPassword: z.string(),

    role: z.enum(["PATIENT", "PROFESSIONAL"]),

    profession: z.string().optional(),
    registrationNumber: z.string().optional(),
    vatNumber: z.string().optional(),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Le password non coincidono.",
      });
    }

    if (
      data.role === "PROFESSIONAL" &&
      (!data.profession || data.profession.trim().length < 2)
    ) {
      context.addIssue({
        code: "custom",
        path: ["profession"],
        message: "Seleziona o inserisci la tua professione.",
      });
    }
  });

export type RegisterValues = z.infer<typeof registerSchema>;