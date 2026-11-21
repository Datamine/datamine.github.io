import { isFiniteNumber } from '../types/json.ts';
/** Static geometry budget includes decoded CPU buffers and WebGL buffers.
 * Zero retains the finite world for the whole session. Visible tiles are
 * always protected, even if a very small budget cannot fit the current view.
 * Override per session with ?mapMemoryMB=256 (MiB), or =0 to retain everything.
 * This covers geometry, not textures, JavaScript objects or browser overhead.
 * characterGeometryMiB is a separate cache for reusable body/wearable VBOs;
 * current-frame assets are protected when that soft budget is exceeded. */
export const RENDERING = {
  characterGeometryMiB: 64,
  desktopGeometryMiB: 0,
  constrainedGeometryMiB: 192,
  constrainedDeviceMemoryGiB: 4,
  preloadDesktopScenery: true,
};

export function sceneryMemoryLimit({
  deviceMemory,
  coarsePointer = false,
  override = null,
}: { deviceMemory?: unknown; coarsePointer?: boolean; override?: string | number | null } = {}) {
  const explicit = override === null || override === '' ? null : Number(override);
  const constrained =
    coarsePointer ||
    (isFiniteNumber(deviceMemory) && deviceMemory <= RENDERING.constrainedDeviceMemoryGiB);
  const mib =
    explicit !== null && Number.isFinite(explicit) && explicit >= 0
      ? explicit
      : constrained
        ? RENDERING.constrainedGeometryMiB
        : RENDERING.desktopGeometryMiB;
  return mib * 1024 * 1024;
}
