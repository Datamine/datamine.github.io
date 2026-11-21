import { isRecord } from './types/json.ts';

import { indexStaticGeometry } from './indexed-geometry.ts';
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
export function worldBase64(bytes: Uint8Array<ArrayBufferLike>) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 32768)
    text += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(text);
}
export function worldBytes(text: string) {
  const raw = atob(text),
    bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
type ArrayKind = keyof typeof worldArrayTypes;
type GraphValue =
  null | string | number | boolean | bigint | symbol | { r: number } | { n: string };
type ArrayNode = { t: ArrayKind; b: number | string; l?: number };
type GraphNode =
  | { t: 'mesh'; id: number; count: number; p: Record<string, GraphValue> }
  | { t: 'object'; v: Record<string, GraphValue> }
  | { t: 'map'; v: [GraphValue, GraphValue][] }
  | { t: 'array' | 'set'; v: GraphValue[] }
  | ArrayNode;
export interface WorldGraph {
  root: GraphValue;
  nodes: (GraphNode | null)[];
}
function arrayKind(value: string): value is ArrayKind {
  return Object.hasOwn(worldArrayTypes, value);
}

export function encodeWorldGraph(root: unknown, { binary = false }: { binary?: boolean } = {}) {
  const seen = new Map<object, number>(),
    nodes: (GraphNode | null)[] = [],
    meshes: { data: number[] | Float32Array }[] = [],
    buffers: Uint8Array[] = [];
  function ref(value: unknown): GraphValue {
    if (typeof value === 'function' || value === undefined) return null;
    if (typeof value === 'number' && !Number.isFinite(value)) return { n: String(value) };
    if (value === null) return null;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint' ||
      typeof value === 'symbol'
    )
      return value;
    if (typeof value !== 'object') return null;
    const previous = seen.get(value);
    if (previous !== undefined) return { r: previous };
    const id = nodes.length;
    seen.set(value, id);
    nodes.push(null);
    let node: GraphNode;
    if (
      isRecord(value) &&
      value.data &&
      (Array.isArray(value.data) || value.data instanceof Float32Array) &&
      value.constructor.name === 'Mesh'
    ) {
      const mesh = meshes.length;
      meshes.push(value as { data: number[] | Float32Array });
      const properties: Record<string, GraphValue> = {};
      for (const [key, child] of Object.entries(value))
        if (key !== 'data') properties[key] = ref(child);
      node = { t: 'mesh', id: mesh, count: value.data.length / 11, p: properties };
    } else if (ArrayBuffer.isView(value)) {
      const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
        kind = value.constructor.name;
      if (!arrayKind(kind)) throw new Error('Unsupported world array: ' + kind);
      if (binary) {
        node = { t: kind, b: buffers.length, l: bytes.byteLength };
        buffers.push(bytes);
      } else node = { t: kind, b: worldBase64(bytes) };
    } else if (value instanceof Map)
      node = {
        t: 'map',
        v: [...(value as Map<unknown, unknown>)].map(([k, v]) => [ref(k), ref(v)]),
      };
    else if (value instanceof Set) node = { t: 'set', v: [...(value as Set<unknown>)].map(ref) };
    else if (Array.isArray(value)) node = { t: 'array', v: (value as unknown[]).map(ref) };
    else {
      const properties: Record<string, GraphValue> = {};
      for (const [key, child] of Object.entries(value))
        if (typeof child !== 'function' && key !== 'gpu') properties[key] = ref(child);
      node = { t: 'object', v: properties };
    }
    nodes[id] = node;
    return { r: id };
  }
  return { graph: { root: ref(root), nodes }, meshes, buffers };
}
export function decodeWorldGraph(
  graph: WorldGraph,
  buffers: readonly Uint8Array[] | null = null,
): unknown {
  function array(n: ArrayNode) {
    const bytes = buffers && typeof n.b === 'number' ? buffers[n.b] : worldBytes(String(n.b)),
      Type = worldArrayTypes[n.t];
    return new Type(bytes.buffer, bytes.byteOffset, bytes.byteLength / Type.BYTES_PER_ELEMENT);
  }
  const objects: object[] = graph.nodes.map((n) => {
    if (!n) throw new Error('Incomplete world graph node');
    return n.t === 'array'
      ? []
      : n.t === 'map'
        ? new Map<unknown, unknown>()
        : n.t === 'set'
          ? new Set<unknown>()
          : n.t === 'mesh'
            ? { streamId: n.id, count: n.count, data: new Float32Array(0) }
            : arrayKind(n.t)
              ? array(n as ArrayNode)
              : {};
  });
  const value = (v: GraphValue): unknown =>
    v && typeof v === 'object' ? ('r' in v ? objects[v.r] : Number(v.n)) : v;
  for (const [i, n] of graph.nodes.entries()) {
    if (!n) throw new Error('Incomplete world graph node');
    const target = objects[i];
    if (n.t === 'array') for (const v of n.v) (target as unknown[]).push(value(v));
    else if (n.t === 'map')
      for (const [k, v] of n.v) (target as Map<unknown, unknown>).set(value(k), value(v));
    else if (n.t === 'set') for (const v of n.v) (target as Set<unknown>).add(value(v));
    else if (n.t === 'object' || n.t === 'mesh')
      for (const [k, v] of Object.entries(n.t === 'mesh' ? n.p : n.v))
        Reflect.set(target, k, value(v));
  }
  return value(graph.root);
}

export function encodeWorldMetadata(graph: WorldGraph, buffers: readonly Uint8Array[]) {
  let size = 0;
  const ranges = buffers.map((bytes) => {
      size = Math.ceil(size / 8) * 8;
      const r = [size, bytes.byteLength] satisfies [number, number];
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
export function decodeWorldMetadata(bytes: Uint8Array) {
  const pad = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true),
    { graph, ranges } = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + pad))) as {
      graph: WorldGraph;
      ranges: [number, number][];
    },
    buffers = ranges.map(([offset, n]) => bytes.subarray(8 + pad + offset, 8 + pad + offset + n));
  return decodeWorldGraph(graph, buffers);
}

export interface WorldChunkPart {
  mesh: number;
  runs: number[][];
  data: Float32Array;
  indices?: Uint16Array | Uint32Array | null;
}
interface ChunkHeader {
  mesh: number;
  runs: number[][];
  length: number;
  indices?: number;
  indexBytes?: number;
}
/** Aligned binary floats, with source-vertex ranges for picking and cutaways. */
export function encodeWorldChunk(
  parts: WorldChunkPart[],
  { indexed = false }: { indexed?: boolean } | undefined = {},
) {
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
export function decodeWorldChunk(bytes: Uint8Array) {
  const size = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true),
    header = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + size))) as ChunkHeader[];
  let offset = 4 + size;
  return header.map((p) => {
    const data = new Float32Array(bytes.buffer, bytes.byteOffset + offset, p.length);
    offset += p.length * 4;
    let indices: Uint16Array | Uint32Array | null = null;
    if (p.indices) {
      const Index = p.indexBytes === 2 ? Uint16Array : Uint32Array;
      indices = new Index(bytes.buffer, bytes.byteOffset + offset, p.indices);
      offset += Math.ceil(indices.byteLength / 4) * 4;
    }
    return { ...p, data, indices };
  });
}
