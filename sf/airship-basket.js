export const AIRSHIP_BASKET = Object.freeze({
  left: -3.1,
  right: 0.7,
  north: -1.05,
  south: 1.05,
  floor: 0.05,
  clearance: 0.3,
});
const basketClamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Local deck coordinates move with the ship; flight and walking have separate
 * destinations so a passenger can stroll while the airship is underway. */
export function createAirshipBasket() {
  const b = AIRSHIP_BASKET,
    state = { x: -1.2, z: 0, target: null, angle: 0, travel: 0, moving: false };
  function reset(x = -1.2, z = 0) {
    Object.assign(state, { x, z, target: null, angle: 0, travel: 0, moving: false });
  }
  function walkTo(x, z) {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(z) ||
      x < b.left ||
      x > b.right ||
      z < b.north ||
      z > b.south
    )
      return false;
    state.target = {
      x: basketClamp(x, b.left + b.clearance, b.right - b.clearance),
      z: basketClamp(z, b.north + b.clearance, b.south - b.clearance),
    };
    return true;
  }
  function update(dt) {
    state.moving = false;
    if (!state.target) return false;
    const dx = state.target.x - state.x,
      dz = state.target.z - state.z,
      d = Math.hypot(dx, dz),
      step = Math.min(d, Math.max(0, dt) * 2.2);
    if (d > 1e-7 && step > 0) {
      state.x += (dx / d) * step;
      state.z += (dz / d) * step;
      state.angle = Math.atan2(dz, dx);
      state.travel += step;
      state.moving = true;
    }
    if (d - step < 1e-7) {
      state.target = null;
      return true;
    }
    return false;
  }
  function position(ship, heading) {
    const c = Math.cos(heading),
      s = Math.sin(heading);
    return {
      x: ship.x + state.x * c - state.z * s,
      y: ship.y + b.floor,
      z: ship.z + state.x * s + state.z * c,
    };
  }
  function pick(ray, ship, heading) {
    if (Math.abs(ray.dir[1]) < 1e-8) return null;
    const t = (ship.y + b.floor - ray.origin[1]) / ray.dir[1];
    if (t <= 0) return null;
    const dx = ray.origin[0] + ray.dir[0] * t - ship.x,
      dz = ray.origin[2] + ray.dir[2] * t - ship.z,
      c = Math.cos(heading),
      s = Math.sin(heading),
      x = dx * c + dz * s,
      z = -dx * s + dz * c;
    return x >= b.left && x <= b.right && z >= b.north && z <= b.south
      ? { x, z, distance: t }
      : null;
  }
  return { state, reset, walkTo, update, position, pick };
}

export function drawAirshipBasket(m) {
  const b = AIRSHIP_BASKET,
    w = b.right - b.left,
    d = b.south - b.north;
  const white = '#f0f4f5',
    edge = '#d2dfe5',
    dark = '#7d939f',
    metal = { metal: 0.16 };
  m.box(b.left, -0.1, b.north, w, 0.15, d, '#dce6ea', metal);
  // Chamfered composite shell and a continuous rounded handrail. The deck
  // stays open, with exactly the same floor and walking clearance as before.
  const ring = (inset) => {
    const l = b.left + inset,
      r = b.right - inset,
      n = b.north + inset,
      s = b.south - inset,
      c = 0.2;
    return [
      [l + c, n],
      [r - c, n],
      [r, n + c],
      [r, s - c],
      [r - c, s],
      [l + c, s],
      [l, s - c],
      [l, n + c],
    ];
  };
  const outer = ring(0),
    inner = ring(0.09),
    lower = ring(0.07),
    at = (p, y) => [p[0], y, p[1]];
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    m.quad(
      at(lower[j], 0.04),
      at(lower[i], 0.04),
      at(outer[i], 0.7),
      at(outer[j], 0.7),
      white,
      metal,
    );
    m.quad(
      at(inner[i], 0.06),
      at(inner[j], 0.06),
      at(inner[j], 0.7),
      at(inner[i], 0.7),
      '#e5edf0',
      metal,
    );
    m.quad(at(outer[j], 0.7), at(outer[i], 0.7), at(inner[i], 0.7), at(inner[j], 0.7), edge, metal);
    m.rod(at(outer[i], 0.75), at(outer[j], 0.75), 0.045, white, 10, metal);
  }
  const sideZ = (side, y) =>
    (side < 0 ? b.north : b.south) - side * 0.07 * (1 - (y - 0.04) / 0.66) + side * 0.008;
  for (const side of [-1, 1]) {
    // A restrained blue light strip sits below the white rim.
    const z = sideZ(side, 0.65);
    m.rod([b.left + 0.28, 0.65, z], [b.right - 0.28, 0.65, z], 0.014, '#b4dfed', 8, {
      emissive: 0.32,
    });
    for (let x = b.left + 0.72; x < b.right - 0.3; x += 0.78)
      m.rod([x, 0.13, sideZ(side, 0.13)], [x, 0.55, sideZ(side, 0.55)], 0.006, edge, 4);
    m.rod(
      [b.left + 0.25, 0.13, sideZ(side, 0.13)],
      [b.right - 0.25, 0.13, sideZ(side, 0.13)],
      0.012,
      dark,
      6,
      metal,
    );
  }
  // Flush deck panels and low-profile edge guides replace wooden planks.
  for (let x = b.left + 0.7; x < b.right - 0.3; x += 0.72)
    m.box(x, b.floor + 0.001, b.north + 0.16, 0.009, 0.002, d - 0.32, '#bdcdd5');
  for (const z of [b.north + 0.18, b.south - 0.2])
    m.box(b.left + 0.3, b.floor + 0.002, z, w - 0.6, 0.003, 0.018, '#b0cbd7');
  for (const z of [-0.55, 0.55])
    for (let i = 0; i < 3; i++) {
      const y = 0.23 + i * 0.065,
        x = b.right - 0.07 * (1 - (y - 0.04) / 0.66) + 0.008;
      m.box(x, y, z - 0.16, 0.012, 0.025, 0.32, dark, metal);
    }
}
