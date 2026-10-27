// Geometry only: never infer identities, roles or qualifications. Coordinates
// come from PDF text items, not from the reference CV or applicant-specific rules.
export function layoutPage(items, width) {
  const spans = items.filter(item => typeof item.str === 'string' && item.str.trim()).map(item => ({
    text: item.str, x: item.transform[4], y: item.transform[5],
    right: item.transform[4] + item.width, height: Math.abs(item.transform[3]) || item.height || 10,
  }));
  const rows = [];
  for (const span of spans.sort((a, b) => b.y - a.y || a.x - b.x)) {
    let row = rows.find(row => Math.abs(row.y - span.y) <= Math.min(3, span.height * .25));
    if (!row) { row = { y: span.y, spans: [] }; rows.push(row); }
    row.spans.push(span);
  }
  const date = /^(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(?:\d{1,2},?\s+)?|\d{1,2}[/.])?(?:19|20)\d{2}\b/iu;
  // Require repeated opposing content and a genuinely empty gutter. Right-hand
  // date suffixes alone are NOT evidence of a second column.
  let gutter;
  for (let fraction = .3; fraction <= .7; fraction += .025) {
    const x = width * fraction;
    const left = spans.filter(s => s.right < x - 9);
    const right = spans.filter(s => s.x > x + 9 && !date.test(s.text.trim()));
    if (left.length < 4 || right.length < 4) continue;
    // Columns often have different baselines and heading sizes. Require repeated
    // content on both sides, not accidental y-coordinate equality.
    const top = Math.min(Math.max(...left.map(s => s.y)), Math.max(...right.map(s => s.y)));
    const crossing = spans.filter(s => s.y <= top + 3 && s.x < x + 9 && s.right > x - 9);
    if (crossing.length === 0) { gutter = { x, top }; break; }
  }
  const render = selected => selected.map(row => {
    let right = -Infinity;
    return row.spans.sort((a, b) => a.x - b.x).map(s => {
      const gap = s.x - right; right = s.right;
      const dateCell = gap !== Infinity && gap > 1 && s.x > width * .65 && date.test(s.text.trim());
      return `${gap === Infinity ? '' : gap > 18 || dateCell ? '\t' : gap > 1 ? ' ' : ''}${s.text}`;
    }).join('');
  }).join('\n');
  if (!gutter) return { text: render(rows), columns: 1 };
  // Only genuinely spanning rows are page headers. A right-column Summary that
  // starts above the sidebar must remain with its own continuation paragraphs.
  const isHeader = row => row.y > gutter.top + 3 && row.spans.some(s => s.x < gutter.x && s.right > gutter.x);
  const header = rows.filter(isHeader);
  const body = rows.filter(row => !isHeader(row));
  const column = side => body.map(row => ({ ...row, spans: row.spans.filter(s => side === 'left' ? s.right < gutter.x : s.x > gutter.x) })).filter(row => row.spans.length);
  return { text: [render(header), render(column('left')), render(column('right'))].filter(Boolean).join('\n\n'), columns: 2 };
}
