const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n').replace(/\binit\(\);\s*$/, '');
function fixture() {
  const fields = new Proxy({}, { get: (obj, key) => obj[key] ||= { value: '', checked: true, disabled: false } });
  const revoked = [];
  const context = vm.createContext({ document: { getElementById: id => fields[id] }, URL: { createObjectURL: file => `blob:${file.name}`, revokeObjectURL: url => revoked.push(url) } });
  vm.runInContext(script + `
    globalThis.pending = [];
    loadImage = src => new Promise((resolve, reject) => pending.push({ src, resolve, reject }));
    update = () => { globalThis.updates = (globalThis.updates || 0) + 1; };
    detectLayout = () => 'tile';
    globalThis.snapshot = () => ({ source: state.source, image: state.img, current, title: $('title').value });
    current = { old: true }; state.img = { old: true };
  `, context);
  return { context, fields, revoked, run: code => vm.runInContext(code, context) };
}

test('latest preset wins when image decoding completes out of order', async () => {
  const { run, fields } = fixture();
  const first = run("usePreset('wither')"), second = run("usePreset('grass')");
  assert.equal(run('snapshot().current'), null);
  assert.equal(fields.makeBtn.disabled, true); assert.equal(fields.testBtn.disabled, true);
  run("pending[1].resolve({ name: 'newer' })"); await second;
  run("pending[0].resolve({ name: 'older' })"); await first;
  assert.equal(run('snapshot().source'), 'grass');
  assert.equal(run('snapshot().image.name'), 'newer');
  assert.equal(run('updates'), 1);
});

test('preset selection supersedes pending upload and revokes its object URL', async () => {
  const { run, revoked } = fixture();
  const first = run("useFile({ name: 'old.png' })"), second = run("usePreset('grass')");
  run("pending[1].resolve({ name: 'preset' })"); await second;
  run("pending[0].resolve({ name: 'upload' })"); await first;
  assert.equal(run('snapshot().source'), 'grass');
  assert.equal(run('snapshot().image.name'), 'preset');
  assert.deepEqual(revoked, ['blob:old.png']);
});

test('upload selection supersedes pending preset', async () => {
  const { run } = fixture();
  const first = run("usePreset('grass')"), second = run("useFile({ name: 'new_upload.png' })");
  run("pending[1].resolve({ name: 'upload' })"); await second;
  run("pending[0].resolve({ name: 'preset' })"); await first;
  assert.equal(run('snapshot().source'), 'upload');
  assert.equal(run('snapshot().title'), 'new upload');
  assert.equal(run('snapshot().image.name'), 'upload');
});

test('failed latest upload stays unprintable and always revokes its object URL', async () => {
  const { run, fields, revoked } = fixture();
  const request = run("useFile({ name: 'broken.png' })");
  run("pending[0].reject(new Error('Unreadable image'))"); await request;
  assert.equal(run('snapshot().image'), null); assert.equal(run('snapshot().current'), null);
  assert.equal(fields.makeBtn.disabled, true); assert.equal(fields.testBtn.disabled, true);
  assert.equal(fields.notice.textContent, 'Unreadable image');
  assert.deepEqual(revoked, ['blob:broken.png']);
});

test('stale failures do not overwrite the latest image or its notice', async () => {
  const { run, fields } = fixture();
  const first = run("useFile({ name: 'old.png' })"), second = run("usePreset('grass')");
  run("pending[1].resolve({ name: 'latest' })"); await second;
  run("pending[0].reject(new Error('Stale error'))"); await first;
  assert.equal(run('snapshot().image.name'), 'latest');
  assert.equal(fields.notice.hidden, true);
});

function decoderFixture(width, height, canvasContext) {
  let allocations = 0;
  class FakeImage {
    constructor() { this.naturalWidth = width; this.naturalHeight = height; }
    set src(value) { queueMicrotask(() => this.onload()); }
  }
  const context = vm.createContext({ Image: FakeImage, document: { createElement() { allocations++; return { getContext: () => canvasContext }; } } });
  vm.runInContext(script, context);
  return { load: () => vm.runInContext("loadImage('image.png')", context), allocations: () => allocations };
}

test('canvas decoding failures reject image loading instead of leaving it pending', async () => {
  const { load } = decoderFixture(64, 64, { drawImage() {}, getImageData() { throw new Error('Canvas read failed'); } });
  await assert.rejects(load(), /Canvas read failed/);
  const noContext = decoderFixture(64, 64, null);
  await assert.rejects(noContext.load(), /could not be read/);
});

test('invalid or oversized decoded images reject before canvas allocation', async () => {
  for (const [w, h] of [[4001, 4000], [0, 64], [Infinity, 64], [64, -1]]) {
    const decoder = decoderFixture(w, h, null);
    await assert.rejects(decoder.load(), /at most 16 megapixels/);
    assert.equal(decoder.allocations(), 0);
  }
});

test('valid decoded image resolves pixel data', async () => {
  const expected = { width: 64, height: 64, data: new Uint8Array(64 * 64 * 4) };
  const decoder = decoderFixture(64, 64, { drawImage() {}, getImageData(x, y, w, h) { assert.equal(w, 64); assert.equal(h, 64); return expected; } });
  assert.equal(await decoder.load(), expected);
  assert.equal(decoder.allocations(), 1);
});

test('startup selects default immediately and late thumbnails cannot override an upload', async () => {
  const { run, fields } = fixture();
  for (const id of ['controls', 'unit', 'planFace', 'scaleRef', 'file', 'drop', 'makeBtn', 'testBtn']) fields[id].addEventListener = () => {};
  run(`
    enableDrag = () => {};
    buildPresetButtons = () => new Promise(resolve => { globalThis.finishThumbnails = resolve; });
    init();
  `);
  assert.equal(run('pending.length'), 1, 'default starts before thumbnail completion');
  const upload = run("useFile({ name: 'chosen.png' })");
  run("pending[1].resolve({ name: 'chosen' })"); await upload;
  run('finishThumbnails()'); await Promise.resolve();
  assert.equal(run('pending.length'), 2, 'thumbnail completion starts no new selection');
  run("pending[0].resolve({ name: 'default' })"); await Promise.resolve(); await Promise.resolve();
  assert.equal(run('snapshot().source'), 'upload');
  assert.equal(run('snapshot().image.name'), 'chosen');
});
