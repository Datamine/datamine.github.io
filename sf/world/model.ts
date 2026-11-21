import type { Place, Site } from '../types/world.ts';
import type { ControllerSources } from '../client/controllers.ts';
import { createSFWorld } from './scene.ts';

/** Headless authoritative geometry; no browser startup or rendering. */
export function createWorldModel(options = {}) {
  const world = createSFWorld({ ...options, headless: true })!;
  // Headless worlds retain their authoritative controllers; browser facades are never installed.
  type Authoritative = {
    places: Place[];
    fishingSite: import('../types/world.ts').FishingSite;
    sunglassesSite: Site;
    sandSite: Site;
    pacificaSurfSite: Site;
    pequodSite: Site;
    airship: ControllerSources['airship'];
    expeditions: ControllerSources['expeditions'];
    economy: ControllerSources['economy'];
    quests: ControllerSources['quests'];
    tahoe: ControllerSources['tahoe'];
    sutroClimb: ControllerSources['sutro'];
    rocket: ControllerSources['rocket'];
  };
  return world as Omit<typeof world, keyof Authoritative> & Authoritative;
}
