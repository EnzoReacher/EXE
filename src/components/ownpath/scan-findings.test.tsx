import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ScanFindings from "./scan-findings";
import type { Scan } from "@/lib/scan-rewrite/domain";
it("puts scope before prioritized advice, collapses evidence and omits empty groups", () => {
  const common = { requirement: "Communication", excerpt: "Helped visitors.", explanation: "A source-supported example.", nextStep: "Clarify your contribution.", group: "unclear" as const, expectation: "required" as const };
  const scan: Scan = { coverage: "Selected requirements reviewed.", findings: [{ ...common, title: "Secondary detail", priority: "secondary" }, { ...common, title: "Important detail", priority: "important" }] };
  const html = renderToStaticMarkup(<ScanFindings scan={scan} prefix="test" />);
  expect(html.indexOf(scan.coverage)).toBeLessThan(html.indexOf('Finding categories'));
  expect(html.indexOf('Important detail')).toBeLessThan(html.indexOf('Secondary detail'));
  expect(html).not.toContain('<details open'); expect(html).not.toContain('Demonstrated strengths');
  expect(html.match(/A source-supported example\./gu)).toHaveLength(2);
  expect(scan.findings[0].title).toBe('Secondary detail');
});
