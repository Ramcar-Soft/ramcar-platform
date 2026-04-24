import { z } from "zod";

const USERNAME_CHARSET = /^[a-zA-Z0-9._-]+$/;
const USERNAME_START = /^[a-zA-Z0-9]/;
const USERNAME_END = /[a-zA-Z0-9]$/;
const USERNAME_CONSECUTIVE = /[._-]{2,}/;

export const usernameSchema = z
  .string()
  .min(3, { message: "users.validation.usernameTooShort" })
  .max(30, { message: "users.validation.usernameTooLong" })
  .regex(USERNAME_CHARSET, { message: "users.validation.usernameInvalid" })
  .refine((v) => USERNAME_START.test(v), {
    message: "users.validation.usernameInvalid",
  })
  .refine((v) => USERNAME_END.test(v), {
    message: "users.validation.usernameInvalid",
  })
  .refine((v) => !USERNAME_CONSECUTIVE.test(v), {
    message: "users.validation.usernameInvalid",
  });

export const usernameOptionalSchema = z.union([z.literal(""), usernameSchema]);

/** Drops characters outside `[a-zA-Z0-9._-]`. Used by form onChange handlers. */
export function stripUsernameChars(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, "");
}
