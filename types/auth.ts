export type UserRole = "PATIENT" | "PROFESSIONAL" | "ADMIN";

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;

  profession?: string;
  registrationNumber?: string;
  vatNumber?: string;
}