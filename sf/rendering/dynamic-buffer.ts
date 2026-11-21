/** Reuse staging storage and rotate GPU buffers, leaving earlier frames free
 * to finish drawing. Allocate again only when a slot needs more capacity. */
export function createDynamicGeometry(
  gl: WebGLRenderingContext,
  { ringSize = 3 }: { ringSize?: number } = {},
) {
  const slots = Array.from({ length: ringSize }, () => ({ buffer: gl.createBuffer(), bytes: 0 }));
  let index = 0,
    staging = new Float32Array(0);
  const gpu = {
    buffer: slots[0].buffer,
    count: 0,
    stats: { capacityBytes: 0, uploadedBytes: 0, allocations: 0 },
    upload(data: ArrayLike<number>) {
      if (staging.length < data.length)
        staging = new Float32Array(Math.ceil((data.length * 1.25) / 11) * 11);
      staging.set(data);
      const slot = slots[index++ % slots.length],
        bytes = data.length * 4;
      gpu.buffer = slot.buffer;
      gpu.count = data.length / 11;
      gl.bindBuffer(gl.ARRAY_BUFFER, slot.buffer);
      if (slot.bytes < bytes) {
        const capacity = staging.byteLength;
        gl.bufferData(gl.ARRAY_BUFFER, capacity, gl.DYNAMIC_DRAW);
        gpu.stats.capacityBytes += capacity - slot.bytes;
        slot.bytes = capacity;
        gpu.stats.allocations++;
      }
      if (bytes) gl.bufferSubData(gl.ARRAY_BUFFER, 0, staging.subarray(0, data.length));
      gpu.stats.uploadedBytes = bytes;
    },
    dispose() {
      for (const slot of slots) gl.deleteBuffer(slot.buffer);
      gpu.count = 0;
      gpu.stats.capacityBytes = 0;
      staging = new Float32Array(0);
    },
  };
  return gpu;
}
