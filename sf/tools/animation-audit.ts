import { requiredValue } from '../types/assert.ts';
declare global {
  interface Window {
    animationAudit: { frames: number; total: number; clips: number; time: number; ready: boolean };
  }
}
import { Mesh, matrixMultiply, unit, sub, cross, dot } from '../geometry.ts';
import { drawRemotePlayer } from '../remote-player-models.ts';
import { createActorAnimation } from '../animation-presentation.ts';
import { characterAppearance, normalizeCharacter } from '../character-config.ts';
import { createLoadingNPCMesh } from '../loading-npc.ts';
import { drawBison } from '../bison-model.ts';
import { SF_FITNESS } from '../southern-layout.ts';
const clips = [
  ['Walk', 'walk'] satisfies [string, string],
  ['Dance', 'dance'] satisfies [string, string],
  ['Bicycle', 'bike'] satisfies [string, string],
  ['Forward roll', 'roll'] satisfies [string, string],
  ['Sit / stand', 'sit'] satisfies [string, string],
  ['Railgun', 'walk', 'attack'] satisfies [string, string, string],
  ['Capture', 'walk', 'caught'] satisfies [string, string, string],
  ['Gondola', 'gondola'] satisfies [string, string],
  ['Ski / flip', 'ski'] satisfies [string, string],
  ['Motorcycle', 'motorcycle'] satisfies [string, string],
  ['Ferrari', 'ferrari'] satisfies [string, string],
  ['Skateboard', 'skateboard'] satisfies [string, string],
  ['Windsurf', 'surf', 'windsurf'] satisfies [string, string, string],
  ['Paddle', 'surf', 'paddle'] satisfies [string, string, string],
  ['Surfboard', 'surf', 'surfboard'] satisfies [string, string, string],
  ['B-2 barrel roll', 'bomber'] satisfies [string, string],
  ['Parachute', 'parachute'] satisfies [string, string],
  ['Teleport', 'teleport'] satisfies [string, string],
  ['Pet bear', 'walk', 'pet-bear'] satisfies [string, string, string],
  ['Drink', 'walk', 'drink'] satisfies [string, string, string],
  ['Talk', 'walk', 'talk'] satisfies [string, string, string],
  ['Work', 'walk', 'work'] satisfies [string, string, string],
  ['Eat', 'walk', 'eat'] satisfies [string, string, string],
  ['Fish', 'walk', 'fish'] satisfies [string, string, string],
  ['Climb', 'climb'] satisfies [string, string],
  ['Boxing', 'walk', 'attack'] satisfies [string, string, string],
  ['Loading NPC', 'loading'] satisfies [string, string],
  ['Bench press', 'train', 'bench'] satisfies [string, string, string],
  ['Curls', 'train', 'curl'] satisfies [string, string, string],
  ['Squats', 'train', 'squat'] satisfies [string, string, string],
  ['Overhead press', 'train', 'press'] satisfies [string, string, string],
  ['Bison', 'bison'] satisfies [string, string],
];
const canvas = document.querySelector<HTMLElementTagNameMap['canvas']>('canvas')!,
  gl = requiredValue(canvas.getContext('webgl', { antialias: true }), 'WebGL unavailable'),
  labels = document.querySelector<HTMLElement>('#labels')!,
  page = document.querySelector<HTMLSelectElement>('#page')!,
  slider = document.querySelector<HTMLInputElement>('#time')!,
  status = document.querySelector<HTMLElement>('#status')!;
if (!gl) throw Error('WebGL unavailable');
for (let i = 0; i < Math.ceil(clips.length / 9); i++)
  page.add(
    new Option(
      (
        ['Movement & transitions', 'Vehicles & travel', 'Gestures & loading', 'Gym'] satisfies [
          string,
          string,
          string,
          string,
        ]
      )[i],
      String(i),
    ),
  );
function shader(type: number, source: string) {
  const s = requiredValue(gl.createShader(type), 'Could not create audit shader');
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw Error(gl.getShaderInfoLog(s) || 'Audit shader failed');
  return s;
}
const program = requiredValue(gl.createProgram(), 'Could not create audit program');
gl.attachShader(
  program,
  shader(
    gl.VERTEX_SHADER,
    'attribute vec3 aPosition,aNormal,aColor;uniform mat4 uVP;varying vec3 color;void main(){color=aColor*(.6+.4*max(0.,dot(normalize(aNormal),normalize(vec3(-.45,.85,.55)))));gl_Position=uVP*vec4(aPosition,1.);}',
  ),
);
gl.attachShader(
  program,
  shader(
    gl.FRAGMENT_SHADER,
    'precision mediump float;varying vec3 color;void main(){gl_FragColor=vec4(color,1.);}',
  ),
);
for (const [i, name] of (
  ['aPosition', 'aNormal', 'aColor'] satisfies [string, string, string]
).entries())
  gl.bindAttribLocation(program, i, name);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS))
  throw Error(gl.getProgramInfoLog(program) || 'Audit program failed');
const buffer = gl.createBuffer(),
  vp = gl.getUniformLocation(program, 'uVP'),
  loading = createLoadingNPCMesh();
let animations: ReturnType<typeof createActorAnimation>[] = [],
  _last = 0,
  started = performance.now(),
  paused = false,
  frames = 0,
  total = 0;
function reset() {
  animations = Array.from({ length: 9 }, () => createActorAnimation());
  labels.replaceChildren(
    ...clips
      .slice(Number(page.value) * 9, Number(page.value) * 9 + 9)
      .map(([name]) => Object.assign(document.createElement('div'), { textContent: name })),
  );
  started = performance.now();
  slider.value = '0';
}
page.onchange = reset;
document.querySelector<HTMLButtonElement>('#pause')!.onclick = () => {
  paused = !paused;
  document.querySelector<HTMLButtonElement>('#pause')!.textContent = paused ? 'Play' : 'Pause';
  started = performance.now() - Number(slider.value) * 1000;
};
slider.oninput = () => {
  paused = true;
  animations = Array.from({ length: 9 }, () => createActorAnimation());
  document.querySelector<HTMLButtonElement>('#pause')!.textContent = 'Play';
};
function draw(now: number) {
  const t = paused ? Number(slider.value) : (now - started) / 1000;
  slider.value = String(t % 6);
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.15, 0.2, 0.18, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);
  const cellW = Math.floor(canvas.width / 3),
    cellH = Math.floor(canvas.height / 3),
    eye = [3, 2.4, 4] satisfies [number, number, number],
    target = [0, 1.02, 0] satisfies [number, number, number],
    b = unit(sub(eye, target)),
    r = unit(cross([0, 1, 0] satisfies [number, number, number], b)),
    u = cross(b, r),
    view = new Float32Array([
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
  total = 0;
  for (let i = 0; i < 9; i++) {
    const clip = clips[Number(page.value) * 9 + i];
    if (!clip) continue;
    const [name, mode, gesture = ''] = clip,
      loop = t % 2,
      at = t * 1000;
    const moving = (
      ['Walk', 'Bicycle', 'Motorcycle', 'Ferrari', 'Skateboard', 'Climb'] satisfies [
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    ).includes(name);
    const p = {
      id: 1,
      x: 0,
      y: 0,
      z: 0,
      angle: 0,
      phase:
        mode === 'roll'
          ? (loop / 2) * Math.PI * 2
          : mode === 'surf'
            ? 0
            : mode === 'bomber'
              ? t * 0.8
              : mode === 'ski'
                ? t * Math.PI
                : mode === 'climb'
                  ? t * 3.2
                  : moving
                    ? t * 5
                    : 0,
      motion: Number(moving),
      moving,
      mode: mode === 'sit' && loop > 1 ? 'walk' : mode,
      hp: 30,
      max: 30,
      gesture:
        gesture === 'caught'
          ? loop < 1.9
            ? gesture
            : ''
          : loop < 0.2
            ? gesture
            : (
                  [
                    'bench',
                    'curl',
                    'squat',
                    'press',
                    'windsurf',
                    'paddle',
                    'surfboard',
                    'fish',
                  ] satisfies [string, string, string, string, string, string, string, string]
                ).includes(gesture)
              ? gesture
              : '',
    };
    const a = animations[i].sample(p, at),
      look = characterAppearance(
        normalizeCharacter({
          weapon: name === 'Railgun' ? 'railgun' : 'unarmed',
          torso: (['cloak', 'top'] satisfies [string, string]).includes(
            document.querySelector<HTMLSelectElement>('#clothes')!.value,
          )
            ? 'black-cloak-top'
            : 'shirt',
          legs: (['cloak', 'bottom'] satisfies [string, string]).includes(
            document.querySelector<HTMLSelectElement>('#clothes')!.value,
          )
            ? 'black-cloak-bottom'
            : 'trousers',
        }),
      );
    let m = new Mesh();
    if (mode === 'loading') m = loading(t * 3);
    else if (mode === 'bison')
      drawBison(m, { x: 0, z: 0, base: 0, angle: 0, motion: 1, phase: t * 2 }, at);
    else drawRemotePlayer(m, p, at, { look, animation: a });
    if (mode === 'train')
      for (let k = 0; k < m.data.length; k += 11) {
        m.data[k] -= SF_FITNESS.x;
        m.data[k + 1] -= SF_FITNESS.base;
        m.data[k + 2] -= SF_FITNESS.z;
      }
    const half = (['surf', 'gondola', 'bomber'] satisfies [string, string, string]).includes(mode)
        ? 2.1
        : 1.35,
      projection = new Float32Array([
        cellH / cellW / half,
        0,
        0,
        0,
        0,
        1 / half,
        0,
        0,
        0,
        0,
        -0.03,
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
    gl.viewport((i % 3) * cellW, (2 - Math.floor(i / 3)) * cellH, cellW, cellH);
    gl.uniformMatrix4fv(vp, false, matrixMultiply(projection, view));
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.data), gl.DYNAMIC_DRAW);
    for (let k = 0; k < 3; k++) {
      gl.enableVertexAttribArray(k);
      gl.vertexAttribPointer(k, 3, gl.FLOAT, false, 44, k * 12);
    }
    gl.drawArrays(gl.TRIANGLES, 0, m.data.length / 11);
    total += m.data.length / 33;
  }
  frames++;
  status.textContent = `${Math.round(total).toLocaleString()} triangles · ${gl.getError() === 0 ? 'WebGL OK' : 'WebGL error'}`;
  window.animationAudit = { frames, total, clips: clips.length, time: t, ready: true };
  _last = now;
  requestAnimationFrame(draw);
}
reset();
requestAnimationFrame(draw);
