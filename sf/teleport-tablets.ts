import type { TabletFlight } from './types/teleport.ts';
import type { Position } from './types/network.ts';

export type TabletMessage =
  | { type: 'tabletTeleport'; flight: TabletFlight }
  | { type: 'tabletArrived'; position: Position; message: string }
  | { type: 'position'; reason?: string }
  | {
      type: Exclude<
        import('./types/network.ts').ServerEvent['type'],
        'tabletTeleport' | 'tabletArrived' | 'position'
      >;
    };
interface TabletClient {
  state: Pick<import('./types/network.ts').MultiplayerState, 'connected' | 'serverOffset'> & {
    inventory?: Pick<import('./types/network.ts').InventorySnapshot, 'tablets'>;
  };
  command: (action: string, args?: object) => Promise<import('./types/network.ts').CommandResult>;
  subscribe: (listener: (message: TabletMessage) => void) => unknown;
}
interface TabletOptions {
  client?: TabletClient | null;
  canUse?: () => boolean;
  onStart?: () => void;
  onArrive?: (position: Position) => void;
  onMessage?: (message: string, who?: string) => void;
  now?: () => number;
}
import { isRecord } from './types/json.ts';
import { serverCommand, serverConnected } from './server-connection.ts';
export const TABLET_PLACES = Object.freeze(['downtown', 'tahoe'] satisfies [string, string]),
  TABLET_TELEPORT_SECONDS = 2.8;
const teleportEase = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
export function tabletCounts(savedInput: unknown = {}) {
  const saved = isRecord(savedInput) ? savedInput : {};

  return Object.fromEntries(
    TABLET_PLACES.map(
      (id) =>
        [
          id,
          typeof saved[id] === 'number' && Number.isSafeInteger(saved[id]) && saved[id] >= 0
            ? saved[id]
            : 0,
        ] satisfies [string, number],
    ),
  );
}
export function tabletTeleportPose(flight: Pick<TabletFlight, 'from' | 'to'>, seconds: number) {
  const t = Math.max(0, Math.min(TABLET_TELEPORT_SECONDS, seconds)),
    incoming = t >= 1.4,
    point = incoming ? flight.to : flight.from,
    lift = incoming
      ? 3.3 * (1 - teleportEase((t - 1.4) / 1.4))
      : 3.3 * teleportEase((t - 0.55) / 0.85);
  return {
    position: { x: point.x, y: point.y + lift, z: point.z },
    base: point.y,
    arms: teleportEase(t / 0.55),
    progress: t / TABLET_TELEPORT_SECONDS,
    incoming,
  };
}
export function createTeleportTablets({
  client = null,
  canUse = () => true,
  onStart = () => {},
  onArrive = () => {},
  onMessage = () => {},
  now = Date.now,
}: TabletOptions = {}) {
  const state = {
    active: false,
    flight: null as TabletFlight | null,
    pose: null as ReturnType<typeof tabletTeleportPose> | null,
  };
  const inventory = () => tabletCounts(client?.state.inventory?.tablets);
  function start(flight: TabletFlight) {
    if (!serverConnected(client)) return;
    state.active = true;
    state.flight = flight;
    state.pose = tabletTeleportPose(
      flight,
      Math.max(0, (now() + (client.state.serverOffset || 0) - flight.startedAt) / 1000),
    );
    onStart();
  }
  function finish(position: Position) {
    state.active = false;
    state.pose = null;
    state.flight = null;
    onArrive(position);
  }
  client?.subscribe((message) => {
    if (message.type === 'tabletTeleport') start(message.flight);
    if (message.type === 'tabletArrived') {
      finish(message.position);
      onMessage(message.message, 'Teleport');
    }
    if (
      (message.type === 'welcome' ||
        (message.type === 'position' &&
          (['teleport', 'jail', 'respawn'] satisfies [string, string, string]).includes(
            message.reason || '',
          ))) &&
      state.active
    ) {
      state.active = false;
      state.pose = null;
      state.flight = null;
    }
  });
  async function buy(id: string) {
    if (!TABLET_PLACES.includes(id)) return { ok: false, message: 'That tablet is unavailable.' };
    return serverCommand(client, 'buyTablet', { destination: id });
  }
  async function use(id: string) {
    if (!TABLET_PLACES.includes(id) || !inventory()[id])
      return { ok: false, message: 'Buy a tablet from the wizard first.' };
    if (state.active || !canUse())
      return {
        ok: false,
        message: 'Stand on solid ground, outside custody, before breaking a tablet.',
      };
    return serverCommand(client, 'useTablet', { destination: id });
  }
  function update() {
    if (!state.active || !state.flight || !serverConnected(client)) return;
    const seconds = Math.max(
      0,
      (now() + (client.state.serverOffset || 0) - state.flight.startedAt) / 1000,
    );
    state.pose = tabletTeleportPose(state.flight, seconds);
  }
  return { state, inventory, buy, use, update, start };
}
