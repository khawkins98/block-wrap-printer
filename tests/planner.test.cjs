const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const fields = {};
const context = vm.createContext({ document: { getElementById: id => fields[id] } });
vm.runInContext(script.replace(/\binit\(\);\s*$/, '') + '\nglobalThis.api = { planPanel, sheetId, num, PAPERS, HEAD, FOOT, GUT };', context);
const { planPanel, sheetId, num, PAPERS, HEAD, FOOT, GUT } = context.api;
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('sheet labels remain readable beyond Z', () => {
  for (const [col, label] of [[0, 'A'], [25, 'Z'], [26, 'AA'], [29, 'AD'], [51, 'AZ'], [52, 'BA']]) assert.equal(sheetId(col, 2), `${label}3`);
});

test('planner covers panels exactly, preserves overlaps and respects printable bounds', () => {
  for (const paper of Object.keys(PAPERS)) for (const margin of [0, 8, 25]) for (const overlap of [null, 5, 20, 40]) for (const [w, h] of [[30, 30], [190, 200], [600, 405], [405, 600], [1800, 1200], [5000, 100]]) {
    const p = planPanel(w, h, paper, margin, overlap);
    assert.ok(p, `${paper}: ${w} x ${h}`);
    close(p.tw + (p.cols - 1) * p.stepX, w);
    close(p.th + (p.rows - 1) * p.stepY, h);
    assert.ok(p.tw <= p.pageW - 2 * margin - 2 * GUT + 1e-7);
    assert.ok(p.th <= p.pageH - 2 * margin - HEAD - FOOT - 2 * GUT + 1e-7);
    if (p.cols > 1) { close(p.tw - p.stepX, p.overlap); assert.ok(p.stepX > 0); }
    if (p.rows > 1) { close(p.th - p.stepY, p.overlap); assert.ok(p.stepY > 0); }
    if (p.cols * p.rows === 1) assert.equal(p.overlap, 0);
    else assert.ok(p.overlap >= (overlap ?? 15));
  }
});

test('orientation selection uses fewer sheets and prefers portrait ties', () => {
  assert.equal(planPanel(250, 100, 'a4', 8, 5).orient, 'landscape');
  assert.equal(planPanel(100, 250, 'a4', 8, 5).orient, 'portrait');
  assert.equal(planPanel(50, 50, 'a4', 8, 5).orient, 'portrait');
  assert.equal(planPanel(100000, 100000, 'a4', 8, 5), null);
});

test('numeric input rejects empty, partial, nonfinite and nonpositive values', () => {
  for (const value of ['', ' ', '12mm', 'Infinity', '1e999', '-5', '0']) { fields.test = { value }; assert.equal(num('test'), null); }
  fields.test = { value: '12.5' }; assert.equal(num('test'), 12.5);
});

test('incomplete measurements clear a previously printable plan', () => {
  const elements = new Proxy({}, { get: (obj, id) => obj[id] ||= { value: '', checked: false, hidden: false, disabled: false, textContent: '', innerHTML: '', closest() { return this; } } });
  elements.layout.value = 'tile';
  const ui = vm.createContext({ document: { getElementById: id => elements[id], querySelectorAll: () => [] } });
  vm.runInContext(script.replace(/\binit\(\);\s*$/, '') + `
    state.img = {};
    extractFaces = () => ({ faces: { front: { n: 16 } } });
    current = { plan: { totalSheets: 10 } };
    update();
    globalThis.result = current;
  `, ui);
  assert.equal(ui.result, null);
  assert.equal(elements.makeBtn.disabled, true);
  assert.match(elements.status.textContent, /greater than zero/);
});

test('invalid print settings disable generation instead of silently changing values', () => {
  for (const [id, value, message] of [['overlap', '1', /between 5 and 40/], ['overlap', '-1', /between 5 and 40/], ['overlap', '173', /between 5 and 40/], ['overlap', '200', /between 5 and 40/], ['margin', '26', /0 and 25/], ['margin', '-1', /0 and 25/], ['margin', '', /0 and 25/], ['wrap', '-2', /0 mm or more/], ['wrap', 'Infinity', /0 mm or more/]]) {
    const elements = new Proxy({}, { get: (obj, key) => obj[key] ||= { value: '', checked: false, hidden: false, disabled: false, textContent: '', innerHTML: '', closest() { return this; } } });
    for (const [key, val] of Object.entries({ size: '0.5', layout: 'tile', margin: '8', overlap: '', wrap: '5' })) elements[key].value = val;
    elements[id].value = value;
    const ui = vm.createContext({ document: { getElementById: key => elements[key], querySelectorAll: () => [] } });
    vm.runInContext(script.replace(/\binit\(\);\s*$/, '') + `
      state.img = {}; state.wrapEdited = true;
      extractFaces = () => ({ faces: { front: { n: 16 } } });
      current = { plan: {} }; update(); globalThis.result = current;
    `, ui);
    assert.equal(ui.result, null, `${id}=${value}`);
    assert.equal(elements.makeBtn.disabled, true);
    assert.match(elements.status.textContent, message);
  }
});

test('unit conversion preserves small measurements through repeated cycles', () => {
  const elements = Object.fromEntries(['size', 'dimA', 'dimB', 'dimC'].map((id, i) => [id, { value: ['12.7', '0.01', '0.254', '405'][i] }]));
  const ui = vm.createContext({ document: { getElementById: id => elements[id] } });
  vm.runInContext(script.replace(/\binit\(\);\s*$/, '') + `
    for (let i = 0; i < 100; i++) { convertUnits('in'); convertUnits('mm'); }
  `, ui);
  for (const [id, expected] of Object.entries({ size: 12.7, dimA: 0.01, dimB: 0.254, dimC: 405 })) {
    assert.ok(Number(elements[id].value) > 0);
    assert.ok(Math.abs(Number(elements[id].value) - expected) < expected * 1e-9);
  }
});

test('unprintable and disproportionate repeat layouts reject before allocating bands', () => {
  vm.runInContext(`
    globalThis.originalFaceBands = faceBands;
    faceBands = () => { throw new Error('bands must not be allocated'); };
  `, context);
  try {
    for (const fit of ['tile', 'mirror']) for (const box of [{ W: 1, D: 1, H: 1e9 }, { W: 0.000001, D: 1000, H: 1000 }, { W: Infinity, D: 1, H: 1 }]) {
      context.input = { box, n: 16, fit, wrap: 0, paper: 'a4', margin: 8, overlap: null, includeBottom: true };
      const result = vm.runInContext('planLayout(input)', context);
      assert.equal(typeof result.error, 'string');
    }
  } finally { vm.runInContext('faceBands = originalFaceBands;', context); }
});

test('UI rejects oversized plans before rendering previews', () => {
  const elements = new Proxy({}, { get: (obj, id) => obj[id] ||= { value: '', checked: false, hidden: false, disabled: false, textContent: '', innerHTML: '', closest() { return this; } } });
  for (const [id, value] of Object.entries({ size: '1000000000', layout: 'tile', margin: '8', overlap: '', wrap: '0', paper: 'a4' })) elements[id].value = value;
  const ui = vm.createContext({ document: { getElementById: id => elements[id], querySelectorAll: () => [] } });
  vm.runInContext(script.replace(/\binit\(\);\s*$/, '') + `
    state.img = {}; state.wrapEdited = true;
    extractFaces = () => ({ faces: { front: { n: 16 } } });
    renderBox = renderNet = () => { throw new Error('invalid plans must not render'); };
    update(); globalThis.result = current;
  `, ui);
  assert.equal(ui.result, null);
  assert.equal(elements.makeBtn.disabled, true);
  assert.match(elements.status.textContent, /does not fit/);
});
