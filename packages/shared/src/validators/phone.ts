import { z } from "zod";
import { parsePhoneNumber } from "libphonenumber-js/min";

/**
 * Attempts to parse `input` as a phone number (MX default, or international with `+`).
 * Returns the E.164 representation (e.g., `+525551234567`) when valid, otherwise `null`.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  try {
    const parsed = parsePhoneNumber(trimmed, "MX");
    if (!parsed || !parsed.isValid()) return null;
    return parsed.number;
  } catch {
    return null;
  }
}

export const phoneSchema = z
  .string()
  .transform((value, ctx) => {
    const normalized = normalizePhone(value);
    if (normalized === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "forms.phoneInvalid",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const phoneOptionalSchema = z.union([z.literal(""), phoneSchema]);
