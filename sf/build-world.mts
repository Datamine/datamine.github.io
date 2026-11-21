import type { WorldManifest, WorldChunk, CompiledNavigationSummary } from './types/world-stream.ts';
import type { WorldChunkPart } from './world-codec.ts';
interface CompilePart {
  mesh: number;
  runs: [number, number, number][];
  count: number;
}
interface CompileChunk {
  id: string;
  lo: number[];
  hi: number[];
  parts: Map<number, CompilePart>;
}
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { encodeWorldGraph, encodeWorldChunk, encodeWorldMetadata } from './world-codec.ts';
import type { InputType } from 'zlib';

const output = new URL('./world-cache/', import.meta.url);
export { worldInputVersion } from './build-world-inputs.mts';

export async function compileWorld(
  snapshot: unknown,
  version: string,
  navigation: CompiledNavigationSummary | null = null,
) {
  let previous: WorldManifest | null = null;
  try {
    previous = await readCompiledManifest();
  } catch {}
  const { graph, meshes, buffers } = encodeWorldGraph(snapshot, { binary: true }),
    size = 12,
    chunks = new Map<string, CompileChunk>();
  for (const [id, mesh] of meshes.entries()) {
    const data = mesh.data instanceof Float32Array ? mesh.data : new Float32Array(mesh.data);
    mesh.data = data;
    for (let i = 0; i < data.length; i += 33) {
      const xs = [data[i], data[i + 11], data[i + 22]],
        zs = [data[i + 2], data[i + 13], data[i + 24]],
        large =
          Math.max(...xs) - Math.min(...xs) > size || Math.max(...zs) - Math.min(...zs) > size;
      const x = Math.floor((xs[0] + xs[1] + xs[2]) / 3 / size),
        z = Math.floor((zs[0] + zs[1] + zs[2]) / 3 / size),
        key = large ? 'global' : x + ',' + z;
      let chunk = chunks.get(key);
      if (!chunk) {
        chunk = {
          id: key,
          lo: [Infinity, Infinity, Infinity] satisfies [number, number, number],
          hi: [-Infinity, -Infinity, -Infinity] satisfies [number, number, number],
          parts: new Map(),
        };
        chunks.set(key, chunk);
      }
      let part = chunk.parts.get(id);
      if (!part) {
        part = { mesh: id, runs: [], count: 0 };
        chunk.parts.set(id, part);
      }
      const start = i / 11,
        last = part.runs.at(-1);
      if (last && last[0] + last[1] === start) last[1] += 3;
      else part.runs.push([start, 3, part.count]);
      part.count += 3;
      for (const j of [0, 11, 22] satisfies [number, number, number])
        for (let k = 0; k < 3; k++) {
          const v = data[i + j + k];
          if (!Number.isFinite(v)) throw Error('Non-finite compiled geometry');
          chunk.lo[k] = Math.min(chunk.lo[k], v);
          chunk.hi[k] = Math.max(chunk.hi[k], v);
        }
    }
  }
  await mkdir(new URL(version + '/', output), { recursive: true });
  let total = 0;
  async function asset(id: string, name: string, bytes: InputType) {
    const packed = gzipSync(bytes, { level: 9 }),
      file = version + '/' + name + '.js',
      hash = createHash('sha256').update(packed).digest('hex').slice(0, 32);
    await writeFile(
      new URL(file, output),
      `window.__sfWorldAsset(${JSON.stringify(version)},${JSON.stringify(id)},${JSON.stringify(packed.toString('base64'))});\n`,
    );
    total += packed.length;
    return { id, file, hash, bytes: packed.length };
  }
  const metadata = await asset('metadata', 'metadata', encodeWorldMetadata(graph, buffers)),
    descriptors: WorldChunk[] = [];
  for (const chunk of chunks.values()) {
    const parts: WorldChunkPart[] = [];
    for (const p of chunk.parts.values()) {
      const data = new Float32Array(p.count * 11),
        source = meshes[p.mesh].data as Float32Array;
      for (const [start, n, local] of p.runs)
        data.set(source.subarray(start * 11, (start + n) * 11), local * 11);
      parts.push({ ...p, data });
    }
    const descriptor = await asset(
      chunk.id,
      chunk.id === 'global' ? 'global' : 'tile-' + chunk.id.replace(',', '-'),
      encodeWorldChunk(parts, { indexed: true }),
    );
    descriptors.push({ ...descriptor, lo: chunk.lo, hi: chunk.hi });
  }
  const manifest: WorldManifest = {
    schema: 1,
    version,
    navigation,
    tileSize: size,
    metadata,
    chunks: descriptors,
    compressedBytes: total,
    triangles: meshes.reduce((n, m) => n + m.data.length / 33, 0),
  };
  await writeFile(new URL('manifest.json', output), JSON.stringify(manifest));
  await writeFile(
    new URL('manifest.js', output),
    'window.__sfWorldManifest=' + JSON.stringify(manifest) + ';\n',
  );
  // Two deployed generations let already-open clients finish their downloads.
  const generations = (await readdir(output, { withFileTypes: true })).filter(
    (d) => d.isDirectory() && /^[a-f0-9]{20}$/.test(d.name),
  );
  for (const old of generations.filter((d) => d.name !== version && d.name !== previous?.version))
    await rm(new URL(old.name + '/', output), { recursive: true, force: true });
  return manifest;
}
export async function readCompiledManifest() {
  return JSON.parse(await readFile(new URL('manifest.json', output), 'utf8')) as WorldManifest;
}
