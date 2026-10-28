import { expect, it } from "vitest";
import { joinSourceFragments } from "./source-fragments";
it("rejoins a split quoted title and punctuation using exact source evidence", () => {
  const source = 'Led a research team and co-authored “A Study of Synthetic Records”.';
  expect(joinSourceFragments(['Led a research team and co-authored', '“A Study of Synthetic Records”', '.'], [source])).toEqual([source]);
});
it("preserves official award names and independent facts", () => {
  const items = ['Research Award — First Prize', 'Community Award — Finalist'];
  expect(joinSourceFragments(items, items)).toEqual(items);
});
it("does not invent associations or lose unsupported punctuation", () => {
  expect(joinSourceFragments(['Led a research team', 'Unrelated title', '.'], ['Led a research team', 'Unrelated title.'])).toEqual(['Led a research team', 'Unrelated title.']);
  expect(joinSourceFragments(['One fact', '.'], ['A different fact.'])).toEqual(['One fact', '.']);
});
