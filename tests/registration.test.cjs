const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const start = html.indexOf('const PRESET_IMAGES');
const context = vm.createContext({});
vm.runInContext(html.slice(start, html.indexOf('</script>', start)) + '\nglobalThis.api = { registrationMarks, drawRegistrationMarks };', context);
const { registrationMarks, drawRegistrationMarks } = context.api;
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

for (const count of [2, 3]) test(`${count} by ${count} seams agree on both sheets and retain outer row references`, () => {
  const fp = { name: 'front', cols: count, rows: count, tw: 180, th: 210, overlap: 15, stepX: 165, stepY: 195 };
  for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
    const marks = registrationMarks(fp, col, row);
    for (const mark of marks) {
      assert.ok(mark.position > 0 && mark.position < (mark.axis === 'x' ? fp.tw : fp.th));
      close(mark.position + (mark.axis === 'x' ? col * fp.stepX : row * fp.stepY), mark.global);
    }
    if (col + 1 < count) {
      const next = registrationMarks(fp, col + 1, row);
      for (const edge of ['top', 'bottom']) {
        const a = marks.find(m => m.id === `FRONT:C${col + 1}R${row + 1}` && m.edge === edge);
        const b = next.find(m => m.id === a.id && m.edge === edge);
        assert.ok(b); close(a.global, b.global);
      }
    }
    if (row + 1 < count && (col === 0 || col === count - 1)) {
      const edge = col === 0 ? 'left' : 'right';
      const a = marks.find(m => m.id === `FRONT:R${row + 1}` && m.edge === edge);
      const b = registrationMarks(fp, col, row + 1).find(m => m.id === a.id && m.edge === edge);
      assert.ok(b); close(a.global, b.global);
    }
    if (col > 0 && col < count - 1) assert.equal(marks.filter(m => m.axis === 'y').length, 0);
  }
});

test('registration ink stays in removable gutters, separated from crop and fold ticks', () => {
  const fp = { name: 'bottom', cols: 3, rows: 3, tw: 180, th: 210, overlap: 5, stepX: 175, stepY: 205 };
  const lines = [], labels = [];
  const doc = { setDrawColor() {}, setLineWidth() {}, setFont() {}, setFontSize() {}, setTextColor() {}, getTextWidth: s => s.length * 0.8,
    line: (x1, y1, x2, y2) => lines.push([x1, y1, x2, y2]), text: (s, x, y) => labels.push([s, x, y]) };
  const X = 20, Y = 40;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) drawRegistrationMarks(doc, fp, c, r, X, Y);
  for (const [x1, y1, x2, y2] of lines) {
    assert.ok((Math.max(x1, x2) < X || Math.min(x1, x2) > X + fp.tw) || (Math.max(y1, y2) < Y || Math.min(y1, y2) > Y + fp.th));
    assert.ok(Math.min(x1, x2) >= X - 10 && Math.max(x1, x2) <= X + fp.tw + 10);
    assert.ok(Math.min(y1, y2) >= Y - 10 && Math.max(y1, y2) <= Y + fp.th + 10);
  }
  assert.ok(labels.length);
});

test('one column keeps both row alignment gutters; one sheet has no seams', () => {
  const fp = { name: 'left', cols: 1, rows: 2, tw: 100, th: 200, overlap: 10, stepX: 90, stepY: 190 };
  assert.deepEqual(Array.from(registrationMarks(fp, 0, 0), m => m.edge), ['left', 'right']);
  assert.equal(registrationMarks({ ...fp, rows: 1 }, 0, 0).length, 0);
});

test('cut-through-cross joins retain half overlap and cover four-way corners without gaps', () => {
  for (const overlap of [5, 15, 40]) for (const count of [2, 3]) {
    const tw = 180, th = 210, stepX = tw - overlap, stepY = th - overlap;
    const tiles = [];
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) {
      tiles.push({ x0: c * stepX, y0: r * stepY,
        x1: c * stepX + tw - (c + 1 < count ? overlap / 2 : 0),
        y1: r * stepY + th - (r + 1 < count ? overlap / 2 : 0) });
    }
    for (let seam = 1; seam < count; seam++) {
      close(tiles[seam - 1].x1 - tiles[seam].x0, overlap / 2);
      close(tiles[(seam - 1) * count].y1 - tiles[seam * count].y0, overlap / 2);
    }
    for (let r = 1; r < count; r++) for (let c = 1; c < count; c++) {
      for (const dx of [-0.01, 0, overlap / 4, overlap / 2, overlap / 2 + 0.01]) {
        for (const dy of [-0.01, 0, overlap / 4, overlap / 2, overlap / 2 + 0.01]) {
          const x = c * stepX + dx, y = r * stepY + dy;
          assert.ok(tiles.some(t => x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1));
        }
      }
    }
  }
});
