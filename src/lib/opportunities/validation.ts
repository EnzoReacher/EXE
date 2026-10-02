import { OPPORTUNITY_STATUSES, type OpportunityStatus } from "./types";

export const MAX_OPPORTUNITY_URL_LENGTH = 2048;
export const MAX_OPPORTUNITY_COMPANY_LENGTH = 120;
export const MAX_OPPORTUNITY_NOTE_LENGTH = 1000;

function optionalText(value: unknown, maximum: number, label: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`Enter a valid ${label}.`);
  const text = value.trim();
  if (!text || text.length > maximum) throw new Error(`Keep ${label} to ${maximum} characters or fewer.`);
  return text;
}

export function validateOpportunityUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > MAX_OPPORTUNITY_URL_LENGTH) throw new Error("Enter an HTTPS job link of 2,048 characters or fewer.");
  let parsed: URL;
  try { parsed = new URL(value.trim()); } catch { throw new Error("Enter a valid HTTPS job link."); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("Use an HTTPS job link without embedded sign-in details.");
  return parsed.toString();
}

export function isOpportunityStatus(value: unknown): value is OpportunityStatus { return typeof value === "string" && (OPPORTUNITY_STATUSES as readonly string[]).includes(value); }

export function validateOpportunityCreate(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Enter a valid private opportunity.");
  const value = input as Record<string, unknown>;
  if (typeof value.targetJobId !== "string" || !value.targetJobId) throw new Error("Choose one of your saved target jobs.");
  if (!isOpportunityStatus(value.status)) throw new Error("Choose a valid private status.");
  return { targetJobId: value.targetJobId, sourceUrl: validateOpportunityUrl(value.sourceUrl), companyName: optionalText(value.companyName, MAX_OPPORTUNITY_COMPANY_LENGTH, "company name"), note: optionalText(value.note, MAX_OPPORTUNITY_NOTE_LENGTH, "note"), status: value.status };
}

export function validateOpportunityUpdate(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Enter a valid private opportunity update.");
  const value = input as Record<string, unknown>;
  if (!isOpportunityStatus(value.status)) throw new Error("Choose a valid private status.");
  return { status: value.status, companyName: optionalText(value.companyName, MAX_OPPORTUNITY_COMPANY_LENGTH, "company name"), note: optionalText(value.note, MAX_OPPORTUNITY_NOTE_LENGTH, "note") };
}
