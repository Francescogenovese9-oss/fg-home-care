import { z } from "zod";

const italianProvinceSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine(
    (value) => /^[A-Z]{2}$/.test(value),
    "Inserisci una provincia valida di 2 lettere."
  );

const italianPostalCodeSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9]{5}$/,
    "Inserisci un CAP valido di 5 cifre."
  );

export const appointmentSchema = z
  .object({
    professionalId: z
      .string()
      .uuid("Professionista non valido."),

    bookingSource: z
      .enum(["DIRECT", "CARE_GUIDANCE"])
      .default("DIRECT"),

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
      .min(
        15,
        "La durata minima è 15 minuti."
      )
      .max(
        480,
        "La durata massima è 8 ore."
      ),

    serviceStreetAddress: z
      .string()
      .trim()
      .max(
        200,
        "L'indirizzo non può superare 200 caratteri."
      )
      .optional()
      .or(z.literal("")),

    serviceCity: z
      .string()
      .trim()
      .max(
        100,
        "Il comune non può superare 100 caratteri."
      )
      .optional()
      .or(z.literal("")),

    serviceProvince: z
      .string()
      .trim()
      .optional()
      .or(z.literal("")),

    servicePostalCode: z
      .string()
      .trim()
      .optional()
      .or(z.literal("")),

    serviceAccessNotes: z
      .string()
      .trim()
      .max(
        500,
        "Le indicazioni di accesso non possono superare 500 caratteri."
      )
      .optional(),

    patientNotes: z
      .string()
      .trim()
      .max(
        2000,
        "Le note non possono superare 2.000 caratteri."
      )
      .optional(),
  })
  .superRefine(
    (
      values,
      context
    ) => {
      const selectedDate =
        new Date(
          `${values.appointmentDate}T${values.appointmentTime}:00`
        );

      if (
        Number.isNaN(
          selectedDate.getTime()
        ) ||
        selectedDate.getTime() <=
          Date.now()
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "appointmentDate",
          ],
          message:
            "La data e l'orario devono essere successivi al momento attuale.",
        });
      }

      if (
        values.serviceType !==
        "HOME_VISIT"
      ) {
        return;
      }

      if (
        !values.serviceStreetAddress ||
        values.serviceStreetAddress
          .trim()
          .length < 3
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "serviceStreetAddress",
          ],
          message:
            "Inserisci l'indirizzo in cui dovrà essere svolta la prestazione.",
        });
      }

      if (
        !values.serviceCity ||
        values.serviceCity
          .trim()
          .length < 2
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "serviceCity",
          ],
          message:
            "Inserisci il comune della prestazione.",
        });
      }

      if (
        !values.serviceProvince
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "serviceProvince",
          ],
          message:
            "Inserisci la provincia.",
        });
      } else {
        const provinceResult =
          italianProvinceSchema.safeParse(
            values.serviceProvince
          );

        if (
          !provinceResult.success
        ) {
          context.addIssue({
            code: "custom",
            path: [
              "serviceProvince",
            ],
            message:
              provinceResult.error
                .issues[0]
                ?.message ??
              "Provincia non valida.",
          });
        }
      }

      if (
        !values.servicePostalCode
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "servicePostalCode",
          ],
          message:
            "Inserisci il CAP.",
        });
      } else {
        const postalCodeResult =
          italianPostalCodeSchema.safeParse(
            values.servicePostalCode
          );

        if (
          !postalCodeResult.success
        ) {
          context.addIssue({
            code: "custom",
            path: [
              "servicePostalCode",
            ],
            message:
              postalCodeResult.error
                .issues[0]
                ?.message ??
              "CAP non valido.",
          });
        }
      }
    }
  )
  .transform(
    (values) => ({
      ...values,

      serviceStreetAddress:
        values.serviceType ===
        "HOME_VISIT"
          ? values.serviceStreetAddress
              ?.trim()
          : undefined,

      serviceCity:
        values.serviceType ===
        "HOME_VISIT"
          ? values.serviceCity
              ?.trim()
          : undefined,

      serviceProvince:
        values.serviceType ===
          "HOME_VISIT" &&
        values.serviceProvince
          ? values.serviceProvince
              .trim()
              .toUpperCase()
          : undefined,

      servicePostalCode:
        values.serviceType ===
        "HOME_VISIT"
          ? values.servicePostalCode
              ?.trim()
          : undefined,

      serviceAccessNotes:
        values.serviceType ===
        "HOME_VISIT"
          ? values.serviceAccessNotes
              ?.trim() ||
            undefined
          : undefined,

      patientNotes:
        values.patientNotes
          ?.trim() ||
        undefined,
    })
  );

export type AppointmentInput =
  z.input<
    typeof appointmentSchema
  >;

export type AppointmentValues =
  z.output<
    typeof appointmentSchema
  >;