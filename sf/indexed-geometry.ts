/** Exact deduplication: all eleven Float32 fields must match bit-for-bit.
 * Triangle order, sharp normals, UV seams and original vertex ranges survive.
 * Runs at build time; clients only decode the resulting typed arrays. */
export function indexStaticGeometry(data: Float32Array) {
  const count = data.length / 11,
    bits = new Uint32Array(data.buffer, data.byteOffset, data.length),
    heads = new Map<number, number>(),
    links = new Int32Array(count),
    representatives = new Uint32Array(count),
    indices = new Uint32Array(count);
  let unique = 0;
  for (let vertex = 0; vertex < count; vertex++) {
    const offset = vertex * 11;
    let hash = 2166136261;
    for (let field = 0; field < 11; field++)
      hash = Math.imul(hash ^ bits[offset + field], 16777619);
    let found = -1;
    for (let candidate = heads.get(hash) ?? -1; candidate !== -1; candidate = links[candidate]) {
      const source = representatives[candidate] * 11;
      let equal = true;
      for (let field = 0; field < 11; field++)
        if (bits[source + field] !== bits[offset + field]) {
          equal = false;
          break;
        }
      if (equal) {
        found = candidate;
        break;
      }
    }
    if (found === -1) {
      found = unique++;
      representatives[found] = vertex;
      links[found] = heads.get(hash) ?? -1;
      heads.set(hash, found);
    }
    indices[vertex] = found;
  }
  const Index = unique <= 65536 ? Uint16Array : Uint32Array,
    indexBytes = count * Index.BYTES_PER_ELEMENT;
  if (unique * 44 + indexBytes >= data.byteLength) return { data, indices: null };
  const vertices = new Float32Array(unique * 11),
    target = new Uint32Array(vertices.buffer);
  for (let i = 0; i < unique; i++)
    target.set(bits.subarray(representatives[i] * 11, representatives[i] * 11 + 11), i * 11);
  return { data: vertices, indices: new Index(indices) };
}

/** Compatibility path for WebGL 1 hardware without 32-bit element indices. */
export function expandIndexedVertices(
  data: { subarray: (arg0: number, arg1: number) => ArrayLike<number> },
  indices: ArrayLike<number>,
) {
  const expanded = new Float32Array(indices.length * 11);
  for (let i = 0; i < indices.length; i++)
    expanded.set(data.subarray(indices[i] * 11, indices[i] * 11 + 11), i * 11);
  return expanded;
}
