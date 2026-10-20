export type AccountMode = "signIn" | "signUp" | "forgot" | "reset" | "account";
export type AuthFields = { email: string; password: string; confirm: string };
export type AuthErrors = Partial<Record<keyof AuthFields, string>>;

// A long passphrase is welcome; never trim or silently truncate passwords.
export const PASSWORD_MIN = 12;
export function validateAuth(mode: AccountMode, fields: AuthFields, resend = false): AuthErrors {
  const errors: AuthErrors = {};
  if (mode !== "reset" && mode !== "account") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()) || fields.email.trim().length > 254) errors.email = "Enter a valid email address.";
  }
  if (!resend && mode !== "forgot" && mode !== "account") {
    if (mode === "signIn") {
      if (!fields.password) errors.password = "Enter your password.";
    } else {
      if (fields.password.length < PASSWORD_MIN) errors.password = "Use at least 12 characters. A unique passphrase is a good choice.";
      if (fields.password.length > 128) errors.password = "Use no more than 128 characters.";
      if (fields.confirm !== fields.password) errors.confirm = "Passwords must match.";
    }
  }
  return errors;
}
