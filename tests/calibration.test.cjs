const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const start = html.indexOf('const PRESET_IMAGES');
const context = vm.createContext({});
vm.runInContext(html.slice(start, html.indexOf('</script>', start)) + '\nglobalThis.api = { buildTestPdf, PAPERS };', context);
const { buildTestPdf, PAPERS } = context.api;
class Pdf {
  constructor(options) { this.options = options; this.rects = []; this.texts = []; this.lines = []; this.size = 10; }
  setLineDashPattern() {} setProperties() {} setDrawColor() {} setLineWidth() {} setFillColor() {} setFont() {} setTextColor() {}
  setFontSize(size) { this.size = size; }
  getTextWidth(t) { return t.length * this.size * 0.17; }
  rect(x, y, w, h, fill) { this.rects.push({ x, y, w, h, fill }); }
  line(...args) { this.lines.push(args); }
  text(t, x, y, options) { this.texts.push({ t, x, y, options }); }
}
test('calibration square is exactly 100 mm on both axes for all papers and margins', () => {
  for (const paper of Object.keys(PAPERS)) for (const margin of [0, 8, 25]) {
    const settings = { paper, margin, overlap: 40 };
    const doc = buildTestPdf(Pdf, settings);
    assert.equal(doc.rects[0].w, 100); assert.equal(doc.rects[0].h, 100);
    assert.equal(doc.rects.filter(r => r.fill === 'FD').length, 2);
    assert.ok(doc.rects.filter(r => r.fill === 'FD').every(r => r.w === 40));
    assert.ok(doc.rects.every(r => r.x >= margin && r.y >= margin && r.x + r.w <= PAPERS[paper].w - margin && r.y + r.h <= PAPERS[paper].h - margin));
    assert.ok(doc.texts.every(t => t.y <= PAPERS[paper].h - margin));
    assert.ok(doc.texts.some(t => /100%/.test(t.t)));
    assert.ok(doc.texts.some(t => /match half-crosses/.test(t.t)));
    assert.deepEqual(settings, { paper, margin, overlap: 40 });
  }
});
test('seam samples preserve requested overlap and reject impossible settings', () => {
  for (const overlap of [5, 15, 75, 130]) {
    const doc = buildTestPdf(Pdf, { paper: 'a4', margin: 25, overlap });
    assert.ok(doc.rects.filter(r => r.fill === 'FD').every(r => r.w === overlap));
    assert.equal(doc.lines.length, 13);
    const sampleA = doc.rects[1], sampleB = doc.rects[3];
    const cut = doc.lines.find(([x1, y1, x2, y2]) => x1 === x2 && y2 - y1 === sampleA.h);
    assert.ok(cut, 'sample A has a cut line through both gutter marks');
    assert.equal(cut[0], sampleA.x + sampleA.w - overlap / 2);
    const shift = sampleA.w - overlap;
    assert.equal(cut[0] - (sampleB.x + shift), overlap / 2, 'cut retains half the shared band for pasting');
    assert.ok(doc.texts.filter(t => t.t === 'TEST:C1R1').length === 4);
  }
  for (const opts of [{ paper: 'unknown', margin: 8 }, { paper: 'a4', margin: 26 }, { paper: 'a4', margin: 25, overlap: 200 }]) assert.throws(() => buildTestPdf(Pdf, opts), /test sheet needs/);
});
