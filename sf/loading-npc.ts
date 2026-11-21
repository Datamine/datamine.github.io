import type { NumericVector } from './types/geometry.ts';
import { Mesh, matrixMultiply, unit, sub, cross, dot } from './geometry.ts';
import type { CharacterPose } from './characters.ts';
import { createCharacterPose, sampleCharacterPose, drawCharacter } from './characters.ts';
import { getHatGeometry } from './hat-models.ts';

const loadingCycle = 18;
const loadingEase = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
const loadingMix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

/** A presentation-only clip on the game's original skeleton. Sitting uses
 * the same rest animation as X in the world; the hat is the actual Panama. */
export function sampleLoadingNPC(seconds: number, out = createCharacterPose()) {
  const t = ((seconds % loadingCycle) + loadingCycle) % loadingCycle;
  const sit = loadingEase((t - 13.4) / 1.1) * (1 - loadingEase((t - 16.2) / 1.1));
  const watch = loadingEase((t - 4) / 0.55) * (1 - loadingEase((t - 6) / 0.55));
  const tap = t < 3.7 ? Math.max(0, Math.sin((t * Math.PI * 2) / 0.7)) ** 2 : 0;
  const side = [0.46, 0.75 - 0.4 * sit, 0.02 + 0.16 * sit] satisfies [number, number, number],
    overHead = [0, 1.83, -0.02] satisfies [number, number, number],
    onHead = [0, 1.715, -0.02] satisfies [number, number, number];
  let hat: number[] = side,
    grip = 0;
  if (t >= 7.1 && t < 8.65) {
    grip = loadingEase((t - 7.1) / 1.55);
    hat = loadingMix(side, overHead, grip);
    hat[0] += 0.25 * Math.sin(grip * Math.PI);
  } else if (t >= 8.65 && t < 9.1) {
    grip = 1;
    hat = loadingMix(overHead, onHead, loadingEase((t - 8.65) / 0.45));
  } else if (t >= 9.1 && t < 11.3) {
    grip = 1;
    hat = onHead;
  } else if (t >= 11.3 && t < 11.75) {
    grip = 1;
    hat = loadingMix(onHead, overHead, loadingEase((t - 11.3) / 0.45));
  } else if (t >= 11.75 && t < 13.1) {
    grip = 1 - loadingEase((t - 11.75) / 1.35);
    hat = loadingMix(side, overHead, grip);
    hat[0] += 0.25 * Math.sin(grip * Math.PI);
  }
  const handOnHat = [hat[0] - 0.16 + 0.32 * grip, hat[1] + 0.05, hat[2]] satisfies [
    number,
    number,
    number,
  ];
  const relaxed = [0.3, 0.8 - 0.36 * sit, 0.04 + 0.2 * sit] satisfies [number, number, number];
  const handAway = loadingEase((t - 9.2) / 0.45) * (1 - loadingEase((t - 10.8) / 0.45));
  const waiting = {
    tap,
    watch,
    rightWrist: loadingMix(handOnHat, relaxed, handAway),
    leftWrist: loadingMix(
      [-0.24, 0.8 - 0.36 * sit, 0.04 + 0.2 * sit] satisfies [number, number, number],
      [-0.08, 1.16, 0.3] satisfies [number, number, number],
      watch,
    ),
  };
  const pose = sampleCharacterPose('rest', 0, { sitBlend: sit, time: seconds, waiting }, out);
  const hatContact = loadingEase((t - 8.65) / 0.45) * (1 - loadingEase((t - 11.3) / 0.45));
  return { pose, hat, hatContact, sit, watch, tap, time: t };
}

/** Attach an accessory to the same bone matrices used for character skinning.
 * source vertices are in bind space; the character's world transform follows. */
function loadingAttachment(
  target: Mesh,
  source: NumericVector,
  pose: CharacterPose,
  bone: number,
  angle: number,
) {
  const matrix = pose.matrices,
    k = bone * 12,
    c = Math.cos(angle),
    s = Math.sin(angle);
  for (let i = 0; i < source.length; i += 11) {
    const x = source[i],
      y = source[i + 1],
      z = source[i + 2],
      nx = source[i + 3],
      ny = source[i + 4],
      nz = source[i + 5];
    const px = matrix[k] * x + matrix[k + 1] * y + matrix[k + 2] * z + matrix[k + 3],
      py = matrix[k + 4] * x + matrix[k + 5] * y + matrix[k + 6] * z + matrix[k + 7],
      pz = matrix[k + 8] * x + matrix[k + 9] * y + matrix[k + 10] * z + matrix[k + 11];
    const ax = matrix[k] * nx + matrix[k + 1] * ny + matrix[k + 2] * nz,
      ay = matrix[k + 4] * nx + matrix[k + 5] * ny + matrix[k + 6] * nz,
      az = matrix[k + 8] * nx + matrix[k + 9] * ny + matrix[k + 10] * nz;
    target.data.push(
      px * s + pz * c,
      py,
      -px * c + pz * s,
      ax * s + az * c,
      ay,
      -ax * c + az * s,
      ...source.slice(i + 6, i + 11),
    );
  }
}

export function createLoadingNPCMesh() {
  const pose = createCharacterPose(),
    watch = new Mesh(),
    angle = 1.5,
    hat = getHatGeometry('panama')!.mesh.data;
  watch.box(-0.283, 0.775, 0.015, 0.076, 0.04, 0.065, '#514536');
  watch.sphere(-0.245, 0.795, 0.054, 0.025, 0.025, 0.009, '#e0c88f', 12, 6);
  watch.rod(
    [-0.245, 0.795, 0.065] satisfies [number, number, number],
    [-0.245, 0.812, 0.065] satisfies [number, number, number],
    0.0028,
    '#4b5146',
    4,
  );
  watch.rod(
    [-0.245, 0.795, 0.065] satisfies [number, number, number],
    [-0.233, 0.788, 0.065] satisfies [number, number, number],
    0.0028,
    '#4b5146',
    4,
  );
  return (seconds: number) => {
    const sample = sampleLoadingNPC(seconds, pose),
      m = new Mesh();
    // Identical mesh, palette, hairstyle, skinning and normals to in-world NPCs.
    drawCharacter(m, 0, 0, 0, angle, 0, false, '#bd9369', '#707b4b', {
      pants: '#626955',
      hair: '#453a30',
      shoes: '#3c3d36',
      hairstyle: 'short',
      backpack: false,
      mode: 'rest',
      pose: sample.pose,
    });
    loadingAttachment(m, watch.data, sample.pose, 5, angle);
    const c = Math.cos(angle),
      s = Math.sin(angle),
      h = sample.hat,
      head = sample.pose.matrices,
      k = 3 * 12,
      contact = sample.hatContact;
    for (let i = 0; i < hat.length; i += 11) {
      let x = hat[i] + h[0],
        y = hat[i + 1] + h[1],
        z = hat[i + 2] + h[2],
        nx = hat[i + 3],
        ny = hat[i + 4],
        nz = hat[i + 5];
      if (contact) {
        // Once worn, the hat follows head bone 3 exactly as it does
        // on an equipped character, including the subtle idle motion.
        const bx = hat[i],
          by = hat[i + 1] + 1.715,
          bz = hat[i + 2] - 0.02;
        x += (head[k] * bx + head[k + 1] * by + head[k + 2] * bz + head[k + 3] - x) * contact;
        y += (head[k + 4] * bx + head[k + 5] * by + head[k + 6] * bz + head[k + 7] - y) * contact;
        z += (head[k + 8] * bx + head[k + 9] * by + head[k + 10] * bz + head[k + 11] - z) * contact;
        nx +=
          (head[k] * hat[i + 3] + head[k + 1] * hat[i + 4] + head[k + 2] * hat[i + 5] - nx) *
          contact;
        ny +=
          (head[k + 4] * hat[i + 3] + head[k + 5] * hat[i + 4] + head[k + 6] * hat[i + 5] - ny) *
          contact;
        nz +=
          (head[k + 8] * hat[i + 3] + head[k + 9] * hat[i + 4] + head[k + 10] * hat[i + 5] - nz) *
          contact;
      }
      m.data.push(
        x * s + z * c,
        y,
        -x * c + z * s,
        nx * s + nz * c,
        ny,
        -nx * c + nz * s,
        ...hat.slice(i + 6, i + 11),
      );
    }
    // A small contact shadow anchors the feet without a separate backdrop.
    m.cylinder(0, -0.025, 0, 0.45, 0.023, '#243b32', 32, 0.45);
    return m;
  };
}

/** A tiny, texture-free WebGL viewport: independent of map downloads, with
 * one dynamic buffer and one draw call. Nothing runs once the loader hides. */
export function createLoadingNPC(inputCanvas: HTMLCanvasElement | null) {
  if (!inputCanvas) return null;
  const canvas = inputCanvas;
  let inputGl: WebGLRenderingContext | null = null;
  try {
    inputGl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch {}
  if (!inputGl) {
    canvas.hidden = true;
    return null;
  }
  const gl = inputGl;
  const makeMesh = createLoadingNPCMesh(),
    motion = matchMedia('(prefers-reduced-motion: reduce)');
  let program: WebGLProgram | null = null,
    buffer: WebGLBuffer | null = null,
    matrixLocation: WebGLUniformLocation | null,
    frame = 0,
    running = false,
    disposed = false,
    started = 0,
    last = -Infinity,
    elapsed = 0,
    staging = new Float32Array(0);
  function initialize() {
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type);
      if (!s) throw new Error('Could not allocate loading shader');
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw Error(message || 'Loading shader compilation failed');
      }
      return s;
    };
    const vertex = shader(
      gl.VERTEX_SHADER,
      'attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uVP;varying vec3 vColor;void main(){vec3 n=normalize(aNormal);float light=.64+.36*max(0.,dot(n,normalize(vec3(-.45,.85,.55))));vColor=aColor*light;gl_Position=uVP*vec4(aPosition,1.);}',
    );
    const fragment = shader(
      gl.FRAGMENT_SHADER,
      'precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.);}',
    );
    const createdProgram = gl.createProgram();
    if (!createdProgram) throw new Error('Could not allocate loading graphics');
    program = createdProgram;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    for (const [i, name] of (
      ['aPosition', 'aNormal', 'aColor'] satisfies [string, string, string]
    ).entries())
      gl.bindAttribLocation(program, i, name);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program) || 'Loading graphics could not link');
    buffer = gl.createBuffer();
    matrixLocation = gl.getUniformLocation(program, 'uVP');
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
  }
  function draw(seconds: number) {
    if (disposed || gl.isContextLost()) return;
    const ratio = Math.min(1.5, devicePixelRatio || 1),
      width = Math.round(192 * ratio),
      height = Math.round(208 * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const eye = [3, 2.4, 4] satisfies [number, number, number],
      target = [0, 1.02, 0] satisfies [number, number, number],
      b = unit(sub(eye, target)),
      r = unit(cross([0, 1, 0] satisfies [number, number, number], b)),
      u = cross(b, r),
      half = 1.22;
    const view = new Float32Array([
      r[0],
      u[0],
      b[0],
      0,
      r[1],
      u[1],
      b[1],
      0,
      r[2],
      u[2],
      b[2],
      0,
      -dot(r, eye),
      -dot(u, eye),
      -dot(b, eye),
      1,
    ] satisfies [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ]);
    const projection = new Float32Array([
      height / width / half,
      0,
      0,
      0,
      0,
      1 / half,
      0,
      0,
      0,
      0,
      -0.1,
      0,
      0,
      0,
      0,
      1,
    ] satisfies [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ]);
    const mesh = makeMesh(seconds);
    if (staging.length < mesh.data.length)
      staging = new Float32Array(Math.ceil(mesh.data.length * 1.2));
    staging.set(mesh.data);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniformMatrix4fv(matrixLocation, false, matrixMultiply(projection, view));
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, staging.subarray(0, mesh.data.length), gl.DYNAMIC_DRAW);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 44, i * 12);
    }
    gl.drawArrays(gl.TRIANGLES, 0, mesh.data.length / 11);
  }
  function animate(t: number) {
    frame = 0;
    if (!running || disposed || document.hidden) return;
    if (t - last >= 1000 / 24) {
      elapsed = (t - started) / 1000;
      draw(elapsed);
      last = t;
    }
    if (!motion.matches) frame = requestAnimationFrame(animate);
  }
  function start() {
    if (disposed || running) return;
    running = true;
    started = performance.now() - elapsed * 1000;
    last = -Infinity;
    draw(motion.matches ? 0 : elapsed);
    if (!document.hidden && !motion.matches) frame = requestAnimationFrame(animate);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(frame);
    frame = 0;
  }
  function visibility() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (running && !document.hidden) {
      started = performance.now() - elapsed * 1000;
      last = -Infinity;
      if (!motion.matches) frame = requestAnimationFrame(animate);
    }
  }
  function preference() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (running) {
      draw(motion.matches ? 0 : elapsed);
      visibility();
    }
  }
  function lost(event: { preventDefault: () => void }) {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
  }
  function restored() {
    initialize();
    if (running) {
      draw(elapsed);
      visibility();
    }
  }
  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    document.removeEventListener('visibilitychange', visibility);
    motion.removeEventListener('change', preference);
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
    window.removeEventListener('pagehide', dispose);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  }
  try {
    initialize();
  } catch {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    canvas.hidden = true;
    return null;
  }
  document.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', preference);
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  window.addEventListener('pagehide', dispose);
  return { start, stop, dispose, draw };
}
