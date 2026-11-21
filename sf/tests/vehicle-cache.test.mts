import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.ts';
import { createCharacterBatch } from '../rendering/character-gpu.ts';
import { characterPickMesh } from '../rendering/character-frame.ts';
import { drawAirship } from '../airship.ts';
import { drawFerrari } from '../ferrari.ts';
import { drawStreetcar } from '../life.ts';
import { drawReusableRocket } from '../rocket.ts';

const cases = {
  airship: (m: Mesh) => drawAirship(m, { x: 3, y: 12, z: -2 }, 0.7, 500),
  ferrari: (m: Mesh) => drawFerrari(m, { x: 3, y: 2, z: 5, angle: 0.7 }, { travel: 4 }),
  streetcar: (m: Mesh) => drawStreetcar(m, 3, 2, 5, 0.7),
  rocket: (m: Mesh) => drawReusableRocket(m, { x: 3, y: 2, z: 5 }, 500),
};
for (const [name, draw] of Object.entries(cases))
  test(name + ' cached opaque parts preserve transformed geometry, glass, and selection', () => {
    const cpu = new Mesh(),
      gpu = new Mesh();
    gpu.characters = createCharacterBatch().begin();
    draw(cpu);
    draw(gpu);
    const records = new Map(gpu.characters.records.map((record) => [record.marker, record]));
    const reconstructed: number[] = [];
    for (let at = 0; at < gpu.data.length; at += 33) {
      const record = records.get(at);
      if (record) {
        const mesh = characterPickMesh(record);
        for (const id of mesh.indices)
          for (let k = 0; k < 11; k++) reconstructed.push(mesh.data[id * 11 + k]);
      } else for (let k = 0; k < 33; k++) reconstructed.push(gpu.data[at + k]);
    }
    assert.equal(reconstructed.length, cpu.data.length);
    for (let i = 0; i < reconstructed.length; i++)
      assert.ok(Math.abs(reconstructed[i] - cpu.data[i]) < 0.00008, 'posed vertex ' + i);
    assert.ok(
      gpu.data.length < cpu.data.length / 5,
      'opaque triangles stay out of dynamic uploads',
    );
    const shape = gpu.characters.records.map((r) => r.mesh);
    gpu.data.length = 0;
    gpu.characters.begin();
    draw(gpu);
    assert.deepEqual(
      gpu.characters.records.map((r) => r.mesh),
      shape,
      'subsequent frames reuse the rigid shape',
    );
  });
