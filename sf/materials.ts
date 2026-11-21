export interface AtlasArtwork {
  id: string;
  src: string;
  color: string;
  message?: string;
}
export interface BillboardController {
  pending?: number;
  setRevealed?: (value: boolean) => boolean;
}
interface BillboardSlot {
  art: AtlasArtwork;
  x: number;
  y: number;
  graphic: HTMLImageElement;
  loaded: boolean;
}
import type { SignAtlas } from './types/world.ts';
import { drawRevealedBillboard } from './billboards.ts';
import { MATERIAL_IDS, MATERIAL_ATLAS } from './material-catalog.mts';
export { MATERIAL_IDS, MATERIAL_ATLAS };

// Names, artwork and numeric GPU slots share the catalog. The generated atlas
// is one image; individual SVG element IDs are not queried by the renderer.

// Stable room lighting is baked into the mesh, without per-window lights or
// animation. Adjacent panes belonging to one bay share the same appearance.
const WINDOW_DARK = ['#293b40', '#34464a', '#405153'] satisfies [string, string, string],
  WINDOW_COOL = ['#56787e', '#63878a', '#75918f'] satisfies [string, string, string],
  WINDOW_LIT = ['#b4a58c', '#c3b397', '#aeaa96'] satisfies [string, string, string];
export function windowAppearance(x: number, y: number, z: number, seed = 0) {
  const hash = Math.sin(x * 31.71 + y * 71.93 + z * 19.17 + seed * 107.49) * 43758.5453,
    t = hash - Math.floor(hash),
    lit = t > 0.78,
    palette = lit ? WINDOW_LIT : t < 0.36 ? WINDOW_DARK : WINDOW_COOL,
    index = Math.min(2, Math.floor(((t * 13) % 1) * 3));
  return {
    color: palette[index],
    material: { window: lit ? 0.35 : 0.04 },
    highlight: lit ? '#c9bda5' : t < 0.36 ? '#718b8d' : '#a8c3bd',
    lit,
  };
}

const atlasURL = new URL('./textures/sf-materials.svg', import.meta.url);
const activeUploads = new WeakMap<
    WebGLRenderingContext,
    { texture: WebGLTexture | null; ready: boolean; error: string | null }
  >(),
  activeSignUploads = new WeakMap<WebGLRenderingContext, object>();
let atlasImage: HTMLImageElement | null = null;

/** Reuse the same decoded atlas when the WebGL context is restored. */
export function createMaterialTexture(gl: WebGLRenderingContext) {
  const state = { texture: gl.createTexture(), ready: false, error: null as string | null };
  activeUploads.set(gl, state);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, state.texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([237, 237, 237, 255] satisfies [number, number, number, number]),
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const upload = () => {
    if (activeUploads.get(gl) !== state || gl.isContextLost()) return;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, state.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasImage!);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    const aniso =
      gl.getExtension('EXT_texture_filter_anisotropic') ||
      gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    if (aniso)
      gl.texParameterf(
        gl.TEXTURE_2D,
        aniso.TEXTURE_MAX_ANISOTROPY_EXT,
        Math.min(4, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)),
      );
    gl.activeTexture(gl.TEXTURE0);
    state.ready = true;
  };
  if (!atlasImage) {
    atlasImage = new Image();
    atlasImage.src = atlasURL.href;
  }
  if (atlasImage.complete && atlasImage.naturalWidth) upload();
  else {
    atlasImage.addEventListener('load', upload, { once: true });
    atlasImage.addEventListener(
      'error',
      () => {
        state.error = 'Could not load ' + atlasURL.href;
      },
      { once: true },
    );
  }
  gl.activeTexture(gl.TEXTURE0);
  return state;
}

/** Pure UV layout is also used by the build-time world compiler. */
export function signAtlasLayout(names: Iterable<string>, artwork: { id: string }[] = []) {
  const unique = [...new Set(names)],
    artStart = Math.ceil(unique.length / 4) * 64,
    height =
      2 ** Math.ceil(Math.log2(Math.max(1024, artStart + Math.ceil(artwork.length / 4) * 256))),
    signs: SignAtlas = new Map();
  unique.forEach((name, i) => {
    const x = (i % 4) * 256,
      y = Math.floor(i / 4) * 64;
    signs.set(name, [
      [x / 1024, (y + 64) / height] satisfies [number, number],
      [(x + 256) / 1024, (y + 64) / height] satisfies [number, number],
      [(x + 256) / 1024, y / height] satisfies [number, number],
      [x / 1024, y / height] satisfies [number, number],
    ]);
  });
  artwork.forEach((art, i) => {
    const x = (i % 4) * 256,
      y = artStart + Math.floor(i / 4) * 256,
      pad = 2;
    signs.set(art.id, [
      [(x + pad) / 1024, (y + 256 - pad) / height] satisfies [number, number],
      [(x + 256 - pad) / 1024, (y + 256 - pad) / height] satisfies [number, number],
      [(x + 256 - pad) / 1024, (y + pad) / height] satisfies [number, number],
      [(x + pad) / 1024, (y + pad) / height] satisfies [number, number],
    ]);
  });
  return { signs, height };
}

/** Homepage-specific sign lettering shares a separate small texture atlas. */
export function createSignTexture(
  gl: WebGLRenderingContext,
  names: Iterable<string>,
  signs: SignAtlas,
  {
    preserveCase = [],
    artwork = [],
    billboardController = null,
    revealed = false,
  }: {
    preserveCase?: Iterable<string>;
    artwork?: readonly AtlasArtwork[];
    billboardController?: BillboardController | null;
    revealed?: boolean;
  } = {},
) {
  const exactCase = new Set(preserveCase),
    unique = [...new Set(names)];
  const artStart = Math.ceil(unique.length / 4) * 64;
  const image = document.createElement('canvas');
  image.width = 1024;
  image.height =
    2 ** Math.ceil(Math.log2(Math.max(1024, artStart + Math.ceil(artwork.length / 4) * 256)));
  const c = image.getContext('2d')!;
  c.fillStyle = '#342e23';
  c.fillRect(0, 0, image.width, image.height);
  unique.forEach((name, i) => {
    const x = (i % 4) * 256,
      y = Math.floor(i / 4) * 64,
      lines = (exactCase.has(name) ? name : name.toUpperCase()).split('\n');
    c.fillStyle = '#453b27';
    c.fillRect(x, y, 256, 64);
    c.strokeStyle = '#bc9e5d';
    c.lineWidth = 3;
    c.strokeRect(x + 4, y + 4, 248, 56);
    c.fillStyle = '#f6e2ac';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const size = Math.min(
      27,
      420 / Math.max(...lines.map((line) => line.length)) + 5,
      lines.length > 1 ? 48 / lines.length : 27,
    );
    c.font = `bold ${size}px Georgia`;
    lines.forEach((line, j) =>
      c.fillText(line, x + 128, y + 32 + (j - (lines.length - 1) / 2) * (size + 1), 238),
    );
    signs.set(name, [
      [x / 1024, (y + 64) / image.height] satisfies [number, number],
      [(x + 256) / 1024, (y + 64) / image.height] satisfies [number, number],
      [(x + 256) / 1024, y / image.height] satisfies [number, number],
      [x / 1024, y / image.height] satisfies [number, number],
    ]);
  });
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const token = {};
  activeSignUploads.set(gl, token);
  const slots: BillboardSlot[] = [];
  let hiddenLayer = !!revealed;
  if (billboardController) billboardController.pending = artwork.length;
  function uploadSigns() {
    if (activeSignUploads.get(gl) !== token || gl.isContextLost()) return;
    const active = gl.getParameter(gl.ACTIVE_TEXTURE);
    gl.activeTexture(gl.TEXTURE0);
    const bound = gl.getParameter(gl.TEXTURE_BINDING_2D);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.bindTexture(gl.TEXTURE_2D, bound);
    gl.activeTexture(active);
  }
  function drawSlot(slot: BillboardSlot) {
    const { art, x, y, graphic } = slot;
    if (hiddenLayer && art.message) drawRevealedBillboard(c, { message: art.message }, x, y);
    else {
      c.fillStyle = art.color;
      c.fillRect(x, y, 256, 256);
      if (slot.loaded) c.drawImage(graphic, x, y, 256, 256);
    }
  }
  for (const [i, art] of artwork.entries()) {
    const x = (i % 4) * 256,
      y = artStart + Math.floor(i / 4) * 256,
      pad = 2,
      graphic = new Image(),
      slot = { art, x, y, graphic, loaded: false };
    slots.push(slot);
    drawSlot(slot);
    signs.set(art.id, [
      [(x + pad) / 1024, (y + 256 - pad) / image.height] satisfies [number, number],
      [(x + 256 - pad) / 1024, (y + 256 - pad) / image.height] satisfies [number, number],
      [(x + 256 - pad) / 1024, (y + pad) / image.height] satisfies [number, number],
      [(x + pad) / 1024, (y + pad) / image.height] satisfies [number, number],
    ]);
    graphic.onload = () => {
      slot.loaded = true;
      drawSlot(slot);
      uploadSigns();
      if (billboardController) billboardController.pending = (billboardController.pending || 0) - 1;
    };
    graphic.onerror = () => {
      if (billboardController) billboardController.pending = (billboardController.pending || 0) - 1;
    };
    graphic.src = art.src;
  }
  if (billboardController)
    billboardController.setRevealed = (value: boolean) => {
      value = !!value;
      if (value === hiddenLayer) return false;
      hiddenLayer = value;
      slots.forEach(drawSlot);
      uploadSigns();
      return true;
    };
  if (artwork.length) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  return texture;
}
