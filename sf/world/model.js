import { createSFWorld } from './scene.js';

/** Headless authoritative geometry; no browser startup or rendering. */
export function createWorldModel(options = {}) {
  return createSFWorld({ ...options, headless: true });
}
