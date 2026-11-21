import type { ActionReceipt, Actor } from '../types/world.ts';

export interface ControllerSources {
  economy: ReturnType<typeof import('../economy.ts').createEconomy>;
  strength: ReturnType<typeof import('../strength.ts').createStrength>;
  quests: ReturnType<typeof import('../quests.ts').createQuestLog>;
  theyLive: ReturnType<typeof import('../they-live.ts').createTheyLiveQuest>;
  sunglasses: ReturnType<typeof import('../sunglasses.ts').createSunglasses>;
  inebriation: ReturnType<typeof import('../inebriation.ts').createInebriation>;
  tech: ReturnType<typeof import('../tech-ventures.ts').createTechVentures>;
  social: ReturnType<typeof import('../sales-conference.ts').createSocialBusiness>;
  job: ReturnType<typeof import('../ai-lab.ts').createAILabJob>;
  fishing: ReturnType<typeof import('../fishing.ts').createFishing>;
  deli: ReturnType<typeof import('../deli.ts').createDeli>;
  motorcycle: ReturnType<typeof import('../motorcycle.ts').createMotorcycle>;
  ferrari: ReturnType<typeof import('../ferrari.ts').createFerrari>;
  airship: ReturnType<typeof import('../airship.ts').createAirship>;
  basket: ReturnType<typeof import('../airship-basket.ts').createAirshipBasket>;
  rope: ReturnType<typeof import('../airship-rope.ts').createAirshipRope>;
  tahoe: ReturnType<typeof import('../tahoe.ts').createTahoe>;
  bomber: ReturnType<typeof import('../stealth-bomber.ts').createStealthBomber>;
  secret: ReturnType<typeof import('../secret-adventures.ts').createSecretAdventures>;
  police: ReturnType<typeof import('../encounters.ts').createPoliceChase>;
  keeper: ReturnType<typeof import('../monkey-escape.ts').createMonkeyPursuit>;
  expeditions: ReturnType<typeof import('../jurassic.ts').createExpeditions>;
  sutro: ReturnType<typeof import('../sutro.ts').createSutroClimb>;
  rocket: ReturnType<typeof import('../rocket.ts').createRocketTravel>;
}
// CONTENT-BINDINGS-MIGRATED
/** Browser controllers expose snapshots/selectors and explicit server intents.
 * The authoritative domain object is never patched. Simulation clocks and
 * persistence methods are deliberately absent from a browser view. */
export function createClientControllerFactory({
  client = null,
  announce = () => {},
  headless = false,
  getWorld = () => null,
  getSecretWorld = () => null,
  onBoard = () => {},
}: {
  client?: {
    state: Partial<import('../types/network.ts').MultiplayerState>;
    command: (
      action: string,
      args?: object,
    ) => Promise<import('../types/network.ts').CommandResult>;
  } | null;
  announce?: (message: string, who?: string) => void;
  headless?: boolean;
  getWorld?: () => { moveTo(x: number, z: number): boolean } | null;
  getSecretWorld?: () => {
    boardKraken(source: ControllerSources['expeditions']): Promise<ActionReceipt>;
  } | null;
  onBoard?: () => void;
}) {
  const remote = client!;
  function request(action: string, args = {}): ActionReceipt {
    const promise = remote.command(action, args).then((result) => {
      if (result.message) announce(result.message, result.ok ? 'You' : 'Server');
      return result;
    });
    return { ok: true, pending: true, message: 'Waiting for the server…', promise };
  }
  const personal = (verb: string, args = {}) => request('playerAction', { verb, ...args });
  const inventory = (op: string, args = {}) => request('inventory', { op, ...args });
  const moveTo = (x: number, z: number) =>
    getWorld()?.moveTo(x, z) ?? (request('moveTo', { x, z }), true);
  const denied = () => ({ ok: false, message: 'Game state is determined by the server.' });
  const simulation = new Set([
    'update',
    'advanceTo',
    'suspend',
    'save',
    'train',
    'gain',
    'move',
  ] satisfies [string, string, string, string, string, string, string]);
  const builders = {
    economy: (source: ControllerSources['economy']) => ({
      trade: (kind: string) => inventory('trade', { kind }),
      credit: denied,
      buyEquipment: denied,
      buyHat: (id: string) => inventory('buyHat', { id }),
      buyPhone: () => inventory('buyPhone'),
      equipPhone: (on: boolean) => inventory('equipPhone', { on }),
      losePhone: denied,
      buyRobotaxi: () => inventory('buyRobotaxi'),
    }),
    strength: (source: ControllerSources['strength']) => ({
      claim: () => personal('claimFunding'),
    }),
    quests: (source: ControllerSources['quests']) => ({
      accept: () => personal('acceptMonkey'),
      steal: () => personal('stealMonkey'),
      complete: () => personal('completeMonkey'),
      recover: denied,
      contentNodeId: 'remote.controllers.createClientControllerFactory.node-1',
      actionId:
        'remote.controllers.createClientControllerFactory.action-2' + ':' + ['quests'].join(':'),
    }),
    theyLive: (source: ControllerSources['theyLive']) => ({
      start: denied,
      certificate: () => personal('certificate'),
      permit: () => personal('permit'),
      weapon: () => personal('bayonet'),
      reward: () => personal('skateboard'),
      defeat: denied,
    }),
    sunglasses: (source: ControllerSources['sunglasses']) => ({
      pickUp: () => personal('pickSunglasses'),
    }),
    inebriation: (source: ControllerSources['inebriation']) => ({
      drink: () => personal('drinkBeer'),
      set: denied,
    }),
    tech: (source: ControllerSources['tech']) => ({
      losePhone: denied,
      buyPhone: () => inventory('buyPhone'),
      equipPhone: (on: boolean) => inventory('equipPhone', { on }),
      buyRobotaxi: () => inventory('buyRobotaxi'),
    }),
    social: (source: ControllerSources['social']) => ({
      startPitch: (npc: Partial<Actor>) => personal('pitch', { id: npc.id }),
      cancelPitch: () => (source.state.pitch ? personal('cancelPitch') : { ok: true }),
    }),
    job: (source: ControllerSources['job']) => ({ recordInterview: denied }),
    fishing: (source: ControllerSources['fishing']) => ({
      start: () => personal('fish'),
      cancel: () => (source.state.active ? personal('cancelFishing') : { ok: true }),
    }),
    deli: (source: ControllerSources['deli']) => ({
      pickup: (store?: string) => inventory('pickup', { store }),
      order: () => inventory('order'),
      eat: () => inventory('eat'),
      storeSandwich: denied,
    }),
    motorcycle: (source: ControllerSources['motorcycle']) => ({
      rent: () => personal('rentMotorcycle'),
      mount: (...args: Parameters<ControllerSources['motorcycle']['mount']>) => {
        request('activity', { mode: 'motorcycle' });
        return source.mount(...args);
      },
      park: (...args: Parameters<ControllerSources['motorcycle']['park']>) => {
        const riding = source.state.riding;
        const result = source.park(...args);
        if (riding) request('activity', { mode: 'walk' });
        return result;
      },
    }),
    ferrari: (source: ControllerSources['ferrari']) => ({
      mount: (...args: Parameters<ControllerSources['ferrari']['mount']>) => {
        request('activity', { mode: 'ferrari' });
        return source.mount(...args);
      },
      park: (...args: Parameters<ControllerSources['ferrari']['park']>) => {
        request('activity', { mode: 'walk' });
        return source.park(...args);
      },
      driveTo: moveTo,
      refuel: () => personal('refuel'),
    }),
    airship: (source: ControllerSources['airship']) => ({
      board: () => {
        request('airshipBoard', { price: remote.state.world?.airship?.rentalPrice });
        return true;
      },
      flyTo: (x: number, z: number) => {
        request('airshipTarget', { x, z });
        return remote.state.world?.airship?.captain === remote.state.id;
      },
      stop: () => {
        request('airshipStop');
        return true;
      },
      returnHome: () => {
        request('airshipHome');
        return true;
      },
      cancel: () => {
        if (source.state.active || remote.state.self?.grappling) request('airshipLeave');
        return source.cancel();
      },
      resetPresentation: () => source.cancel(),
    }),
    basket: (source: ControllerSources['basket']) => ({
      walkTo: (x: number, z: number) => {
        const accepted = source.walkTo(x, z);
        if (accepted) request('airshipDeck', { x, z });
        return accepted;
      },
    }),
    rope: (source: ControllerSources['rope']) => ({
      invite: () => {
        request('airshipInvite');
        return true;
      },
      retract: () => {
        request('airshipRope', { retract: true });
        return true;
      },
    }),
    tahoe: (source: ControllerSources['tahoe']) => ({
      gondola: () => {
        request('travel', { kind: 'gondola' });
        return true;
      },
      startSki: () => {
        request('travel', { kind: 'ski' });
        return true;
      },
      flip: () => {
        request('travel', { kind: 'skiFlip' });
        return true;
      },
      steerTo: moveTo,
    }),
    bomber: (source: ControllerSources['bomber']) => ({
      target: moveTo,
      barrelRoll: () => {
        request('barrelRoll');
        return true;
      },
    }),
    secret: (source: ControllerSources['secret']) => ({
      updatePresentation: () => source.update(),
    }),
    police: (source: ControllerSources['police']) => ({ start: denied }),
    keeper: (source: ControllerSources['keeper']) => ({ start: denied, stop: denied }),
    expeditions: (source: ControllerSources['expeditions']) => ({
      board: async () => {
        const result = await getSecretWorld()!.boardKraken(source);
        if (result.ok) onBoard();
        return result;
      },
      startQuest: () => personal('startRaptor'),
      finishQuest: () => personal('finishRaptor'),
      returnShip: () => personal('returnShip'),
      recover: denied,
      toggleWeapon: () => {
        const on = !source.state.equipped;
        personal('equipRailgun', { on });
        return true;
      },
      attack: (target: Actor, weapon?: string): ActionReceipt => {
        const personalTarget =
          !target.wilderness &&
          !(
            ['cow', 'raptor', 'bear', 'snow-giant', 'ice-giant'] satisfies [
              string,
              string,
              string,
              string,
              string,
            ]
          ).includes(target.combatKind || '');
        request(
          personalTarget ? 'playerAction' : 'attack',
          personalTarget
            ? {
                verb: target.combatKind === 'kraken' ? 'attackKraken' : 'attackPersonal',
                id: target.id,
                weapon,
              }
            : { id: target.id, weapon },
        );
        return { ok: true };
      },
      collect: (item: import('../types/expeditions.ts').ExpeditionLoot) =>
        request(
          item.network ? 'collect' : 'playerAction',
          item.network ? { id: item.id } : { verb: 'collectPersonal', id: item.id },
        ),
      stop: () => {
        remote.state.pvpTarget = null;
        return request('stopAttack');
      },
    }),
  };
  type RemoteCommands = { [K in keyof typeof builders]: ReturnType<(typeof builders)[K]> };
  type View<K extends keyof ControllerSources> = K extends keyof RemoteCommands
    ? Omit<ControllerSources[K], keyof RemoteCommands[K]> & RemoteCommands[K]
    : ControllerSources[K];
  return function view<K extends keyof ControllerSources>(
    kind: K,
    source: ControllerSources[K],
  ): ControllerSources[K] | View<K> {
    if (headless) return source;
    const descriptors = Object.getOwnPropertyDescriptors(source);
    for (const key of simulation) delete descriptors[key];
    const result = Object.defineProperties({}, descriptors) as ControllerSources[K] & {
      theyLive?: ControllerSources['theyLive'];
      bomber?: ControllerSources['bomber'];
    };
    const commands =
      (builders as { [P in keyof ControllerSources]?: (value: ControllerSources[P]) => object })[
        kind
      ]?.(source) || {};
    Object.assign(result, commands);
    if (kind === 'quests')
      Object.assign(result, {
        theyLive: view('theyLive', (source as ControllerSources['quests']).theyLive),
      });
    if (kind === 'secret')
      Object.assign(result, {
        bomber: view('bomber', (source as ControllerSources['secret']).bomber),
      });
    return result;
  };
}
