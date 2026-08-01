"use client";

import { Stethoscope, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "PATIENT" | "PROFESSIONAL";

interface RoleSelectorProps {
  value: Role;
  onChange: (role: Role) => void;
}

const roles = [
  {
    value: "PATIENT" as const,
    title: "Sono un paziente",
    description: "Cerco assistenza sanitaria o domiciliare.",
    icon: UserRound,
  },
  {
    value: "PROFESSIONAL" as const,
    title: "Sono un professionista",
    description: "Voglio offrire i miei servizi sulla piattaforma.",
    icon: Stethoscope,
  },
];

export default function RoleSelector({
  value,
  onChange,
}: RoleSelectorProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {roles.map((role) => {
        const Icon = role.icon;
        const selected = value === role.value;

        return (
          <button
            key={role.value}
            type="button"
            onClick={() => onChange(role.value)}
            className={cn(
              "rounded-2xl border-2 p-5 text-left transition",
              "hover:border-blue-400 hover:bg-blue-50",
              selected
                ? "border-blue-700 bg-blue-50"
                : "border-slate-200 bg-white"
            )}
          >
            <Icon className="mb-4 h-8 w-8 text-blue-700" />

            <h3 className="font-semibold text-slate-900">
              {role.title}
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              {role.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}