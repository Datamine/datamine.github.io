import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignTexture } from '../materials.js';
import { RESEARCH_SIGNS } from '../research-campuses.js';

test('long institute names render on separate lines and expanded atlases keep every sign in bounds', () => {
  const previous = globalThis.document,
    drawn = [],
    context = {
      fillRect() {},
      strokeRect() {},
      fillText(...args) {
        drawn.push(args);
      },
    },
    canvas = { getContext: () => context };
  globalThis.document = { createElement: () => canvas };
  try {
    const gl = { createTexture: () => ({}), bindTexture() {}, texImage2D() {}, texParameteri() {} },
      signs = new Map(),
      names = [...Array.from({ length: 70 }, (_, i) => 'Sign ' + i), ...RESEARCH_SIGNS];
    createSignTexture(gl, names, signs);
    assert.equal(signs.size, names.length);
    assert.equal(canvas.width, 1024);
    assert.equal(canvas.height, 2048);
    for (const uv of signs.values())
      for (const [x, y] of uv)
        assert.ok(
          x >= 0 && x <= 1 && y >= 0 && y <= 1,
          'a sign must never sample outside the atlas',
        );
    for (const sign of RESEARCH_SIGNS) {
      const lines = sign.split('\n'),
        calls = drawn.filter(([text]) => lines.includes(text));
      assert.equal(calls.length, 3);
      assert.equal(new Set(calls.map((c) => c[2])).size, 3);
    }
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});

test('billboard art loads into padded atlas cells and asynchronous uploads restore GPU bindings', () => {
  const previousDocument = globalThis.document,
    previousImage = globalThis.Image,
    images = [],
    drawn = [],
    uploads = [];
  const context = {
      fillRect() {},
      strokeRect() {},
      fillText() {},
      drawImage(...args) {
        drawn.push(args);
      },
    },
    canvas = { getContext: () => context };
  globalThis.document = { createElement: () => canvas };
  globalThis.Image = class {
    constructor() {
      images.push(this);
    }
  };
  let unit = 7,
    binding = 'material';
  const gl = {
    TEXTURE0: 0,
    ACTIVE_TEXTURE: 1,
    TEXTURE_BINDING_2D: 2,
    createTexture: () => ({ id: 'atlas' }),
    bindTexture(_, t) {
      binding = t;
    },
    activeTexture(u) {
      unit = u;
    },
    getParameter: (k) => (k === 1 ? unit : binding),
    isContextLost: () => false,
    texImage2D() {
      uploads.push(binding);
    },
    texParameteri() {},
  };
  try {
    const signs = new Map(),
      texture = createSignTexture(gl, ['Ordinary sign'], signs, {
        artwork: [{ id: 'poster', color: '#224466', src: 'data:image/svg+xml,poster' }],
      });
    assert.equal(images.length, 1);
    assert.equal(signs.size, 2);
    const text = signs.get('Ordinary sign'),
      poster = signs.get('poster');
    assert.ok(Math.max(...text.map((p) => p[1])) < Math.min(...poster.map((p) => p[1])));
    gl.activeTexture(7);
    gl.bindTexture(0, 'material');
    images[0].onload();
    assert.equal(unit, 7);
    assert.equal(binding, 'material');
    assert.equal(uploads.at(-1), texture);
    assert.equal(drawn.length, 1);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});
