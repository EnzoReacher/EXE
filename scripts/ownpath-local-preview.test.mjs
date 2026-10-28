import { expect, it } from 'vitest';
import { fixtureResponse, cvLines, jd, instruction, scan } from '../e2e/owner-preview/scenario.mjs';
import { parseScan, parseRewrite, completeCV } from '../src/lib/scan-rewrite/domain.ts';
const sources = [cvLines.join('\n'), cvLines.join('\n\n')];
it.each(sources)('fixed scenario passes the real runtime contracts and preserves attribution/dates/sections', cv => {
  const body = { cv, jd, consent: true };
  const result = fixtureResponse('scan', body, sources); expect(result.status).toBe(200);
  const checked = parseScan(result.body, { cv, jd }); expect(checked.findings.map(f => f.group)).toEqual(['supported', 'unclear', 'not_found', 'not_found']);
  const rewrite = fixtureResponse('rewrite', { ...body, base: cv, scan: checked, scanCV: cv, scanJD: jd, instructions: instruction, language: 'English' }, sources); expect(rewrite.status).toBe(200);
  const output = completeCV(cv, parseRewrite(rewrite.body, cv));
  expect(output).toBe(cv.replace('Helped customers choose products.', 'Assisted customers with product selection.').replace('Supported stock records.', 'Supported maintenance of stock records.'));
  expect(output).toContain('My manager negotiated supplier contracts, not me.'); expect(output).toContain('2023–2025'); expect(output.split('\n').length).toBe(cv.split('\n').length);
});
it.each([{ cv: 'Arbitrary applicant CV' }, { jd: 'Unrelated target JD' }, { consent: false }])('input mismatch never receives canned success', change => expect(fixtureResponse('scan', { cv: sources[0], jd, consent: true, ...change }, sources).status).toBe(422));
it.each([{ instructions: 'Make me senior' }, { base: sources[0] + '\nManual edit' }, { scan: null }, { language: 'Vietnamese' }])('does not pretend to understand a different rewrite request', change => {
  const body = { cv: sources[0], base: sources[0], jd, consent: true, scan, scanCV: sources[0], scanJD: jd, instructions: instruction, language: 'English', ...change };
  expect(fixtureResponse('rewrite', body, sources).status).toBe(422);
});
