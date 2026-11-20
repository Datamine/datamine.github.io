import { indexStaticGeometry } from './indexed-geometry.js';
// Static-world graph codec. References preserve building/room/NPC identity;
// functions and player progress are deliberately never part of a map artifact.
const worldArrayTypes = {
  Uint8Array,
  Uint16Array,
  Uint32Array,
  Int16Array,
  Int32Array,
  Float32Array,
  Float64Array,
};
export function worldBase64(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 32768)
    text += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(text);
}
export function worldBytes(text) {
  const raw = atob(text),
    bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
export function encodeWorldGraph(root, { binary = false } = {}) {
  const seen = new Map(),
    nodes = [],
    meshes = [],
    buffers = [];
  function ref(value) {
    if (typeof value === 'function' || value === undefined) return null;
    if (typeof value === 'number' && !Number.isFinite(value)) return { n: String(value) };
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return { r: seen.get(value) };
    const id = nodes.length;
    seen.set(value, id);
    nodes.push(null);
    let node;
    if (
      value.data &&
      (Array.isArray(value.data) || value.data instanceof Float32Array) &&
      value.constructor.name === 'Mesh'
    ) {
      const mesh = meshes.length;
      meshes.push(value);
      node = { t: 'mesh', id: mesh, count: value.data.length / 11, p: {} };
      for (const key of Object.keys(value)) if (key !== 'data') node.p[key] = ref(value[key]);
    } else if (ArrayBuffer.isView(value)) {
      const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      if (binary) {
        node = { t: value.constructor.name, b: buffers.length, l: bytes.byteLength };
        buffers.push(bytes);
      } else node = { t: value.constructor.name, b: worldBase64(bytes) };
    } else if (value instanceof Map)
      node = { t: 'map', v: [...value].map(([k, v]) => [ref(k), ref(v)]) };
    else if (value instanceof Set) node = { t: 'set', v: [...value].map(ref) };
    else if (Array.isArray(value)) node = { t: 'array', v: value.map(ref) };
    else {
      node = { t: 'object', v: {} };
      for (const key of Object.keys(value))
        if (typeof value[key] !== 'function' && key !== 'gpu') node.v[key] = ref(value[key]);
    }
    nodes[id] = node;
    return { r: id };
  }
  return { graph: { root: ref(root), nodes }, meshes, buffers };
}
export function decodeWorldGraph(graph, buffers = null) {
  const array = (n) => {
    const bytes = buffers ? buffers[n.b] : worldBytes(n.b);
    return new worldArrayTypes[n.t](
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength / worldArrayTypes[n.t].BYTES_PER_ELEMENT,
    );
  };
  const objects = graph.nodes.map((n) =>
    n.t === 'array'
      ? []
      : n.t === 'map'
        ? new Map()
        : n.t === 'set'
          ? new Set()
          : n.t === 'mesh'
            ? { streamId: n.id, count: n.count, data: new Float32Array(0) }
            : worldArrayTypes[n.t]
              ? array(n)
              : {},
  );
  const value = (v) =>
    v && typeof v === 'object' ? ('r' in v ? objects[v.r] : 'n' in v ? Number(v.n) : v) : v;
  for (const [i, n] of graph.nodes.entries()) {
    const target = objects[i];
    if (n.t === 'array') for (const v of n.v) target.push(value(v));
    else if (n.t === 'map') for (const [k, v] of n.v) target.set(value(k), value(v));
    else if (n.t === 'set') for (const v of n.v) target.add(value(v));
    else if (n.t === 'object' || n.t === 'mesh')
      for (const [k, v] of Object.entries(n.t === 'mesh' ? n.p : n.v)) target[k] = value(v);
  }
  return value(graph.root);
}

export function encodeWorldMetadata(graph, buffers) {
  let size = 0;
  const ranges = buffers.map((bytes) => {
      size = Math.ceil(size / 8) * 8;
      const r = [size, bytes.byteLength];
      size += bytes.byteLength;
      return r;
    }),
    header = new TextEncoder().encode(JSON.stringify({ graph, ranges })),
    pad = Math.ceil(header.length / 8) * 8,
    bytes = new Uint8Array(8 + pad + size);
  new DataView(bytes.buffer).setUint32(0, pad, true);
  bytes.fill(32, 8, 8 + pad);
  bytes.set(header, 8);
  buffers.forEach((b, i) => bytes.set(b, 8 + pad + ranges[i][0]));
  return bytes;
}
export function decodeWorldMetadata(bytes) {
  const pad = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true),
    { graph, ranges } = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + pad))),
    buffers = ranges.map(([offset, n]) => bytes.subarray(8 + pad + offset, 8 + pad + offset + n));
  return decodeWorldGraph(graph, buffers);
}

/** Aligned binary floats, with source-vertex ranges for picking and cutaways. */
export function encodeWorldChunk(parts, { indexed = false } = {}) {
  parts = parts.map((p) => ({
    ...p,
    ...(indexed && !p.indices ? indexStaticGeometry(p.data) : {}),
  }));
  const header = parts.map((p) => ({
      mesh: p.mesh,
      runs: p.runs,
      length: p.data.length,
      ...(p.indices ? { indices: p.indices.length, indexBytes: p.indices.BYTES_PER_ELEMENT } : {}),
    })),
    json = new TextEncoder().encode(JSON.stringify(header)),
    size = Math.ceil(json.length / 4) * 4,
    buffer = new ArrayBuffer(
      4 +
        size +
        parts.reduce(
          (n, p) => n + p.data.byteLength + Math.ceil((p.indices?.byteLength || 0) / 4) * 4,
          0,
        ),
    ),
    bytes = new Uint8Array(buffer);
  new DataView(buffer).setUint32(0, size, true);
  bytes.fill(32, 4, 4 + size);
  bytes.set(json, 4);
  let offset = 4 + size;
  for (const part of parts) {
    bytes.set(new Uint8Array(part.data.buffer, part.data.byteOffset, part.data.byteLength), offset);
    offset += part.data.byteLength;
    if (part.indices) {
      bytes.set(
        new Uint8Array(part.indices.buffer, part.indices.byteOffset, part.indices.byteLength),
        offset,
      );
      offset += Math.ceil(part.indices.byteLength / 4) * 4;
    }
  }
  return bytes;
}
export function decodeWorldChunk(bytes) {
  const size = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true),
    header = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + size)));
  let offset = 4 + size;
  return header.map((p) => {
    const data = new Float32Array(bytes.buffer, bytes.byteOffset + offset, p.length);
    offset += p.length * 4;
    let indices = null;
    if (p.indices) {
      const Index = p.indexBytes === 2 ? Uint16Array : Uint32Array;
      indices = new Index(bytes.buffer, bytes.byteOffset + offset, p.indices);
      offset += Math.ceil(indices.byteLength / 4) * 4;
    }
    return { ...p, data, indices };
  });
}
