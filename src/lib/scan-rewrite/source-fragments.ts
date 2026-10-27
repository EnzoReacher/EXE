// Repair presentation only when adjacent model fragments reconstruct an exact
// cited source span. Never infer relationships across entries or source rows.
const plain = (s: string) => s.normalize("NFC").replace(/^\s*[•*‣–-]\s*/u, "").replace(/\s+/gu, " ").trim();
export function joinSourceFragments(items: string[], evidence: string[]): string[] {
  const sources = evidence.map(plain), result: string[] = [];
  for (let i = 0; i < items.length; i++) {
    let end = i, joined = items[i];
    for (let j = i + 1; j < items.length; j++) {
      const parts = items.slice(i, j + 1).map(plain);
      // Whitespace may precede a title; a closing quote/full stop must not
      // acquire a space. Return the actual source slice, not invented wording.
      const candidate = parts.join(" ").replace(/\s+([.,;:!?\u201d\u2019])/gu, "$1");
      const compact = parts.join("");
      const match = sources.flatMap(source => [candidate, compact].filter(s => s && source.includes(s)))[0];
      if (match) { end = j; joined = match; }
    }
    result.push(joined); i = end;
  }
  return result;
}
