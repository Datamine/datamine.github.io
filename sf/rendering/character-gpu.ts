import type { Mesh } from '../geometry.ts';
import type {
  SkinnedMesh,
  CharacterDraw,
  CharacterPlacement,
  ShaderProgram,
} from '../types/rendering.ts';
import { matrixMultiply } from '../geometry.ts';
import { characterRoot, characterNormal } from './character-frame.ts';

const CHARACTER_SKIN_GLSL = `
attribute vec4 aRig;
uniform float uSkinning,uCharacterUVAngle,uCharacterNormalize;
uniform vec4 uBones[48],uPalette[17];
uniform mat4 uCharacterRoot;
uniform mat3 uCharacterNormal;
void sfCharacterSkin(inout vec3 p,inout vec3 n,inout vec3 color,inout vec2 uv){
    if(uSkinning<.5)return;
    int a=int(aRig.x)*3,b=int(aRig.y)*3;
    vec4 point=vec4(p,1.);vec4 normal=vec4(n,0.);
    vec3 pa=vec3(dot(uBones[a],point),dot(uBones[a+1],point),dot(uBones[a+2],point));
    vec3 pb=vec3(dot(uBones[b],point),dot(uBones[b+1],point),dot(uBones[b+2],point));
    vec3 na=vec3(dot(uBones[a],normal),dot(uBones[a+1],normal),dot(uBones[a+2],normal));
    vec3 nb=vec3(dot(uBones[b],normal),dot(uBones[b+1],normal),dot(uBones[b+2],normal));
    p=(uCharacterRoot*vec4(mix(pa,pb,aRig.z),1.)).xyz;
    n=uCharacterNormal*mix(na,nb,aRig.z);
    if(uCharacterNormalize>.5)n=normalize(n);
    if(aRig.w>=0.){vec4 slot=uPalette[int(aRig.w)];color*=slot.rgb;uv=slot.a>1.5?vec2(-1.25,.22):slot.a>.5?vec2(-1.4,.4):vec2(-1.,-1.);}
    if(uv.x<=-2.)uv.y+=uCharacterUVAngle;
}
`;
/** The ordinary world shader is unchanged after its vertex inputs are posed. */
export function characterVertexShader(source: string) {
  const marker = 'void main(){',
    at = source.indexOf(marker);
  if (at < 0) throw Error('World vertex shader is missing main');
  const body = source
    .slice(at + marker.length)
    .replace(/\baPosition\b/g, 'position')
    .replace(/\baNormal\b/g, 'normal')
    .replace(/\baColor\b/g, 'color')
    .replace(/\baUV\b/g, 'uv');
  return (
    source.slice(0, at) +
    CHARACTER_SKIN_GLSL +
    marker +
    'vec3 position=aPosition,normal=aNormal,color=aColor;vec2 uv=aUV;sfCharacterSkin(position,normal,color,uv);' +
    body
  );
}
export function packCharacterMesh(mesh: SkinnedMesh) {
  const count = mesh.bonesA.length,
    data = new Float32Array(count * 15);
  for (let id = 0; id < count; id++) {
    const k = id * 15;
    data.set(mesh.vertices.subarray(id * 6, id * 6 + 6), k);
    const slot = mesh.slots[id],
      shade = mesh.shades[id];
    for (let c = 0; c < 3; c++) data[k + 6 + c] = (slot < 0 ? mesh.colors![id * 3 + c] : 1) * shade;
    data[k + 9] = mesh.uv?.[id * 2] ?? -1;
    data[k + 10] = mesh.uv?.[id * 2 + 1] ?? -1;
    data[k + 11] = mesh.bonesA[id];
    data[k + 12] = mesh.bonesB[id];
    data[k + 13] = mesh.weights[id];
    data[k + 14] = slot;
  }
  return data;
}
const rigidMeshes = new WeakMap<number[] | Float32Array, Map<number, SkinnedMesh>>();
export function rigidCharacterMesh(data: number[] | Float32Array, bone: number, cacheKey: string) {
  let byBone = rigidMeshes.get(data);
  if (!byBone) {
    byBone = new Map();
    rigidMeshes.set(data, byBone);
  }
  if (byBone.has(bone)) return byBone.get(bone)!;
  const count = data.length / 11,
    vertices = new Float32Array(count * 6),
    colors = new Float32Array(count * 3),
    uv = new Float32Array(count * 2),
    indices = new Uint16Array(count);
  if (count > 65535) throw Error('Rigid wearable exceeds 16-bit vertex limit');
  for (let i = 0; i < count; i++) {
    vertices.set(data.slice(i * 11, i * 11 + 6), i * 6);
    colors.set(data.slice(i * 11 + 6, i * 11 + 9), i * 3);
    uv.set(data.slice(i * 11 + 9, i * 11 + 11), i * 2);
    indices[i] = i;
  }
  const mesh = {
    vertices,
    colors,
    uv,
    indices,
    bonesA: new Uint8Array(count).fill(bone),
    bonesB: new Uint8Array(count).fill(bone),
    weights: new Float32Array(count),
    slots: new Int8Array(count).fill(-1),
    shades: new Float32Array(count).fill(1),
    cacheKey,
  };
  byBone.set(bone, mesh);
  return mesh;
}

/** GPU geometry is immutable between asset changes. Each frame submits only
 * bone rows, placement and palette; draw records and pose arrays are pooled. */
export function createCharacterBatch() {
  const pool: CharacterDraw[] = [],
    records: CharacterDraw[] = [];
  let used = 0;
  function begin() {
    used = 0;
    records.length = 0;
    return batch;
  }
  function add(
    m: Mesh,
    mesh: SkinnedMesh,
    bones: Float32Array,
    palette: Float32Array,
    { x, z, base, angle, height = 1, indices = mesh.indices }: CharacterPlacement,
  ) {
    let draw = pool[used++];
    if (!draw) {
      draw = {
        bones: new Float32Array(192),
        root: new Float32Array(16),
        normal: new Float32Array(9),
        mesh,
        palette,
        indices,
        marker: m.data.length,
        pickMesh: null,
        uvAngle: 0,
        normalizeNormals: false,
      };
      pool.push(draw);
    }
    Object.assign(draw, {
      mesh,
      palette,
      indices,
      marker: m.data.length,
      pickMesh: null,
      uvAngle: 0,
      normalizeNormals: false,
    });
    draw.bones.set(bones);
    characterRoot(x, base, z, angle, height, draw.root);
    characterNormal(draw.root, draw.normal);
    records.push(draw);
    // A degenerate triangle preserves dynamic range ordering without
    // generating body triangles on the CPU. It produces no fragments.
    for (let i = 0; i < 3; i++) m.data.push(x, base, z, 0, 1, 0, 0, 0, 0, -1, -1);
    return draw;
  }
  const batch = {
    records,
    begin,
    add,
    transform(
      start: number,
      matrix: Float32Array<ArrayBuffer> | readonly number[] | Float64Array<ArrayBufferLike>,
      uvAngle = 0,
      normalizeNormals = false,
    ) {
      for (const draw of records)
        if (draw.marker >= start) {
          draw.root.set(matrixMultiply(matrix, draw.root));
          characterNormal(draw.root, draw.normal);
          draw.uvAngle += uvAngle;
          draw.normalizeNormals ||= normalizeNormals;
          draw.pickMesh = null;
        }
    },
    range(start: number, end: number) {
      return records.filter((r) => r.marker >= start && r.marker < end);
    },
  };
  return batch;
}

/** Bounded LRU of static VBOs/indices/VAOs. Visible assets are protected during
 * a frame. Clock/flame cache keys replace their old revision, not accumulate. */
export function createCharacterGPU(
  gl: WebGLRenderingContext,
  program: WebGLProgram & Pick<ShaderProgram, 'position' | 'normal' | 'color' | 'uv'>,
  { maxBytes = 64 * 1048576 }: { maxBytes?: number } | undefined = {},
) {
  const vao = gl.getExtension('OES_vertex_array_object'),
    cache = new Map<string | SkinnedMesh, GPUEntry>(),
    batch = createCharacterBatch();
  interface GPUEntry {
    mesh: SkinnedMesh;
    frame: number;
    buffer: WebGLBuffer | null;
    indices: WebGLBuffer | null;
    bytes: number;
    vertexBytes: number;
    indexBytes: number;
    vao?: WebGLVertexArrayObjectOES | null;
    head?: WebGLBuffer | null;
  }
  let frame = 0;
  const rig = gl.getAttribLocation(program, 'aRig'),
    locations = {
      enabled: gl.getUniformLocation(program, 'uSkinning'),
      bones: gl.getUniformLocation(program, 'uBones[0]'),
      palette: gl.getUniformLocation(program, 'uPalette[0]'),
      root: gl.getUniformLocation(program, 'uCharacterRoot'),
      normal: gl.getUniformLocation(program, 'uCharacterNormal'),
      uvAngle: gl.getUniformLocation(program, 'uCharacterUVAngle'),
      normalize: gl.getUniformLocation(program, 'uCharacterNormalize'),
    };
  const stats = {
    enabled: true,
    bytes: 0,
    entries: 0,
    hits: 0,
    uploads: 0,
    uploadedBytes: 0,
    draws: 0,
    characters: 0,
    poseBytes: 0,
    evictions: 0,
  };
  function disposeEntry(entry: GPUEntry) {
    if (entry.vao && vao) vao.deleteVertexArrayOES(entry.vao);
    gl.deleteBuffer(entry.buffer);
    gl.deleteBuffer(entry.indices);
    gl.deleteBuffer(entry.head || null);
    stats.bytes -= entry.bytes;
    stats.evictions++;
  }
  function attributes(entry: { buffer: WebGLBuffer | null; indices: WebGLBuffer | null }) {
    gl.bindBuffer(gl.ARRAY_BUFFER, entry.buffer);
    for (const [location, size, offset] of [
      [program.position, 3, 0],
      [program.normal, 3, 12],
      [program.color, 3, 24],
      [program.uv, 2, 36],
      [rig, 4, 44] satisfies [number, number, number],
    ]) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 60, offset);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.indices);
  }
  function get(mesh: SkinnedMesh) {
    const key = mesh.cacheKey || mesh;
    let entry = cache.get(key);
    if (entry && entry.mesh !== mesh) {
      const data = packCharacterMesh(mesh),
        bytes = data.byteLength + mesh.indices.byteLength;
      if (vao) vao.bindVertexArrayOES(entry.vao || null);
      gl.bindBuffer(gl.ARRAY_BUFFER, entry.buffer);
      if (data.byteLength === entry.vertexBytes) gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
      else gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.indices);
      if (mesh.indices.byteLength === entry.indexBytes)
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, mesh.indices);
      else gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
      if (entry.head) {
        gl.deleteBuffer(entry.head || null);
        entry.head = null;
      }
      if (vao) vao.bindVertexArrayOES(null);
      stats.bytes += bytes - entry.bytes;
      stats.uploads++;
      stats.uploadedBytes += bytes;
      Object.assign(entry, {
        mesh,
        bytes,
        vertexBytes: data.byteLength,
        indexBytes: mesh.indices.byteLength,
      });
    }
    if (entry) {
      stats.hits++;
      entry.frame = frame;
      cache.delete(key);
      cache.set(key, entry);
      return entry;
    }
    const data = packCharacterMesh(mesh);
    entry = {
      mesh,
      frame,
      buffer: gl.createBuffer(),
      indices: gl.createBuffer(),
      bytes: data.byteLength + mesh.indices.byteLength,
      vertexBytes: data.byteLength,
      indexBytes: mesh.indices.byteLength,
    };
    if (vao) {
      entry.vao = vao.createVertexArrayOES();
      vao.bindVertexArrayOES(entry.vao || null);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, entry.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    attributes(entry);
    if (vao) vao.bindVertexArrayOES(null);
    cache.set(key, entry);
    stats.bytes += entry.bytes;
    stats.uploads++;
    stats.uploadedBytes += entry.bytes;
    stats.entries = cache.size;
    return entry;
  }
  function draw() {
    if (!batch.records.length) return;
    gl.uniform1f(locations.enabled, 1);
    let palette: Float32Array | null = null;
    for (const record of batch.records) {
      const entry = get(record.mesh);
      if (vao) vao.bindVertexArrayOES(entry.vao || null);
      else attributes(entry);
      if (palette !== record.palette) {
        gl.uniform4fv(locations.palette, record.palette);
        palette = record.palette;
      }
      gl.uniform4fv(locations.bones, record.bones);
      gl.uniformMatrix4fv(locations.root, false, record.root);
      gl.uniformMatrix3fv(locations.normal, false, record.normal);
      gl.uniform1f(locations.uvAngle, record.uvAngle);
      gl.uniform1f(locations.normalize, record.normalizeNormals ? 1 : 0);
      let indices = entry.indices;
      if (record.indices !== record.mesh.indices) {
        if (!entry.head) {
          entry.head = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.head);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(record.indices), gl.STATIC_DRAW);
          entry.bytes += record.indices.length * 2;
          stats.bytes += record.indices.length * 2;
          stats.uploadedBytes += record.indices.length * 2;
          stats.uploads++;
        }
        indices = entry.head;
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
      gl.drawElements(gl.TRIANGLES, record.indices.length, gl.UNSIGNED_SHORT, 0);
      stats.draws++;
      stats.poseBytes +=
        record.bones.byteLength + record.root.byteLength + record.normal.byteLength;
    }
    if (vao) vao.bindVertexArrayOES(null);
    else gl.disableVertexAttribArray(rig);
    gl.uniform1f(locations.enabled, 0);
    stats.entries = cache.size;
    for (const [key, entry] of cache) {
      if (stats.bytes <= maxBytes) break;
      if (entry.frame === frame) continue;
      disposeEntry(entry);
      cache.delete(key);
    }
    stats.entries = cache.size;
  }
  return {
    stats,
    batch,
    begin() {
      frame++;
      stats.draws = stats.characters = stats.poseBytes = 0;
      return batch.begin();
    },
    draw() {
      stats.characters = batch.records.filter((r) => !r.mesh.colors).length;
      draw();
    },
    dispose() {
      for (const entry of cache.values()) disposeEntry(entry);
      cache.clear();
      stats.entries = 0;
      batch.begin();
    },
  };
}
