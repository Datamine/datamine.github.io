/** Stable immutable component snapshots. Compare small explicit field lists;
 * capture a DTO and advance its revision only when that component changes. */
export function createComponentTracker() {
  const entries = new Map();
  let revision = 0;
  return {
    entries,
    publish(key, fields, capture) {
      const previous = entries.get(key);
      if (
        previous &&
        fields.length === previous.fields.length &&
        fields.every((value, index) => Object.is(value, previous.fields[index]))
      )
        return previous;
      const entry = { version: ++revision, fields, value: structuredClone(capture()) };
      entries.set(key, entry);
      return entry;
    },
    remove(key) {
      entries.delete(key);
    },
  };
}
const actorFields = (actor) => [
  actor.x,
  actor.y,
  actor.z,
  actor.angle,
  actor.phase,
  actor.travel,
  actor.moving,
];
const actorView = (actor) => ({
  x: actor.x,
  y: actor.y,
  angle: actor.angle,
  phase: actor.phase,
  travel: actor.travel,
  moving: actor.moving,
  index: actor.index,
});

export function createPlayerComponents({ movement, shared }) {
  const trackers = new Map();
  function sample(p, r, travelState) {
    let tracker = trackers.get(p.id);
    if (!tracker) {
      tracker = createComponentTracker();
      trackers.set(p.id, tracker);
    }
    const s = movement.state(p),
      fishing = r.fishing.state,
      delivery = r.deli.state,
      pitch = r.social.state.pitch,
      police = r.police.state,
      keeper = r.keeper.state;
    const active =
      fishing.active ||
      delivery.pending ||
      !!pitch ||
      police.wanted ||
      keeper.phase !== 'idle' ||
      p.instance?.kind === 'kraken' ||
      ['ferrari', 'rocket', 'climb', 'gondola', 'ski', 'surf', 'bomber', 'parachute'].includes(
        p.mode,
      );
    const identity = p.instance?.id || 'world';
    if (
      !active &&
      !tracker.wasActive &&
      tracker.revision === (p.presentationRevision || 0) &&
      tracker.mode === p.mode &&
      tracker.instance === identity &&
      tracker.training === !!p.training &&
      tracker.jailed === !!p.personalJailed
    )
      return tracker.entries;
    Object.assign(tracker, {
      wasActive: !!active,
      revision: p.presentationRevision || 0,
      mode: p.mode,
      instance: identity,
      training: !!p.training,
      jailed: !!p.personalJailed,
    });
    const publish = tracker.publish;
    publish('training', [!!p.training], () => !!p.training);
    publish('fishing', [fishing.active, fishing.elapsed], () => ({
      active: fishing.active,
      elapsed: fishing.elapsed,
    }));
    publish(
      'delivery',
      [
        delivery.pending,
        delivery.pending && delivery.position.x,
        delivery.pending && delivery.position.y,
        delivery.pending && delivery.angle,
        delivery.pending && delivery.travel,
      ],
      () =>
        delivery.pending
          ? { position: delivery.position, angle: delivery.angle, travel: delivery.travel }
          : null,
    );
    publish('pitch', [pitch?.npc.id, pitch?.remaining, pitch?.chance], () =>
      pitch ? { id: pitch.npc.id, remaining: pitch.remaining, chance: pitch.chance } : null,
    );
    publish(
      'police',
      [police.wanted, police.jailed, police.elapsed, ...police.officers.flatMap(actorFields)],
      () => ({
        wanted: police.wanted,
        jailed: police.jailed,
        elapsed: police.elapsed,
        officers: police.officers.map(actorView),
      }),
    );
    publish('keeper', [keeper.phase, keeper.elapsed, ...actorFields(keeper.actor)], () => ({
      phase: keeper.phase,
      elapsed: keeper.elapsed,
      actor: actorView(keeper.actor),
    }));
    publish('vehicle', [p.mode, s.ferrari?.state.fuel], () => ({
      mode: p.mode,
      fuel: s.ferrari?.state.fuel,
    }));
    const rocket = s.rocket.state,
      tahoe = s.tahoeValue?.state,
      sutro = s.sutro.state,
      bomber = s.bomber.state;
    publish(
      'travel',
      [
        rocket.active,
        rocket.active && rocket.phase,
        rocket.active && rocket.elapsed,
        rocket.active && rocket.pitch,
        rocket.active && rocket.heading,
        tahoe?.mode,
        tahoe?.travel,
        tahoe?.progress,
        tahoe?.rented,
        sutro.active,
        sutro.active && sutro.progress,
        sutro.active && sutro.phase,
        p.bomberActive,
        p.bomberActive && bomber.boost,
        p.bomberActive && bomber.rollElapsed,
        s.mode,
        s.mode === 'surf' && shared.clock,
      ],
      () => travelState(p),
    );
    if (p.instance?.kind === 'kraken') {
      const ship = r.expeditions.ship,
        kraken = r.expeditions.kraken,
        loot = r.expeditions.state.loot;
      publish(
        'ship',
        [ship.aboard, ship.phase, ship.progress, ship.x, ship.z, ship.angle],
        () => ship,
      );
      publish(
        'kraken',
        [kraken.hp, kraken.visible, kraken.enraged, kraken.x, kraken.z],
        () => kraken,
      );
      publish(
        'loot',
        [...loot.flatMap((item) => [item.id, item.x, item.z, item.amount])],
        () => loot,
      );
    } else for (const key of ['ship', 'kraken', 'loot']) tracker.remove(key);
    return tracker.entries;
  }
  return { sample, remove: (id) => trackers.delete(id) };
}
