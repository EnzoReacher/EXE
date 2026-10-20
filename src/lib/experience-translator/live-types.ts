/** Wire contracts for the separate OpenAI journey. No server configuration here. */
export type LiveSource = { id: string; text: string; label: string };
export type LiveFact = { id: string; label: string; sourceId: string; excerpt: string; start: number; end: number };
export type LiveRequirement = { id: string; label: string; excerpt: string };
export type LiveQuestion = { id: string; text: string; hint: string };
export type LiveSession = { token: string; revision: number; sources: LiveSource[]; facts: LiveFact[]; requirements: LiveRequirement[]; questions: LiveQuestion[] };
export type LiveBullet = { id: string; text: string; factIds: string[]; requirementIds: string[] };
export type PrepareRequest = { operation: "start"; consent: true; project: string; jd: string; requestId: string } | { operation: "answer"; consent: true; token: string; revision: number; answers: Record<string, string>; requestId: string } | { operation: "forget"; token: string };
export type GenerateRequest = { consent: true; token: string; revision: number; selectedFactIds: string[]; requestId: string };
