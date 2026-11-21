/** Only fields consumed by this presentation controller, independent of transport envelopes. */
type SecretMessage = Pick<ServerEvent, 'guild' | 'illuminati' | 'bomber'> &
  (
    | { type: 'welcome'; instance?: MapInstance }
    | { type: 'instance'; instance: MapInstance; position?: Position }
    | Pick<Extract<ServerEvent, { type: 'bombLaunched' }>, 'type' | 'bomb'>
    | Pick<Extract<ServerEvent, { type: 'bomberLanded' }>, 'type' | 'message'>
    | Pick<Extract<ServerEvent, { type: 'bomberEjected' }>, 'type' | 'player' | 'flight' | 'crash'>
    | {
        type: Exclude<
          ServerEvent['type'],
          'welcome' | 'instance' | 'bombLaunched' | 'bomberLanded' | 'bomberEjected'
        >;
      }
  );
import type { MapInstance } from './types/server.ts';
import type { Position, ServerEvent, MultiplayerState, CommandResult } from './types/network.ts';
import type { VisibleBomb, VisibleCrash } from './types/aircraft.ts';
interface SecretClient {
  state: Pick<MultiplayerState, 'connected'> & Partial<MultiplayerState>;
  command: (action: string, args?: object) => Promise<CommandResult>;
  subscribe: (listener: (message: ServerEvent) => void) => () => void;
}
interface SecretOptions {
  client?: SecretClient | null;
  guildSite?: { x: number; y: number; w: number; d: number; rotation?: number };
  ground?: (x: number, z: number) => number;
  cruiseHeight?: () => number;
  boostSpeed?: () => number;
  transition?: (event: {
    instance: MapInstance;
    position: Position | undefined;
    bomber: { active: boolean; phase?: string } | null;
  }) => void;
  onMessage?: (message: string, who?: string) => void;
  onProgress?: () => void;
  now?: () => number;
  frameTime?: () => number;
}
// CONTENT-BINDINGS-MIGRATED
import { PUBLIC_INSTANCE, guildSecretSites } from './map-instances.ts';
import { serverCommand, serverConnected } from './server-connection.ts';
import { illuminatusQuestEntry } from './illuminatus.ts';
import { createStealthBomber } from './stealth-bomber.ts';

/** Instance permissions, aircraft ownership and damage always come from the server. */
export function createSecretAdventures({
  client = null,
  guildSite,
  ground,
  cruiseHeight,
  boostSpeed,
  transition = () => {},
  onMessage = () => {},
  onProgress = () => {},
  now = Date.now,
  frameTime = () => performance.now(),
}: SecretOptions) {
  let instance: MapInstance = PUBLIC_INSTANCE,
    initiated = client?.state.illuminati === true,
    boardPending = false;
  let bomberOwned = client?.state.bomber?.owned === true;
  const bomber = createStealthBomber({ ground, now, cruiseHeight, boostSpeed }),
    bombs: VisibleBomb[] = [],
    crashes: VisibleCrash[] = [];
  function completeQuest() {
    if (bomberOwned) return;
    bomberOwned = true;
    onMessage(
      'Quest complete: Illuminatus! Your personal B-2 and replacement privileges are unlocked.',
      'Quest',
    );
    onProgress();
  }
  const sites = guildSecretSites(guildSite);
  function change(
    next: MapInstance,
    position: Position | undefined,
    aircraft: { active: boolean } | null = null,
  ) {
    instance = next;
    if (aircraft?.active) bomber.board(position);
    else bomber.stop();
    transition({ instance, position, bomber: aircraft });
  }
  function accept(message: SecretMessage) {
    if (message.illuminati !== undefined) initiated = message.illuminati;
    if (message.bomber) {
      bomber.state.bombReadyAt = message.bomber.readyAt - (client?.state.serverOffset || 0);
      if (message.type === 'welcome') bomberOwned = message.bomber.owned === true;
      else if (message.bomber.owned) completeQuest();
    }
    if (message.type === 'instance') change(message.instance, message.position, message.bomber);
    if (message.type === 'welcome') {
      instance = message.instance || PUBLIC_INSTANCE;
      bomber.stop();
    }
    if (message.type === 'bombLaunched')
      bombs.push({ ...message.bomb, started: frameTime(), impacted: true });
    if (message.type === 'bomberLanded') onMessage(message.message, 'Illuminati');
    if (message.type === 'bomberEjected') {
      crashes.push({ ...message.crash, started: frameTime() });
      if (message.player === client?.state.id) {
        bomber.eject(message.flight);
        transition({
          instance: PUBLIC_INSTANCE,
          position: message.flight.from,
          bomber: { active: true, phase: 'parachuting' },
        });
      }
    }
    if (message.guild || message.illuminati !== undefined || message.bomber) onProgress();
  }
  if (client) {
    initiated = client.state.illuminati === true;
    if (client.state.bomber)
      bomber.state.bombReadyAt = client.state.bomber.readyAt - (client.state.serverOffset || 0);
    client.subscribe(accept);
  }
  async function remote(action: string, args: { kind?: string } | undefined = {}) {
    const r = await serverCommand(client, action, args);
    if (r.message) onMessage(r.message, r.ok ? 'Illuminati' : 'Server');
    return r;
  }
  const join = () => remote('joinIlluminati'),
    enterCave = () => remote('instanceEnter', { kind: 'illuminati' }),
    leave = () => remote('instanceLeave'),
    boardBomber = () => remote('bomberBoard'),
    returnBomber = () => remote('bomberReturn'),
    ejectBomber = () => remote('bomberEject'),
    dropBomb = () => remote('bomberBomb');
  function update() {
    if (!serverConnected(client)) return;
    for (let i = crashes.length - 1; i >= 0; i--)
      if (frameTime() - crashes[i].started > 6200) crashes.splice(i, 1);
    for (let i = bombs.length - 1; i >= 0; i--)
      if (frameTime() - bombs[i].started > 2200) bombs.splice(i, 1);
  }
  async function boardKraken(game: {
    ship: { aboard: boolean };
    state: { railgun: boolean; krakenReward: boolean };
  }) {
    if (!serverConnected(client)) return serverCommand(client, 'instanceEnter', { kind: 'kraken' });
    if (boardPending || game.ship.aboard || !game.state.railgun || game.state.krakenReward)
      return { ok: false, message: 'The Pequod is not ready to sail.' };
    boardPending = true;
    try {
      const result = await serverCommand(client, 'instanceEnter', { kind: 'kraken' });
      return result.ok
        ? { ...result, message: 'Ahab unfurls the sails. The Pequod sets off toward the kraken.' }
        : result;
    } finally {
      boardPending = false;
    }
  }
  return {
    bomber,
    bombs,
    crashes,
    sites,
    join,
    enterCave,
    leave,
    boardBomber,
    returnBomber,
    ejectBomber,
    dropBomb,
    update,
    boardKraken,
    questEntry: (guild: Partial<import('./types/content.ts').GuildProgress> | undefined) =>
      illuminatusQuestEntry({
        guild,
        initiated,
        bomberOwned,
        inHangar: instance.kind === 'illuminati',
      }),
    get instance() {
      return instance;
    },
    get kind() {
      return instance.kind;
    },
    get initiated() {
      return initiated;
    },
    reset() {
      instance = PUBLIC_INSTANCE;
      bomber.stop();
      bombs.length = 0;
      crashes.length = 0;
    },
    accept,
    contentNodeId: 'secret-adventures.createSecretAdventures.node-1',
  };
}
