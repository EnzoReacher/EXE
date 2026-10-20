import { createSupabaseServerClient } from "@/lib/supabase/server";
import { boundedText } from "@/lib/experience-translator/server/openai";
import { TABLES, savedId, savedKind, validateSave } from "@/lib/cv-review/persistence";
import { record } from "@/lib/cv-review/domain";
import { sameOrigin } from "@/lib/cv-review/request-origin";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
async function auth() {
  try { const db = await createSupabaseServerClient(); const { data, error } = await db.auth.getUser(); if (error || !data.user) return null; return { db, user: data.user }; } catch { return null; }
}
async function body(request: Request) {
  if (!sameOrigin(request)) throw new Error("Use this page to save your work.");
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") throw new Error("Send JSON content.");
  return JSON.parse(await boundedText(new Response(request.body), 350000, AbortSignal.any([request.signal, AbortSignal.timeout(5000)])));
}
const signIn = () => Response.json({ error: "Sign in to save or open your profiles and CV versions. Your current draft is kept." }, { status: 401, headers });
const unavailable = () => Response.json({ error: "Saved work is unavailable. The owner may need to apply the CV profile/version migration. Your draft is kept; retry after setup." }, { status: 503, headers });
export async function GET(request: Request) {
  const session = await auth(); if (!session) return signIn();
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    try { savedId(id); } catch { return Response.json({ error: "Invalid version ID." }, { status: 400, headers }); }
    const { data, error } = await session.db.from(TABLES.version).select("id,name,payload,revision,created_at,updated_at").eq("id", id).eq("owner_id", session.user.id).maybeSingle();
    if (error) return databaseError(error.code);
    if (!data) return Response.json({ error: "This version was not found in your account." }, { status: 404, headers });
    return Response.json({ version: data }, { headers });
  }
  const results = await Promise.all(Object.values(TABLES).map(table => session.db.from(table).select("id,name,payload,revision,created_at,updated_at").eq("owner_id", session.user.id).order("created_at", { ascending: false }).limit(50)));
  if (results.some(r => r.error)) return databaseError(results.find(r => r.error)?.error?.code);
  return Response.json({ profiles: results[0].data, versions: results[1].data }, { headers });
}
function databaseError(code?: string) { return ["42P01", "PGRST205", "42703", "PGRST204"].includes(code || "") ? unavailable() : Response.json({ error: "Saved work could not be retrieved right now. Check your connection and retry; your draft is kept." }, { status: 503, headers }); }
export async function PATCH(request: Request) {
  const session = await auth(); if (!session) return signIn();
  try {
    const raw = record(await body(request)); const input = validateSave(raw);
    if (input.kind !== "version" || !Number.isSafeInteger(raw.revision) || Number(raw.revision) < 1) throw new Error("Invalid update.");
    const next = Number(raw.revision) + 1;
    const { data, error } = await session.db.from(TABLES.version).update({ name: input.name, payload: input.payload, revision: next, updated_at: new Date().toISOString() }).eq("id", input.id).eq("owner_id", session.user.id).eq("revision", raw.revision).select("id").maybeSingle();
    if (error) return databaseError(error.code);
    if (!data) return Response.json({ error: "This version changed or is unavailable. Reopen it before saving again. Your edits remain here." }, { status: 409, headers });
    return Response.json({ saved: true, revision: next }, { headers });
  } catch { return Response.json({ error: "Invalid update. Your edits are kept." }, { status: 400, headers }); }
}
export async function POST(request: Request) {
  const session = await auth(); if (!session) return signIn();
  let input: ReturnType<typeof validateSave>;
  try { input = validateSave(await body(request)); } catch { return Response.json({ error: "This snapshot could not be saved: invalid or oversized content. Your draft is kept." }, { status: 400, headers }); }
  const table = TABLES[input.kind];
  // Immutable insert, with ID-based retry deduplication. Never upsert an owner's snapshot.
  const row = { id: input.id, owner_id: session.user.id, name: input.name, payload: input.payload };
  const { error } = await session.db.from(table).insert(row);
  if (error) {
    if (error.code !== "23505") return unavailable();
    const { data, error: existingError } = await session.db.from(table).select("id,payload,name").eq("id", input.id).eq("owner_id", session.user.id).maybeSingle();
    if (existingError || !data || data.name !== input.name || JSON.stringify(data.payload) !== JSON.stringify(input.payload)) {
      // PostgreSQL JSONB reorders keys; compare structurally below for an owned retry.
      if (!data || existingError || data.name !== input.name || canonical(data.payload) !== canonical(input.payload)) return Response.json({ error: "This save ID is unavailable. Retry with a new snapshot; your draft is kept." }, { status: 409, headers });
    }
  }
  return Response.json({ id: input.id, saved: true }, { headers });
}
function canonical(value: unknown): string { if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`; return JSON.stringify(value); }
export async function DELETE(request: Request) {
  const session = await auth(); if (!session) return signIn();
  try { const input = record(await body(request)); const id = savedId(input.id); const kind = savedKind(input.kind); const { error } = await session.db.from(TABLES[kind]).delete().eq("id", id).eq("owner_id", session.user.id); if (error) return unavailable(); return Response.json({ deleted: true }, { headers }); }
  catch { return Response.json({ error: "Could not validate this deletion. Your draft is kept." }, { status: 400, headers }); }
}
