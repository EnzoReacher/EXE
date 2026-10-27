import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutPage } from './cv-layout.mjs';
const item = (str, x, y, width = 120) => ({ str, transform: [10, 0, 0, 10, x, y], width, height: 10 });
test('geometry preserves separate column reading order and same-column associations', () => {
  const items = [item('Fictional Candidate', 150, 800, 280), ...['C O N T A C T', 'person@example.test', 'S K I L L S', 'Customer support', 'LANGUAGES'].map((s, i) => item(s, 30, 740 - i * 20)), ...['EDUCATION', 'Fictional River College', '2020 – 2024', 'EXPERIENCE', 'Visitor support'].map((s, i) => item(s, 340, 740 - i * 20))];
  const result = layoutPage(items.reverse(), 595);
  assert.equal(result.columns, 2);
  assert.equal(result.text, 'Fictional Candidate\n\nC O N T A C T\nperson@example.test\nS K I L L S\nCustomer support\nLANGUAGES\n\nEDUCATION\nFictional River College\n2020 – 2024\nEXPERIENCE\nVisitor support');
});
test('right dates do not become a second column; same-row association retained', () => {
  const result = layoutPage(Array.from({ length: 5 }, (_, i) => [item('Fictional College', 40, 700 - i * 30), item('2020 – 2024', 440, 700 - i * 30, 80)]).flat(), 595);
  assert.equal(result.columns, 1);
  assert.ok(result.text.split('\n').every(line => line === 'Fictional College\t2020 – 2024'));
});
test('ambiguous sparse geometry is preserved in row order, not guessed', () => {
  assert.deepEqual(layoutPage([item('First text', 40, 700), item('Unclear association', 340, 700)], 595), { columns: 1, text: 'First text\tUnclear association' });
});
test('same-row right date with a day and a narrow gap stays attached', () => {
  assert.equal(layoutPage([item('Long supported activity label',40,700,400),item('March 16, 2025',448,700,100)],595).text,'Long supported activity label\tMarch 16, 2025');
});
test('right-column summary starting above sidebar stays with its continuation', () => {
  const items = ['CONTACT', 'Email', 'SKILLS', 'Records', 'LANGUAGES'].map((s,i) => item(s,30,700-i*20));
  items.push(...['ABOUT ME', 'Paragraph start', 'Paragraph continuation', 'EXPERIENCE', 'Activity'].map((s,i)=>item(s,340,740-i*20)));
  const result=layoutPage(items,595);
  assert.equal(result.columns,2);
  assert.match(result.text,/LANGUAGES\n\nABOUT ME\nParagraph start\nParagraph continuation\nEXPERIENCE/);
});
