// Fixed synthetic responses. Never imported by the product or provider adapter.
import { isDeepStrictEqual } from 'node:util';
export const cvLines = [
  'Fictional Alex Morgan', 'Sales assistant', 'alex@example.test',
  'SUMMARY', 'Customer-focused sales support.',
  'EXPERIENCE', 'Sales assistant, Fictional Orchard Shop | 2023–2025',
  'Helped customers choose products.', 'Supported stock records.',
  'My manager negotiated supplier contracts, not me.',
  'EDUCATION', 'Business diploma, Fictional College | 2023',
  'SKILLS', 'Customer service; record keeping.'
];
export const jd = 'Required: Help customers select products.\nRequired: Maintain accurate stock records.\nPreferred: Negotiate supplier contracts.\nPreferred: Use accounting software.';
export const instruction = 'Keep it concise. Preserve dates and attribution.';
export const scan = {
  coverage: 'Simulated Scan of the supplied fictional sales scenario. Four selected requirements; no model assessed this CV.',
  findings: [
    { title: 'Customer assistance is demonstrated', requirement: 'Help customers select products.', excerpt: 'Helped customers choose products.', explanation: 'The supplied CV directly describes customer assistance, which is relevant to the customer-facing requirement.', nextStep: 'Keep this direct customer-service evidence prominent.', group: 'supported', priority: 'important', expectation: 'required' },
    { title: 'Make your stock-record contribution clearer', requirement: 'Maintain accurate stock records.', excerpt: 'Supported stock records.', explanation: 'The CV mentions support but does not explain the applicant’s specific contribution. This is partial evidence, not proof of independent responsibility.', nextStep: 'Use clearer support wording; add detail only if you can accurately supply it.', group: 'unclear', priority: 'important', expectation: 'required' },
    { title: 'Supplier negotiation belongs to someone else', requirement: 'Negotiate supplier contracts.', excerpt: '', explanation: 'The CV explicitly says “My manager negotiated supplier contracts, not me.” This must not become the applicant’s achievement.', nextStep: 'Preserve the exclusion. Do not claim negotiation experience from the manager’s work.', group: 'not_found', priority: 'secondary', expectation: 'preferred' },
    { title: 'Accounting software is not demonstrated', requirement: 'Use accounting software.', excerpt: '', explanation: 'No accounting-software experience is shown in the supplied CV. This omission does not establish a lack of ability.', nextStep: 'Optionally self-check this preferred requirement; add experience only if accurate.', group: 'not_found', priority: 'secondary', expectation: 'preferred' }
  ]
};
export function fixtureResponse(operation, body, sources) {
  const mismatch = { error: 'This local preview uses one fixed fictional scenario. Upload the supplied PDF/DOCX and use its exact JD and documented rewrite instruction. Your inputs are kept.' };
  if (!body || !sources.includes(body.cv) || body.jd !== jd || body.consent !== true) return { status: 422, body: mismatch };
  if (operation === 'scan') return { status: 200, body: scan };
  if (body.instructions !== instruction || body.language !== 'English' || body.base !== body.cv || body.scanCV !== body.cv || body.scanJD !== jd || !isDeepStrictEqual(body.scan, scan)) return { status: 422, body: mismatch };
  const replacements = [['Helped customers choose products.', 'Assisted customers with product selection.'], ['Supported stock records.', 'Supported maintenance of stock records.']].map(([original, text]) => ({ lineId: `b${body.base.split('\n').indexOf(original) + 1}`, original, text }));
  return { status: 200, body: { replacements, changes: ['Simulated wording changes to two supplied lines; every other line is retained.'], notes: ['Fixed preview response, not an interpretation of arbitrary instructions. No skills, metrics, qualifications or experience were added. The manager’s work and all dates remain unchanged.'] } };
}
