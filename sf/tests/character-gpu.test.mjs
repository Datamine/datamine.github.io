import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, pose } from '../geometry.js';
import { drawCharacter, getCharacterMesh, characterPalette } from '../characters.js';
import {
  createCharacterBatch,
  createCharacterGPU,
  rigidCharacterMesh,
  packCharacterMesh,
} from '../rendering/character-gpu.js';
import { characterBounds, characterPickMesh } from '../rendering/character-frame.js';
import { drawRemotePlayer } from '../remote-player-models.js';
import { createActorAnimation } from '../animation-presentation.js';
import { characterAppearance, normalizeCharacter } from '../character-config.js';
import { swayCharacter } from '../inebriation.js';
import { pitchMotorcycleMesh } from '../motorcycle.js';
import { tiltRocketMesh, rocketFlightPoint } from '../rocket.js';

function reconstructed(mesh) {
  const records = new Map(mesh.characters.records.map((r) => [r.marker, r])),
    data = [];
  for (let i = 0; i < mesh.data.length; i += 33) {
    const record = records.get(i);
    if (record) {
      const pick = characterPickMesh(record);
      for (const id of pick.indices) data.push(...pick.data.subarray(id * 11, id * 11 + 11));
    } else data.push(...mesh.data.slice(i, i + 33));
  }
  return data;
}
function compare(expected, actual, label) {
  assert.equal(actual.length, expected.length, label + ' vertex count');
  let error = 0;
  for (let i = 0; i < actual.length; i++)
    error = Math.max(error, Math.abs(actual[i] - expected[i]));
  assert.ok(error < 0.00008, label + ' maximum error ' + error);
}
const outfit = characterAppearance(
  normalizeCharacter({
    hairstyle: 'braid',
    gender: 'woman',
    hat: 'blue-partyhat',
    back: 'new-year-rocket',
    neck: 'clock-amulet',
    torso: 'black-cloak-top',
    legs: 'black-cloak-bottom',
  }),
);

test('GPU draw records preserve body, clothing, head, colors, wearables and terrain IK', () => {
  for (const mode of ['idle', 'move', 'rest', 'cycle', 'climb'])
    for (const time of [0, 0.42, 1.13]) {
      const look = {
        ...outfit,
        mode,
        time,
        motion: 0.8,
        run: 0.6,
        sitBlend: 0.6,
        ground: (x, z) => 1 + x * 0.1 + z * 0.08,
        serverTime: 100000,
        rocketBurnUntil: 110000,
      };
      const cpu = new Mesh(),
        gpu = new Mesh();
      gpu.characters = createCharacterBatch().begin();
      for (const m of [cpu, gpu])
        pose(m, 3, 1, 2, 0.4, () =>
          drawCharacter(m, 0.2, 0.1, 0.3, 0.7, time * 7, false, '#bd9369', '#707b4b', look),
        );
      compare(cpu.data, reconstructed(gpu), mode + ' ' + time);
      assert.ok(
        gpu.data.length < cpu.data.length / 100,
        'body and accessory triangles must not be expanded each frame',
      );
      for (const r of gpu.characters.records) {
        const bounds = characterBounds(r),
          data = characterPickMesh(r).data;
        for (let i = 0; i < data.length; i += 11)
          for (let k = 0; k < 3; k++)
            assert.ok(
              data[i + k] >= bounds.lo[k] - 0.0001 && data[i + k] <= bounds.hi[k] + 0.0001,
              'pick bounds must contain the exact posed surface',
            );
      }
    }
});

test('all player activities preserve geometry through nested vehicle transforms, flips and capture', () => {
  const modes = [
    'walk',
    'sit',
    'bench',
    'dance',
    'bike',
    'motorcycle',
    'ferrari',
    'skateboard',
    'climb',
    'gondola',
    'roll',
    'ski',
    'surf',
    'train',
    'bomber',
    'parachute',
    'teleport',
  ];
  for (const mode of modes)
    for (const phase of [0.4, 2.1])
      for (const gesture of mode === 'surf' ? ['paddle', 'surfboard', 'windsurf'] : ['']) {
        const p = {
            id: 1,
            x: 3,
            y: 2,
            z: 5,
            angle: 0.7,
            phase,
            motion: 1,
            moving: true,
            mode,
            hp: 30,
            max: 30,
            gesture,
          },
          animation = createActorAnimation().sample(p, 1200),
          cpu = new Mesh(),
          gpu = new Mesh();
        gpu.characters = createCharacterBatch().begin();
        for (const m of [cpu, gpu])
          drawRemotePlayer(m, p, 1200, {
            look: outfit,
            animation,
            ground: () => 2,
            serverTime: 100000,
          });
        compare(cpu.data, reconstructed(gpu), mode + ' ' + gesture + ' ' + phase);
      }
  const a = createActorAnimation(),
    p = {
      id: 1,
      x: 3,
      y: 2,
      z: 5,
      angle: 0.7,
      phase: 0,
      motion: 0,
      moving: false,
      mode: 'walk',
      hp: 0,
    };
  a.sample(p, 0);
  const animation = a.sample(p, 1500),
    cpu = new Mesh(),
    gpu = new Mesh();
  gpu.characters = createCharacterBatch().begin();
  for (const m of [cpu, gpu]) drawRemotePlayer(m, p, 1500, { look: outfit, animation });
  compare(cpu.data, reconstructed(gpu), 'capture');
  assert.equal(gpu.characters.records.length, 0, 'collapse keeps its existing precise CPU path');
});

test('body shapes and palettes cache independently of placement and animation', () => {
  const a = getCharacterMesh(outfit),
    b = getCharacterMesh({ ...outfit, shirt: '#445566', skin: '#abcdef', time: 5, phase: 9 });
  assert.equal(a, b);
  assert.equal(
    characterPalette(outfit, '#bd9369', '#707b4b'),
    characterPalette({ ...outfit, time: 9 }, '#bd9369', '#707b4b'),
  );
  const packed = packCharacterMesh(a);
  assert.equal(packed.length, a.bonesA.length * 15);
  for (let id = 0; id < a.bonesA.length; id++) {
    assert.equal(packed[id * 15 + 11], a.bonesA[id]);
    assert.equal(packed[id * 15 + 12], a.bonesB[id]);
    assert.equal(packed[id * 15 + 14], a.slots[id]);
  }
  const m = new Mesh(),
    batch = createCharacterBatch();
  m.characters = batch.begin();
  drawCharacter(m, 0, 0, 0, 0, 0, false, '#bd9369', '#707b4b', {});
  const bones = m.characters.records[0].bones;
  const saved = bones.slice();
  drawCharacter(m, 1, 1, 0, 0, 3, false, '#bd9369', '#707b4b', {});
  assert.deepEqual(bones, saved, 'later characters cannot reuse and overwrite an earlier pose');
  const first = m.characters.records[0];
  batch.begin();
  m.data = [];
  drawCharacter(m, 2, 2, 0, 0, 1, false);
  assert.equal(m.characters.records[0], first, 'frame records are pooled');
  assert.equal(first.pickMesh, null);
});

test('inebriation, motorcycle slopes and rocket pitch transform GPU bodies with their props', () => {
  const x = 12,
    base = 3,
    z = 15,
    heading = 0.73,
    vehicle = { x, y: base, z },
    flight = { pitch: 1.2, heading };
  const cases = [
    ['inebriation', (m) => swayCharacter(m, 0, x, base, z, 1700, 0.85)],
    [
      'motorcycle',
      (m) => pitchMotorcycleMesh(m, 0, x, base, z, heading, (a, b) => base + a * 0.2 - b * 0.1),
    ],
    ['rocket', (m) => tiltRocketMesh(m, 0, vehicle, flight)],
    [
      'sway then slope',
      (m) => {
        swayCharacter(m, 0, x, base, z, 1700, 0.85);
        pitchMotorcycleMesh(m, 0, x, base, z, heading, (a, b) => base + a * 0.2 - b * 0.1);
      },
    ],
  ];
  for (const [name, transform] of cases) {
    const cpu = new Mesh(),
      gpu = new Mesh();
    gpu.characters = createCharacterBatch().begin();
    for (const m of [cpu, gpu]) {
      drawCharacter(m, x, z, base, heading, 1, false, '#bd9369', '#707b4b', outfit);
      transform(m);
    }
    compare(cpu.data, reconstructed(gpu), name);
    for (const record of gpu.characters.records) {
      const bounds = characterBounds(record),
        pick = characterPickMesh(record);
      for (const id of pick.indices)
        for (let k = 0; k < 3; k++)
          assert.ok(
            pick.data[id * 11 + k] >= bounds.lo[k] - 0.0001 &&
              pick.data[id * 11 + k] <= bounds.hi[k] + 0.0001,
          );
    }
  }
  const mesh = new Mesh();
  mesh.box(x, base, z, 1, 2, 1, '#ffffff');
  const expected = rocketFlightPoint(
    { x: mesh.data[0], y: mesh.data[1], z: mesh.data[2] },
    vehicle,
    flight,
  );
  tiltRocketMesh(mesh, 0, vehicle, flight);
  for (const [k, key] of ['x', 'y', 'z'].entries())
    assert.ok(
      Math.abs(mesh.data[k] - expected[key]) < 1e-10,
      'rocket cabin and body use the same physical pivot',
    );
});

function fakeGL(withVAO = false) {
  let serial = 0;
  const calls = [],
    gl = {
      ARRAY_BUFFER: 1,
      ELEMENT_ARRAY_BUFFER: 2,
      STATIC_DRAW: 3,
      FLOAT: 4,
      TRIANGLES: 5,
      UNSIGNED_SHORT: 6,
      calls,
    };
  for (const name of [
    'bindBuffer',
    'bufferData',
    'bufferSubData',
    'deleteBuffer',
    'enableVertexAttribArray',
    'disableVertexAttribArray',
    'vertexAttribPointer',
    'uniform1f',
    'uniform4fv',
    'uniformMatrix4fv',
    'uniformMatrix3fv',
    'drawElements',
  ])
    gl[name] = (...args) => calls.push([name, ...args]);
  gl.createBuffer = () => ++serial;
  gl.getUniformLocation = (_p, n) => n;
  gl.getAttribLocation = (_p, n) => ({ aRig: 4 })[n];
  gl.getExtension = () =>
    withVAO
      ? {
          createVertexArrayOES: () => ++serial,
          bindVertexArrayOES: (v) => calls.push(['bindVAO', v]),
          deleteVertexArrayOES: (v) => calls.push(['deleteVAO', v]),
        }
      : null;
  return gl;
}
const program = { position: 0, normal: 1, color: 2, uv: 3 };
function submit(renderer, look = {}) {
  const m = new Mesh();
  m.characters = renderer.begin();
  drawCharacter(m, 0, 0, 0, 0, 1, false, '#bd9369', '#707b4b', look);
  renderer.draw();
}

test('warm frames reuse static GPU buffers and VAOs; changing colors uploads no geometry', () => {
  for (const vao of [false, true]) {
    const gl = fakeGL(vao),
      renderer = createCharacterGPU(gl, program);
    submit(renderer, { backpack: false });
    const uploaded = renderer.stats.uploads,
      calls = gl.calls.filter((c) => c[0] === 'bufferData').length;
    submit(renderer, { backpack: false, shirt: '#ff0000', pants: '#00ff00' });
    assert.equal(renderer.stats.uploads, uploaded);
    assert.equal(gl.calls.filter((c) => c[0] === 'bufferData').length, calls);
    assert.ok(renderer.stats.hits > 0);
    assert.equal(renderer.stats.characters, 1);
    assert.equal(renderer.stats.poseBytes, 868);
    renderer.dispose();
    assert.equal(renderer.stats.entries, 0);
    assert.equal(renderer.stats.bytes, 0);
  }
});

test('cache budget evicts unused shapes, protects current draws and releases replaced wearable revisions', () => {
  const gl = fakeGL(),
    renderer = createCharacterGPU(gl, program, { maxBytes: 1 });
  submit(renderer, { backpack: false });
  assert.equal(renderer.stats.entries, 1);
  submit(renderer, { backpack: true, cap: true });
  assert.equal(renderer.stats.entries, 1);
  assert.ok(renderer.stats.evictions > 0);
  renderer.dispose();
  const asset = new Mesh();
  asset.box(0, 0, 0, 1, 1, 1, '#ffffff');
  const mesh = rigidCharacterMesh(asset.data, 1, 'test-clock'),
    a = rigidCharacterMesh(asset.data, 1, 'test-clock');
  assert.equal(mesh, a);
  const r = createCharacterGPU(gl, program),
    body = new Mesh();
  body.characters = r.begin();
  drawCharacter(body, 0, 0, 0, 0, 0, false);
  const record = body.characters.records[0];
  r.batch.add(body, mesh, record.bones, record.palette, { x: 0, z: 0, base: 0, angle: 0 });
  r.draw();
  const oldBytes = r.stats.bytes;
  body.data = [];
  body.characters = r.begin();
  const changed = asset.data.slice();
  changed[0] += 0.1;
  r.batch.add(body, rigidCharacterMesh(changed, 1, 'test-clock'), record.bones, record.palette, {
    x: 0,
    z: 0,
    base: 0,
    angle: 0,
  });
  r.draw();
  assert.equal(r.stats.bytes, oldBytes);
  assert.ok(
    gl.calls.some((c) => c[0] === 'bufferSubData'),
    'animated wearable updates reuse allocated GPU buffers',
  );
  r.dispose();
  assert.equal(r.stats.bytes, 0);
});
