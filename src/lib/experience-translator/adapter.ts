import { composeBullets, TranslatorError, validateBulletOutput } from "./engine";
import type { PreparedSession, TranslatorAdapter } from "./types";

export const deterministicTranslator: TranslatorAdapter = {
  name: "local-template-prototype",
  async generate(session, signal) {
    if (signal.aborted) throw new TranslatorError("Generation was cancelled. Try again.");
    return { bullets: composeBullets(session) };
  },
};

export async function generateBullets(session: PreparedSession, adapter = deterministicTranslator, options = { timeoutMs: 3000, retries: 1 }) {
  // Provider input cannot mutate the trusted facts used by output verification.
  const trusted = structuredClone(session);
  function freeze<T>(value: T): T {
    if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  const attempts = Math.min(2, Math.max(1, options.retries + 1));
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const output = await Promise.race([
        adapter.generate(freeze(structuredClone(trusted)), controller.signal),
        new Promise<never>((_, reject) => { timer = setTimeout(() => { reject(new TranslatorError("Generation timed out. Your inputs and edits are kept; try again.")); controller.abort(); }, Math.min(10000, Math.max(1, options.timeoutMs))); }),
      ]);
      return validateBulletOutput(output, trusted);
    } catch (error) {
      if (!controller.signal.aborted || attempt + 1 === attempts) throw error instanceof TranslatorError ? error : new TranslatorError();
    } finally { if (timer) clearTimeout(timer); controller.abort(); }
  }
  throw new TranslatorError();
}
