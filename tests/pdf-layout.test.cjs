const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const start = html.indexOf('const PRESET_IMAGES');
const context = vm.createContext({});
vm.runInContext(html.slice(start, html.indexOf('</script>', start)) + '\nglobalThis.api = { guidePage, sheetPage, planLayout, buildPdf };', context);
const { guidePage, sheetPage, planLayout, buildPdf } = context.api;
class RecordingPdf {
  constructor() { this.pages = [[]]; this.size = 10; }
  addPage() { this.pages.push([]); }
  setFont() {} setTextColor() {} setDrawColor() {} setLineWidth() {} setFillColor() {} setLineDashPattern() {} setProperties() {}
  setFontSize(n) { this.size = n; }
  getTextWidth(t) { return String(t).length * this.size * 0.17; }
  splitTextToSize(t, width) { const n = Math.max(1, Math.floor(width / (this.size * 0.17))); return String(t).match(new RegExp(`.{1,${n}}`, 'g')) || ['']; }
  record(type, data) { this.pages.at(-1).push({ type, ...data }); }
  text(t, x, y, opts = {}) { (Array.isArray(t) ? t : [t]).forEach((s, i) => this.record('text', { t: s, x, y: y + i * this.size * 0.4, width: this.getTextWidth(s), opts })); }
  rect(x, y, w, h) { this.record('rect', { x, y, w, h }); }
  line() {} triangle() {} addImage() {}
}
const plan = () => planLayout({ box: { W: 300, D: 200, H: 400 }, n: 16, fit: 'stretch', wrap: 10, paper: 'letter', margin: 25, overlap: 10, includeBottom: true });
test('guide flows long instructions above footer across pages', () => {
  const doc = new RecordingPdf(), p = plan();
  const count = guidePage(doc, p, { title: 'uploaded filename '.repeat(80), netPng: 'image', netAspect: 2 }, Array(50).fill('A long page listing '.repeat(4)));
  assert.ok(count > 1);
  assert.equal(count, doc.pages.length);
  for (const page of doc.pages) for (const t of page.filter(x => x.type === 'text')) {
    assert.ok(t.x + t.width <= 215.9 - 25 + 0.01, t.t);
    assert.ok(t.y <= 279.4 - 25 - 7 + 0.01, t.t);
  }
});
test('30 by 30 sheet map stays inside reserved header', () => {
  const p = plan(), fp = { ...p.faces[0], cols: 30, rows: 30 };
  const doc = new RecordingPdf();
  sheetPage(doc, { n: 16, px: new Uint8Array(16 * 16 * 4) }, fp, 29, 29, p, { title: 'filename '.repeat(100) }, 2, 10);
  const map = doc.pages[0].filter(x => x.type === 'rect').slice(0, 900);
  assert.equal(map.length, 900);
  assert.ok(map.every(r => r.y + r.h <= p.margin + 14.001));
  const footer = doc.pages[0].find(x => x.type === 'text' && x.t.startsWith('Join rows first'));
  assert.ok(footer.x - footer.width >= p.margin + 4 + 50);
});
test('PDF sheet numbering includes all guide continuation pages', () => {
  const p = plan();
  const faces = Object.fromEntries(p.faces.map(fp => [fp.name, { n: 16, px: new Uint8Array(1024) }]));
  const doc = buildPdf(RecordingPdf, faces, p, { title: 'Box', netPng: 'image', netAspect: 3 });
  const guides = doc.pages.length - p.totalSheets;
  assert.ok(guides >= 2);
  assert.ok(doc.pages[guides].some(t => t.type === 'text' && t.t === `${guides + 1} / ${doc.pages.length}`));
});
