// @vitest-environment jsdom
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CVBody, printDocument } from "@/components/ownpath/cv-document";
import { classicFixtures } from "./fixtures";
import { classicLayout, documentText, getTemplate, templateHTML } from ".";
import { sectionLabel, structureWarnings } from "./structure";
import { flattenedFixture, referenceFixture } from "./reference-fixtures";
import { draftProfile } from "@/lib/cv-review/domain";
it.each(Object.entries(classicFixtures))("keeps every source line and identical preview/print markup: %s", (_name, text) => {
  expect(classicLayout(text).map(line => line.text).join("\n")).toBe(text);
  expect(renderToStaticMarkup(<CVBody text={text} />)).toBe(templateHTML(text));
  const doc = new DOMParser().parseFromString(printDocument(text), "text/html");
  expect(Array.from(doc.querySelectorAll("main > *")).map(node => node.textContent).join("\n")).toBe(text);
  expect(doc.querySelectorAll("button,nav,script,iframe")).toHaveLength(0);
});
it("has a safe legacy/unknown default and does not manufacture sections or claims", () => {
  expect(getTemplate().id).toBe("classic"); expect(getTemplate("future").id).toBe("classic");
  expect(classicLayout(classicFixtures.minimal).filter(line => line.kind === "section").map(line => line.text)).toEqual(["Education"]);
  expect(classicLayout(classicFixtures.vietnamese)[0].kind).toBe("name");
});
it("escapes markup, retains numbers and aligns only explicit entry dates", () => {
  const text = "Name\nExperience\nTeacher, School | 2020–2025\n• Used <tools> & taught 20 learners.\nNot a date | unknown";
  expect(templateHTML(text)).not.toContain("<tools>");
  expect(classicLayout(text).filter(line => line.kind === "entry")).toHaveLength(1);
});
it("recognizes letter-spaced headings without changing source IDs or words", () => {
  expect(sectionLabel("E D U C A T I O N")).toBe("education");
  expect(sectionLabel("K Ỹ N Ă N G")).toBe("kỹ năng");
  expect(classicLayout(flattenedFixture)[0].kind).toBe("section");
  expect(classicLayout(flattenedFixture).some(line => line.kind === "name")).toBe(false);
  expect(classicLayout(flattenedFixture).map(line => line.text).join("\n")).toBe(flattenedFixture);
  expect(structureWarnings(flattenedFixture)).toHaveLength(2);
  expect(draftProfile(flattenedFixture).blocks[7]).toMatchObject({ id: "b8", section: "education", text: "2020 – 2024" });
});
it("formats reference hierarchy without introducing technical claims or personal facts", () => {
  const lines = classicLayout(referenceFixture);
  expect(lines[0].kind).toBe("name");
  expect(lines.filter(line => line.kind === "entry")).toHaveLength(3);
  expect(lines.filter(line => line.kind === "context")).toHaveLength(2);
  expect(templateHTML(referenceFixture)).toContain("<strong>• Communication:</strong>");
  expect(documentText(referenceFixture)).toBe(referenceFixture);
  expect(templateHTML(referenceFixture)).not.toContain("TECHNICAL SKILLS");
});
it("omits empty headings consistently from rendered and plain exports, not saved source", () => {
  const text = "Ari Fern\nSummary\nSkills\nRecord keeping\nLanguages";
  expect(documentText(text)).toBe("Ari Fern\nSkills\nRecord keeping");
  expect(templateHTML(text)).not.toContain("Summary");
  expect(text).toContain("Languages");
});
