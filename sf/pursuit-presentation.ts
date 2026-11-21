export interface PursuitActorView {
  index?: number;
  x?: number;
  y?: number;
  z?: number;
  angle?: number;
  phase?: string | number;
  travel?: number;
  moving?: boolean;
  hp?: number;
  max?: number;
}
export interface PoliceView {
  officers: PursuitActorView[];
  wanted?: boolean;
  jailed?: boolean;
  elapsed?: number;
}
export interface KeeperView {
  actor: PursuitActorView;
  phase?: string;
  elapsed?: number;
}
export interface ZooView {
  tiger: PursuitActorView;
  wardens: PursuitActorView[];
  phase?: string;
  elapsed?: number;
  gate?: number;
}
export interface PersonalPursuits {
  police?: Partial<PoliceView> | null;
  keeper?: Partial<KeeperView> | null;
}
interface WorldPursuits {
  tiger?: ZooView | null;
  raptor?: object | null;
}
interface PursuitOptions {
  police?: { state: PoliceView };
  keeper?: { state: KeeperView };
  zoo?: { state: ZooView };
  raptor?: object;
  now?: () => number;
}
import { createActorMotionGroup } from './snapshot-motion.ts';

/** Read models for chases. Routes, captures and damage remain server-owned. */
export function createPursuitPresentation({
  police,
  keeper,
  zoo,
  raptor,
  now,
}: PursuitOptions = {}) {
  const motion = createActorMotionGroup({ now });
  let lastPolice: PersonalPursuits['police'] = null,
    lastKeeper: PersonalPursuits['keeper'] = null,
    lastZoo: WorldPursuits['tiger'] = null,
    lastRaptor: WorldPursuits['raptor'] = null;
  function actors(
    prefix: string,
    previous: PursuitActorView[],
    incoming: PursuitActorView[],
    time: number,
  ) {
    const byId = new Map(previous.map((n) => [n.index, n])),
      active = new Set<string>();
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
  function syncPersonal(state: PersonalPursuits, time: number) {
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
  function syncWorld(state: WorldPursuits, time: number) {
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
    update: (connected: boolean) => motion.update(connected),
    clear() {
      motion.clear();
      lastPolice = lastKeeper = lastZoo = lastRaptor = null;
    },
  };
}
