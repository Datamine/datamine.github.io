import { Mesh } from '../geometry.ts';
import { GLASS_UV } from '../glazing.ts';
import { rigidCharacterMesh } from './character-gpu.ts';

interface GeometryRun {
  glass: boolean;
  data: number[];
}
interface GeometryTemplate {
  data: number[];
  runs: (GeometryRun & { mesh: ReturnType<typeof rigidCharacterMesh> | null })[];
}
const templates = new Map<string, GeometryTemplate>(),
  palette = new Float32Array(68),
  bones = new Float32Array(192);
for (let bone = 0; bone < 16; bone++)
  for (let axis = 0; axis < 3; axis++) bones[bone * 12 + axis * 4 + axis] = 1;

/** Cache rigid local geometry. Transparent runs remain in the existing sorted
 * glass pass; opaque runs become static GPU draws. Animation is supplied by
 * parent transforms, so propellers, wheel spokes and radar can keep moving. */
export function drawCachedMesh(target: Mesh, key: string, build: (mesh: Mesh) => void) {
  let template = templates.get(key);
  if (!template) {
    const mesh = new Mesh();
    build(mesh);
    const runs: GeometryRun[] = [];
    for (let at = 0; at < mesh.data.length; at += 33) {
      const glass = Math.abs(mesh.data[at + 9] - GLASS_UV) < 0.015;
      let run = runs.at(-1);
      if (!run || run.glass !== glass) {
        run = { glass, data: [] };
        runs.push(run);
      }
      for (let field = 0; field < 33; field++) run.data.push(mesh.data[at + field]);
    }
    template = {
      data: mesh.data,
      runs: runs.map((run, index) => ({
        ...run,
        mesh: run.glass ? null : rigidCharacterMesh(run.data, 0, 'prop:' + key + ':' + index),
      })),
    };
    if (templates.size >= 128) templates.delete(templates.keys().next().value!);
    templates.set(key, template);
  }
  if (!target.characters) {
    for (const value of template.data) target.data.push(value);
    return;
  }
  for (const run of template.runs) {
    if (run.glass) {
      for (const value of run.data) target.data.push(value);
    } else
      target.characters.add(target, run.mesh!, bones, palette, {
        x: 0,
        z: 0,
        base: 0,
        angle: Math.PI / 2,
      });
  }
}
