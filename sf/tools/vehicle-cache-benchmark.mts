import { Mesh } from '../geometry.ts';
import { createCharacterBatch } from '../rendering/character-gpu.ts';
import { drawAirship } from '../airship.ts';
import { drawFerrari } from '../ferrari.ts';
import { drawStreetcar } from '../life.ts';
import { drawReusableRocket } from '../rocket.ts';

// Measures CPU frame construction only; it does not measure GPU draw time/FPS.
const cases = {
  airship: (m: Mesh, t: number) => drawAirship(m, { x: 3, y: 12, z: -2 }, 0.7, t),
  ferrari: (m: Mesh, t: number) =>
    drawFerrari(m, { x: 3, y: 2, z: 5, angle: 0.7 }, { travel: t / 100 }),
  streetcar: (m: Mesh) => drawStreetcar(m, 3, 2, 5, 0.7),
  rocket: (m: Mesh, t: number) => drawReusableRocket(m, { x: 3, y: 2, z: 5 }, t),
};
const report = [];
for (const [name, draw] of Object.entries(cases)) {
  const times: Record<
    string,
    { msPerFrame: number; dynamicVertices: number; cachedDraws: number }
  > = {};
  for (const mode of ['cpu', 'gpu'] satisfies [string, string]) {
    const mesh = new Mesh();
    if (mode === 'gpu') mesh.characters = createCharacterBatch();
    const frame = (t: number) => {
      mesh.data.length = 0;
      mesh.characters?.begin();
      draw(mesh, t);
    };
    for (let i = 0; i < 10; i++) frame(i * 16);
    const start = performance.now(),
      frames = 100;
    for (let i = 0; i < frames; i++) frame(i * 16);
    times[mode] = {
      msPerFrame: +((performance.now() - start) / frames).toFixed(4),
      dynamicVertices: mesh.data.length / 11,
      cachedDraws: mesh.characters?.records.length || 0,
    };
  }
  report.push({ name, ...times });
}
console.log(
  JSON.stringify(
    { note: 'Warm CPU geometry construction, not total rendering FPS.', vehicles: report },
    null,
    2,
  ),
);
