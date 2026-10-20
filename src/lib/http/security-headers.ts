export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()" },
] as const;

export const PRIVATE_NO_STORE_HEADERS = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
] as const;
