import { createActorMotionGroup } from './snapshot-motion.js';

/** Read models for chases. Routes, captures and damage remain server-owned. */
export function createPursuitPresentation({ police, keeper, zoo, raptor, now } = {}) {
  const motion = createActorMotionGroup({ now });
  let lastPolice = null,
    lastKeeper = null,
    lastZoo = null,
    lastRaptor = null;
  function actors(prefix, previous, incoming, time) {
    const byId = new Map(previous.map((n) => [n.index, n])),
      active = new Set();
    const result = incoming.map((source) => {
      const id = prefix + source.index,
        target = byId.get(source.index) || {};
      active.add(id);
      motion.accept(id, target, source, time);
      return target;
    });
    motion.retain(active, prefix);
    return result;
  }
  function syncPersonal(state, time) {
    if (police && state.police && state.police !== lastPolice) {
      lastPolice = state.police;
      const { officers, ...flags } = state.police;
      Object.assign(police.state, flags);
      police.state.officers = actors('police/', police.state.officers, officers || [], time);
    }
    if (keeper && state.keeper && state.keeper !== lastKeeper) {
      lastKeeper = state.keeper;
      const { actor, ...flags } = state.keeper;
      Object.assign(keeper.state, flags);
      if (actor) motion.accept('keeper', keeper.state.actor, actor, time);
    }
  }
  function syncWorld(state, time) {
    if (zoo && state.tiger && state.tiger !== lastZoo) {
      lastZoo = state.tiger;
      const { tiger, wardens, ...flags } = state.tiger;
      // Retain render objects; never mutate objects held in client.state.
      motion.accept('zoo', zoo.state, flags, time);
      motion.accept('tiger', zoo.state.tiger, tiger, time);
      zoo.state.wardens = actors('warden/', zoo.state.wardens, wardens || [], time);
    }
    if (raptor && state.raptor && state.raptor !== lastRaptor) {
      lastRaptor = state.raptor;
      motion.accept('raptor', raptor, state.raptor, time);
    }
  }
  return {
    syncPersonal,
    syncWorld,
    update: (connected) => motion.update(connected),
    clear() {
      motion.clear();
      lastPolice = lastKeeper = lastZoo = lastRaptor = null;
    },
  };
}
