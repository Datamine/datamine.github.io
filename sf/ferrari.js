import { drawCachedMesh } from './rendering/cached-mesh.js';
import { Mesh, pose } from './geometry.js';

export const FERRARI_SPEED = 4.6 * 20;
export function createFerrari(road, saved = {}, onSave = () => {}, { cityDriving = null } = {}) {
  const distances = [0];
  for (const s of road.segments) distances.push(distances.at(-1) + s.length);
  const length = distances.at(-1),
    dealer = distances[road.dealerIndex ?? 0],
    trip = length - dealer,
    range = trip * 0.56;
  const parked = saved.localPosition,
    validParked =
      cityDriving && parked && ['x', 'y', 'z', 'angle'].every((k) => Number.isFinite(parked[k]));
  let needsRoadSnap = !!validParked;
  const state = {
    owned: !!saved.owned,
    riding: false,
    distance: Number.isFinite(saved.distance)
      ? Math.max(0, Math.min(length, saved.distance))
      : dealer,
    fuel: Number.isFinite(saved.fuel) ? Math.max(0, Math.min(1, saved.fuel)) : 1,
    speed: 0,
    target: null,
    resume: null,
    empty: false,
    travel: 0,
    direction: 1,
    localPosition: validParked ? { ...parked, y: cityDriving.ground(parked.x, parked.z) } : null,
    localPath: [],
  };
  let saveTime = 0;
  function sample(distance) {
    distance = Math.max(0, Math.min(length, distance));
    let i = 0;
    while (i < road.segments.length - 1 && distance > distances[i + 1]) i++;
    const s = road.segments[i],
      t = Math.max(0, Math.min(1, (distance - distances[i]) / s.length));
    return {
      x: s.a.x + s.dx * t,
      y: s.a.y + (s.b.y - s.a.y) * t,
      z: s.a.z + s.dz * t,
      angle: Math.atan2(s.dz, s.dx),
      distance,
    };
  }
  function project(x, z) {
    let best = Infinity,
      result = null;
    for (const s of road.segments) {
      const t = Math.max(
          0,
          Math.min(1, ((x - s.a.x) * s.dx + (z - s.a.z) * s.dz) / (s.length * s.length)),
        ),
        d = (x - s.a.x - s.dx * t) ** 2 + (z - s.a.z - s.dz * t) ** 2;
      if (d < best) {
        best = d;
        result = distances[s.index] + s.length * t;
      }
    }
    return result;
  }
  const stations = [
    {
      id: 'fuel-outbound',
      label: 'Extortionate Gas Station',
      distance: dealer + range,
      paid: true,
    },
    { id: 'fuel-return', label: 'Extortionate Gas Station', distance: length - range, paid: true },
    { id: 'fuel-tahoe', label: 'Free Gondola Gas', distance: length, paid: false },
    { id: 'ferrari-dealer', label: 'Ferrari Dealership', distance: dealer, paid: false },
  ];
  function destinationFor(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    const distance = project(x, z),
      highway = sample(distance),
      city = cityDriving?.nearest?.(x, z);
    return city && city.score < (highway.x - x) ** 2 + (highway.z - z) ** 2 - 1e-10
      ? {
          x: city.x,
          y: city.y,
          z: city.z,
          angle: city.angle,
          distance: project(city.x, city.z),
          city: true,
        }
      : { ...highway, city: false };
  }
  function normalizeParked(force = false) {
    if (!needsRoadSnap || (!force && cityDriving?.ready === false)) return;
    const at = destinationFor(state.localPosition.x, state.localPosition.z);
    needsRoadSnap = false;
    state.distance = at.distance;
    state.localPosition = at.city ? { x: at.x, y: at.y, z: at.z, angle: at.angle } : null;
  }
  const position = () => {
    normalizeParked();
    const p = state.localPosition || sample(state.distance);
    return {
      ...p,
      distance: state.distance,
      angle: p.angle + (!state.localPosition && state.direction < 0 ? Math.PI : 0),
    };
  };
  const save = () => {
    saveTime = 0;
    onSave({
      owned: state.owned,
      distance: state.distance,
      fuel: state.fuel,
      ...(state.localPosition ? { localPosition: { ...state.localPosition } } : {}),
    });
  };
  function park() {
    state.riding = false;
    state.target = null;
    state.destination = null;
    state.resume = null;
    state.speed = 0;
    state.localPath = [];
    save();
  }
  function driveTo(x, z) {
    if (!state.riding || !Number.isFinite(x) || !Number.isFinite(z)) return false;
    normalizeParked(true);
    const to = destinationFor(x, z),
      target = to.distance,
      from = position(),
      onHighway =
        Math.hypot(sample(state.distance).x - from.x, sample(state.distance).z - from.z) < 1e-6;
    if (cityDriving && (!onHighway || to.city)) {
      const path = cityDriving.route(from, to);
      if (!path) return false;
      state.localPosition = from;
      state.localPath = path.map((p) => ({ ...p }));
    } else {
      state.localPosition = null;
      state.localPath = [];
    }
    state.destination = { x: to.x, y: to.y, z: to.z };
    state.target = target;
    state.direction = Math.sign(state.target - state.distance) || state.direction;
    state.empty = false;
    return true;
  }
  function refuel() {
    state.fuel = 1;
    state.empty = false;
    if (state.resume !== null) {
      state.target = state.resume;
      state.resume = null;
    }
    save();
  }
  function update(dt) {
    if (!state.riding || state.target === null || dt <= 0) return null;
    if (state.localPosition) return updateLocal(dt);
    const delta = state.target - state.distance,
      d = Math.abs(delta);
    if (d < 1e-6) {
      state.target = null;
      state.speed = 0;
      save();
      return 'arrived';
    }
    const desired = Math.min(FERRARI_SPEED, Math.sqrt(2 * 180 * d));
    state.speed = Math.min(desired, state.speed + 180 * dt);
    const step = Math.min(d, state.speed * dt, state.fuel * range);
    state.distance += Math.sign(delta) * step;
    state.fuel = Math.max(0, state.fuel - step / range);
    state.travel += step;
    saveTime += dt;
    if (saveTime >= 2) save();
    if (d - step < 1e-6) {
      state.target = null;
      state.speed = 0;
      save();
      return 'arrived';
    }
    if (state.fuel < 1e-9) {
      state.fuel = 0;
      state.resume = state.target;
      state.target = null;
      state.speed = 0;
      state.empty = true;
      save();
      return 'empty';
    }
    return null;
  }
  function updateLocal(dt) {
    const p = state.localPosition;
    let remaining = 0,
      previous = p;
    for (const next of state.localPath) {
      remaining += Math.hypot(next.x - previous.x, next.z - previous.z);
      previous = next;
    }
    state.speed = Math.min(
      Math.min(FERRARI_SPEED, Math.sqrt(2 * 180 * remaining)),
      state.speed + 180 * dt,
    );
    let budget = Math.min(remaining, state.speed * dt, state.fuel * range),
      traveled = 0;
    // Consume every corner in order, even when one fast frame spans several
    // tiles. The highway and the city share the same gate and ground height.
    while (state.localPath.length) {
      const next = state.localPath[0],
        dx = next.x - p.x,
        dz = next.z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 1e-8) {
        Object.assign(p, next);
        state.localPath.shift();
        continue;
      }
      if (budget <= 1e-8) break;
      const step = Math.min(d, budget),
        f = step / d;
      p.x += dx * f;
      p.z += dz * f;
      p.y = road.at(p.x, p.z)?.height ?? cityDriving.ground(p.x, p.z);
      p.angle = Math.atan2(dz, dx);
      budget -= step;
      traveled += step;
      if (d - step < 1e-8) state.localPath.shift();
    }
    state.distance = project(p.x, p.z);
    state.fuel = Math.max(0, state.fuel - traveled / range);
    state.travel += traveled;
    saveTime += dt;
    if (!state.localPath.length) {
      if (
        road.contains(p.x, p.z) &&
        Math.hypot(sample(state.distance).x - p.x, sample(state.distance).z - p.z) < 1e-6
      )
        state.localPosition = null;
      state.target = null;
      state.speed = 0;
      save();
      return 'arrived';
    }
    if (state.fuel < 1e-9) {
      state.fuel = 0;
      state.resume = state.target;
      state.target = null;
      state.speed = 0;
      state.empty = true;
      save();
      return 'empty';
    }
    if (saveTime >= 2) save();
    return null;
  }
  return {
    state,
    stations,
    dealer,
    length,
    trip,
    range,
    distances,
    sample,
    project,
    destinationFor,
    save,
    park,
    driveTo,
    refuel,
    update,
    mount() {
      normalizeParked(true);
      state.owned = true;
      state.riding = true;
      state.speed = 0;
      save();
    },
    get position() {
      return position();
    },
  };
}

let ferrariBody = null;
export function drawFerrari(m, p, { occupied = false, travel = 0 } = {}) {
  if (!ferrariBody) {
    const b = new Mesh();
    b.box(-0.91, 0.19, -0.29, 1.82, 0.19, 0.58, '#b93438', { metal: 0.35 });
    b.box(-0.83, 0.38, -0.28, 0.78, 0.12, 0.56, '#d04b47', { metal: 0.3 });
    b.box(0.28, 0.38, -0.28, 0.58, 0.09, 0.56, '#d74842', { metal: 0.3 });
    b.box(-0.87, 0.22, -0.3, 0.13, 0.13, 0.6, '#842d32');
    for (const side of [-1, 1]) {
      b.rod([-0.06, 0.43, side * 0.23], [0.28, 0.67, side * 0.21], 0.025, '#cc5148', 8);
      b.rod([0.28, 0.67, side * 0.21], [0.5, 0.44, side * 0.23], 0.022, '#cc5148', 8);
      b.box(0.05, 0.41, side * 0.27, 0.4, 0.08, 0.025, '#d9574d');
      b.box(0.83, 0.31, side * 0.18 - 0.065, 0.025, 0.065, 0.13, '#f3e8b9', { emissive: 0.3 });
      b.box(-0.93, 0.31, side * 0.2 - 0.055, 0.025, 0.05, 0.11, '#e47365', { emissive: 0.25 });
    }
    b.quad(
      [0.3, 0.65, -0.2],
      [0.3, 0.65, 0.2],
      [0.49, 0.45, 0.23],
      [0.49, 0.45, -0.23],
      '#88aeb4',
      'glass',
    );
    b.box(-0.35, 0.36, -0.18, 0.32, 0.11, 0.36, '#3f4247');
    b.box(-0.38, 0.46, -0.17, 0.07, 0.24, 0.34, '#4c4140');
    b.rod([0.22, 0.48, 0], [0.27, 0.59, 0], 0.02, '#555d64', 8);
    b.sphere(0.27, 0.61, 0, 0.035, 0.08, 0.1, '#353d43', 14, 8);
    ferrariBody = b;
  }
  pose(m, p.x, p.y, p.z, p.angle, () => {
    drawCachedMesh(m, 'ferrari-body:' + occupied, (mesh) => {
      for (const value of ferrariBody.data) mesh.data.push(value);
      if (!occupied) mesh.box(-0.05, 0.66, -0.23, 0.38, 0.035, 0.46, '#d64c47', { metal: 0.25 });
    });
    for (const x of [-0.6, 0.62])
      for (const side of [-1, 1]) {
        pose(m, x, 0.22, side * 0.29, 0, () =>
          drawCachedMesh(m, 'ferrari-wheel:' + side, (mesh) => {
            mesh.sphere(0, 0, 0, 0.19, 0.19, 0.065, '#30383b', 18, 10);
            mesh.sphere(0, 0, side * 0.058, 0.12, 0.12, 0.014, '#c0c7cd', 16, 8, { metal: 0.55 });
          }),
        );
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5 + travel / 0.19;
          m.rod(
            [x, 0.22, side * 0.366],
            [x + Math.cos(a) * 0.105, 0.22 + Math.sin(a) * 0.105, side * 0.366],
            0.012,
            '#626f79',
            5,
          );
        }
      }
  });
}
