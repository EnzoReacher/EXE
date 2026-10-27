import { finalDocument, isCurrent, parseDraft, record, str } from "./domain";
import { parseSnapshot } from "@/lib/scan-rewrite/saved";
import { documentText } from "@/lib/cv-templates";
export const TABLES = { profile: "ownpath_experience_profiles", version: "ownpath_cv_versions" } as const;
export function savedKind(value: unknown): keyof typeof TABLES { if (value !== "profile" && value !== "version") throw new Error("Choose a profile or version."); return value; }
export function savedId(value: unknown) { const id = str(value, 36); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)) throw new Error("Invalid saved record ID."); return id; }
export function validateSave(value: unknown) {
  const body = record(value); const kind = savedKind(body.kind); const id = savedId(body.id);
  if (record(body.payload).schemaVersion === 2) {
    if (kind !== "version") throw new Error("Save this CV as a version.");
    const snapshot = parseSnapshot(body.payload); const payload = { ...snapshot, finalDocument: snapshot.structure ? documentText(snapshot.document, snapshot.templateId, snapshot.structure) : snapshot.document };
    if (new TextEncoder().encode(JSON.stringify(payload)).length > 300000) throw new Error("This snapshot is too large.");
    return { id, kind, name: snapshot.title.trim(), payload };
  }
  const draft = parseDraft(body.payload);
  if (!draft.profile || !draft.name.trim()) throw new Error("A profile and name are required.");
  if (draft.source !== draft.profile.source) throw new Error("Create the profile again after changing its original input.");
  let final = "";
  if (kind === "version") {
    if (!isCurrent(draft.review, draft.profile, draft.jd, draft.language) || !draft.review || !draft.profile.confirmed) throw new Error("Regenerate this review after changing the profile or target job.");
    final = finalDocument(draft.profile, draft.review, draft.decisions);
    if (!final.trim()) throw new Error("The final document must not be empty.");
  } else if (draft.review || Object.keys(draft.decisions).length || draft.step !== "profile") throw new Error("Save a profile without version decisions.");
  const payload = { ...draft, finalDocument: final };
  if (new TextEncoder().encode(JSON.stringify(payload)).length > 300000) throw new Error("This saved snapshot is too large. Shorten your source or job description.");
  return { id, kind, name: draft.name.trim(), payload };
}
