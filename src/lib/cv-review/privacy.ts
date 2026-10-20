import type { Block } from "./domain";
// Conservative exclusion. The original document is never rewritten by this filter.
export function shareableBlocks(blocks: Block[]) {
  return blocks.filter((b, index) => {
    const likelyName = index === 0 && /^[\p{Lu}][\p{L}\p{M}'’\-]*(?:[ \t]+[\p{Lu}][\p{L}\p{M}'’\-]*){1,5}$/u.test(b.text.trim()) && !/^(work experience|summary|my experience|education|skills|volunteer experience)$/iu.test(b.text.trim());
    return !likelyName && !/contact|liên hệ/iu.test(b.section) && !/@|https?:|www\.|(?:\+?\d[\s().-]*){8,}|\b(address|địa chỉ)\s*:/iu.test(b.text);
  });
}
