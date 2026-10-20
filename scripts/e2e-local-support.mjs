import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

export function loopbackOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("LOOPBACK_URL_REQUIRED");
  return url.origin;
}
export function publicKeyOnly(key) {
  if (typeof key !== "string") throw new Error("PUBLIC_KEY_REQUIRED");
  if (key.startsWith("sb_publishable_")) return key;
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
    if (payload.role === "anon") return key;
  } catch { /* No values or decoder errors escape. */ }
  throw new Error("PUBLIC_KEY_REQUIRED");
}
export function publicLocalSettings(settings) {
  const allowed = new Set(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SITE_URL"]);
  if (Object.keys(settings).some((key) => !allowed.has(key))) throw new Error("ONLY_PUBLIC_LOCAL_SETTINGS_ALLOWED");
  const supabase = loopbackOrigin(settings.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const key = publicKeyOnly(settings.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const siteUrl = loopbackOrigin(settings.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000");
  return { supabase, key, siteUrl };
}
export function localFetch(origins) {
  return (input, init) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (!origins.includes(url.origin)) throw new Error("NON_LOCAL_NETWORK_BLOCKED");
    return fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15000), redirect: "error" });
  };
}
function admin(sql) {
  try {
    // Existing local test-administration method. Fixture SQL only; this never
    // starts/stops/resets/configures any container or Supabase instance.
    return execFileSync("docker", ["exec", "-i", "supabase_db_EXE", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A"],
      { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 15000 }).trim();
  } catch { throw new Error("LOCAL_FIXTURE_ADMIN_UNAVAILABLE"); }
}
export async function provisionFixtures(url, key) {
  loopbackOrigin(url); publicKeyOnly(key);
  admin("select 1;");
  const run = "m13-auth-" + randomUUID();
  const authCandidate = { email: run + "-signup@example.invalid", password: "Synthetic-only-" + randomUUID() };
  const actors = [];
  const cleanup = async () => {
    let failed = false;
    for (const actor of actors) {
      for (const [table, kind] of [["credential_documents", "credential"], ["portfolio_documents", "portfolio"]]) {
        const docs = await actor.client.from(table).select("id").eq("owner_id", actor.id);
        if (docs.error) failed = true;
        for (const doc of docs.data ?? []) {
          const result = await actor.client.rpc("m11a_withdraw_document", { p_kind: kind, p_document: doc.id });
          if (result.error) failed = true;
        }
      }
      for (const bucket of ["cv-private", "credential-private", "portfolio-private"]) {
        // These accounts did not exist before this run. Only their own prefixes
        // are listed; includes upload objects orphaned before metadata registration.
        const list = await actor.client.storage.from(bucket).list(actor.id, { limit: 1000 });
        if (list.error) { failed = true; continue; }
        const paths = (list.data ?? []).filter((object) => object.id).map((object) => `${actor.id}/${object.name}`);
        if (paths.length) {
          const removed = await actor.client.storage.from(bucket).remove(paths);
          if (removed.error) failed = true;
        }
        const remaining = await actor.client.storage.from(bucket).list(actor.id, { limit: 1000 });
        if (remaining.error || remaining.data?.some((object) => object.id)) failed = true;
      }
    }
    // Owners first: cascading their fixture claims releases expert profile FKs.
    for (const actor of actors) {
      try {
        admin(`delete from auth.users where id='${actor.id}' and email='${actor.email}';`);
        if (admin(`select count(*) from auth.users where id='${actor.id}';`) !== "0") failed = true;
      }
      catch { failed = true; }
    }
    try {
      admin("delete from auth.users where email='" + authCandidate.email + "' and email like 'm13-auth-%@example.invalid';");
      if (admin("select count(*) from auth.users where email='" + authCandidate.email + "' and email like 'm13-auth-%@example.invalid';") !== "0") failed = true;
    } catch { failed = true; }
    if (failed) throw new Error("FIXTURE_CLEANUP_FAILED");
  };
  try {
    if (admin("select count(*) from auth.users where email='" + authCandidate.email + "' and email like 'm13-auth-%@example.invalid';") !== "0") throw new Error("AUTH_CANDIDATE_ADDRESS_COLLISION");
    for (const label of ["owner", "expert", "ordinary", "unassigned"]) {
      const email = `${run}-${label}@example.invalid`;
      const password = `Synthetic-only-${randomUUID()}`;
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: localFetch([url]) } });
      const result = await client.auth.signUp({ email, password });
      if (result.data.user) {
        const id = result.data.user.id;
        if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("FIXTURE_ACCOUNT_ID_INVALID");
        actors.push({ id, email, password, label, client });
      }
      if (result.error || !result.data.session || !result.data.user) throw new Error("LOCAL_SIGNUP_SESSION_REQUIRED");
    }
    for (const actor of actors.filter((item) => ["expert", "unassigned"].includes(item.label))) {
      actor.profile = randomUUID();
      actor.name = `Synthetic browser ${actor.label} ${run.slice(-8)}`;
      admin(`insert into public.team_expert_profiles(id,reviewer_id,display_name,active,approval_status,approved_at) values ('${actor.profile}','${actor.id}','${actor.name}',true,'approved',now());`);
    }
    return { fixtures: { run, actors: actors.map((actor) => ({ id: actor.id, email: actor.email, password: actor.password, label: actor.label, profile: actor.profile, name: actor.name })), authCandidate }, cleanup };
  } catch (error) { await cleanup(); throw error; }
}
