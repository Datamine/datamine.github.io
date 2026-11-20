/** Browser controllers expose snapshots/selectors and explicit server intents.
 * The authoritative domain object is never patched. Simulation clocks and
 * persistence methods are deliberately absent from a browser view. */
export function createClientControllerFactory({
  client,
  announce = () => {},
  headless = false,
  getWorld = () => null,
  getSecretWorld = () => null,
  onBoard = () => {},
}) {
  function request(action, args = {}) {
    const promise = client.command(action, args).then((result) => {
      if (result.message) announce(result.message, result.ok ? 'You' : 'Server');
      return result;
    });
    return { ok: true, pending: true, message: 'Waiting for the server…', promise };
  }
  const personal = (verb, args = {}) => request('playerAction', { verb, ...args });
  const inventory = (op, args = {}) => request('inventory', { op, ...args });
  const moveTo = (x, z) => getWorld()?.moveTo(x, z) ?? (request('moveTo', { x, z }), true);
  const denied = () => ({ ok: false, message: 'Game state is determined by the server.' });
  const simulation = new Set(['update', 'advanceTo', 'suspend', 'save', 'train', 'gain', 'move']);
  return function view(kind, source) {
    if (headless) return source;
    const descriptors = Object.getOwnPropertyDescriptors(source);
    for (const key of simulation) delete descriptors[key];
    const result = Object.defineProperties({}, descriptors);
    const commands =
      {
        economy: {
          trade: (kind) => inventory('trade', { kind }),
          credit: denied,
          buyEquipment: denied,
          buyHat: (id) => inventory('buyHat', { id }),
          buyPhone: () => inventory('buyPhone'),
          equipPhone: (on) => inventory('equipPhone', { on }),
          losePhone: denied,
          buyRobotaxi: () => inventory('buyRobotaxi'),
        },
        strength: { claim: () => personal('claimFunding') },
        quests: {
          accept: () => personal('acceptMonkey'),
          steal: () => personal('stealMonkey'),
          complete: () => personal('completeMonkey'),
          recover: denied,
        },
        theyLive: {
          start: denied,
          certificate: () => personal('certificate'),
          permit: () => personal('permit'),
          weapon: () => personal('bayonet'),
          reward: () => personal('skateboard'),
          defeat: denied,
        },
        sunglasses: { pickUp: () => personal('pickSunglasses') },
        inebriation: { drink: () => personal('drinkBeer'), set: denied },
        tech: {
          losePhone: denied,
          buyPhone: () => inventory('buyPhone'),
          equipPhone: (on) => inventory('equipPhone', { on }),
          buyRobotaxi: () => inventory('buyRobotaxi'),
        },
        social: {
          startPitch: (npc) => personal('pitch', { id: npc.id }),
          cancelPitch: () => (source.state.pitch ? personal('cancelPitch') : { ok: true }),
        },
        job: { recordInterview: denied },
        fishing: {
          start: () => personal('fish'),
          cancel: () => (source.state.active ? personal('cancelFishing') : { ok: true }),
        },
        deli: {
          pickup: (store) => inventory('pickup', { store }),
          order: () => inventory('order'),
          eat: () => inventory('eat'),
          storeSandwich: denied,
        },
        motorcycle: {
          rent: () => personal('rentMotorcycle'),
          mount: (...args) => {
            request('activity', { mode: 'motorcycle' });
            return source.mount(...args);
          },
          park: (...args) => {
            const riding = source.state.riding;
            const result = source.park(...args);
            if (riding) request('activity', { mode: 'walk' });
            return result;
          },
        },
        ferrari: {
          mount: (...args) => {
            request('activity', { mode: 'ferrari' });
            return source.mount(...args);
          },
          park: (...args) => {
            request('activity', { mode: 'walk' });
            return source.park(...args);
          },
          driveTo: moveTo,
          refuel: () => personal('refuel'),
        },
        airship: {
          board: () => {
            request('airshipBoard', { price: client.state.world?.airship?.rentalPrice });
            return true;
          },
          flyTo: (x, z) => {
            request('airshipTarget', { x, z });
            return client.state.world?.airship?.captain === client.state.id;
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
            if (source.state.active || client.state.self?.grappling) request('airshipLeave');
            return source.cancel();
          },
          resetPresentation: () => source.cancel(),
        },
        basket: {
          walkTo: (x, z) => {
            const accepted = source.walkTo(x, z);
            if (accepted) request('airshipDeck', { x, z });
            return accepted;
          },
        },
        rope: {
          invite: () => {
            request('airshipInvite');
            return true;
          },
          retract: () => {
            request('airshipRope', { retract: true });
            return true;
          },
        },
        tahoe: {
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
        },
        bomber: {
          target: moveTo,
          barrelRoll: () => {
            request('barrelRoll');
            return true;
          },
        },
        secret: { updatePresentation: () => source.update() },
        police: { start: denied },
        keeper: { start: denied, stop: denied },
        expeditions: {
          board: async () => {
            const result = await getSecretWorld().boardKraken(source);
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
          attack: (target, weapon) => {
            const personalTarget =
              !target.wilderness &&
              !['cow', 'raptor', 'bear', 'snow-giant', 'ice-giant'].includes(target.combatKind);
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
          collect: (item) =>
            request(
              item.network ? 'collect' : 'playerAction',
              item.network ? { id: item.id } : { verb: 'collectPersonal', id: item.id },
            ),
          stop: () => {
            client.state.pvpTarget = null;
            return request('stopAttack');
          },
        },
      }[kind] || {};
    Object.assign(result, commands);
    if (kind === 'quests') result.theyLive = view('theyLive', source.theyLive);
    if (kind === 'secret') result.bomber = view('bomber', source.bomber);
    return result;
  };
}
