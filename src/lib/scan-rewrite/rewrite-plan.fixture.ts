// Offline fixture adapter only. The production path never repairs old provider
// output; its new schema must return only these ID/text pairs itself.
export function selectedRewrite(value: { replacements: readonly unknown[] }) {
  return { replacements: value.replacements.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const r = item as Record<string, unknown>;
    return { lineId: r.lineId, text: r.text };
  }) };
}
