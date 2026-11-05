import { ID_TYPES } from "@/lib/format";
import { isLang } from "@/lib/i18n";

export type JoinInput = {
  name: string;
  phone: string;
  email: string;
  occupation: string;
  idType: string;
  idNumber: string;
  emergencyName: string;
  emergencyPhone: string;
  language: string;
};

export type JoinClean = {
  name: string;
  phone: string;
  email: string | null;
  occupation: string | null;
  idType: string | null;
  idNumber: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  language: string | null;
};

const digitsOf = (s: string) => s.replace(/\D/g, "");

/** Last 10 digits: so "+91 98450 11122" and "9845011122" count as the same person. */
export function phoneKey(phone: string): string {
  return digitsOf(phone).slice(-10);
}

/** Validate a public Join form. Errors are message keys so the caller can translate them. */
export function cleanJoin(
  i: JoinInput,
): { error: "errJoinName" | "errJoinPhone" | "errJoinEmail" | "errJoinId" } | { value: JoinClean } {
  const name = i.name.trim().slice(0, 80);
  if (name.length < 2) return { error: "errJoinName" };
  const phone = i.phone.trim().slice(0, 20);
  if (!/^[0-9+\-\s()]{10,20}$/.test(phone) || phoneKey(phone).length < 10) return { error: "errJoinPhone" };
  const email = i.email.trim().slice(0, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "errJoinEmail" };
  const idType = ID_TYPES.includes(i.idType as never) ? i.idType : null;
  const idNumber = i.idNumber.trim().slice(0, 40);
  if (!idNumber) return { error: "errJoinId" };
  const emergencyPhone = i.emergencyPhone.trim().slice(0, 20);
  return {
    value: {
      name,
      phone,
      email: email || null,
      occupation: i.occupation.trim().slice(0, 80) || null,
      idType,
      idNumber,
      emergencyName: i.emergencyName.trim().slice(0, 80) || null,
      emergencyPhone: emergencyPhone || null,
      language: isLang(i.language) ? i.language : null,
    },
  };
}
