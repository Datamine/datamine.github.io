type RopePoint = { x: number; y: number; z: number };
interface RopeState {
  deployed: boolean;
  phase: string;
  top: RopePoint | null;
  bottom: RopePoint | null;
  position: RopePoint | null;
  passenger: (RopePoint & { phase: string }) | null;
  passengerPaid: boolean;
}
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

export function createAirshipRope() {
  const state: RopeState = {
    deployed: false,
    phase: 'stowed',
    top: null,
    bottom: null,
    position: null,
    passenger: null,
    passengerPaid: false,
  };
  function deploy(top: RopePoint, bottom: RopePoint) {
    if (state.deployed || !top || !bottom || top.y < bottom.y + 0.5) return false;
    Object.assign(state, {
      deployed: true,
      phase: 'hanging',
      top: { ...top },
      bottom: { ...bottom },
      position: { ...top },
    });
    return true;
  }
  function climb(down: boolean) {
    if (
      !state.deployed ||
      !(['hanging', 'ground'] satisfies [string, string]).includes(state.phase) ||
      (down && state.phase !== 'hanging') ||
      (!down && state.phase !== 'ground')
    )
      return false;
    state.phase = down ? 'descending' : 'ascending';
    return true;
  }
  function invite() {
    if (!state.deployed || state.passenger || state.passengerPaid) return false;
    state.passenger = { ...state.bottom!, phase: 'ascending' };
    return true;
  }
  function retract() {
    if (!state.deployed || state.phase !== 'hanging' || state.passenger?.phase === 'ascending')
      return false;
    state.deployed = false;
    state.phase = 'stowed';
    return true;
  }
  function update(dt: number) {
    let event: ('ground' | 'aboard') | 'passenger-aboard' | null = null;
    if (state.phase === 'descending' || state.phase === 'ascending') {
      const down = state.phase === 'descending',
        target = down ? state.bottom!.y : state.top!.y,
        p = state.position!;
      p.y = down ? Math.max(target, p.y - dt * 3) : Math.min(target, p.y + dt * 3);
      if (p.y === target) {
        state.phase = down ? 'ground' : 'hanging';
        event = down ? 'ground' : 'aboard';
      }
    }
    if (state.passenger?.phase === 'ascending') {
      state.passenger.y = Math.min(state.top!.y, state.passenger.y + dt * 2.6);
      if (state.passenger.y === state.top!.y) {
        state.passenger.phase = 'aboard';
        state.passengerPaid = true;
        event = 'passenger-aboard';
      }
    }
    return event;
  }
  function reset() {
    Object.assign(state, {
      deployed: false,
      phase: 'stowed',
      top: null,
      bottom: null,
      position: null,
      passenger: null,
      passengerPaid: false,
    });
  }
  return {
    state,
    deploy,
    climb,
    invite,
    retract,
    update,
    reset,
    get climbing() {
      return state.phase === 'ascending' || state.phase === 'descending';
    },
    get onGround() {
      return state.phase === 'ground';
    },
  };
}

export function drawAirshipRope(m: Mesh, state: RopeState, time: number, reduced = false) {
  if (!state.deployed) return;
  const top = state.top!,
    bottom = state.bottom!;
  m.rod(
    [top.x, top.y + 0.45, top.z],
    [bottom.x, bottom.y + 0.06, bottom.z],
    0.018,
    '#c8b38b',
    8,
    'wood',
  );
  for (let y = bottom.y + 0.1; y < top.y; y += 0.55)
    m.rod([top.x - 0.07, y, top.z], [top.x + 0.07, y, top.z], 0.027, '#b49e74', 6);
  pose(m, bottom.x, bottom.y, bottom.z, 0, () => {
    for (let i = 0; i < 18; i++) {
      const a = (i * Math.PI) / 9,
        b = ((i + 1) * Math.PI) / 9;
      m.rod(
        [Math.cos(a) * 0.22, 0.025, Math.sin(a) * 0.22] satisfies [number, number, number],
        [Math.cos(b) * 0.22, 0.025, Math.sin(b) * 0.22] satisfies [number, number, number],
        0.018,
        '#c8b38b',
        5,
      );
    }
  });
}
