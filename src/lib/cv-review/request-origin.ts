// Next normalizes numeric loopback request URLs to localhost. Accept that single
// equivalence only when Origin also matches the actual Host header and port.
export function sameOrigin(request: Request) {
  try {
    const raw = request.headers.get("origin"); if (!raw) return false;
    const origin = new URL(raw), target = new URL(request.url);
    if (origin.origin !== raw || request.headers.get("sec-fetch-site") === "cross-site") return false;
    if (origin.origin === target.origin) return true;
    return origin.protocol === "http:" && target.protocol === "http:" && origin.port === target.port && ["127.0.0.1", "localhost"].includes(origin.hostname) && ["127.0.0.1", "localhost"].includes(target.hostname) && request.headers.get("host") === origin.host;
  } catch { return false; }
}
