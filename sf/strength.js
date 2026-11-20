import { GAMEPLAY } from './config/gameplay.js';
export const STRENGTH_XP_RATE = GAMEPLAY.strengthXPPerSecond;
import { skillStatus, SKILL_THRESHOLDS } from './progression.js';
export const STRENGTH_THRESHOLDS = SKILL_THRESHOLDS;
export const strengthStatus = skillStatus;
export function createStrength(saved = {}, onSave = () => {}) {
  const state = { xp: strengthStatus(saved?.xp).xp, funded: !!saved?.funded };
  let dirtyTime = 0;
  const save = () => {
    dirtyTime = 0;
    onSave({ ...state });
  };
  return {
    state,
    gain(amount) {
      if (!Number.isFinite(amount) || amount <= 0) return;
      state.xp = strengthStatus(state.xp + amount).xp;
      save();
    },
    get status() {
      return strengthStatus(state.xp);
    },
    train(seconds) {
      if (!Number.isFinite(seconds) || seconds <= 0 || state.xp >= STRENGTH_THRESHOLDS.at(-1))
        return null;
      const before = strengthStatus(state.xp).level;
      state.xp = Math.min(STRENGTH_THRESHOLDS.at(-1), state.xp + seconds * STRENGTH_XP_RATE);
      dirtyTime += seconds;
      const after = strengthStatus(state.xp).level;
      if (dirtyTime >= 2 || after !== before) save();
      return after !== before ? after : null;
    },
    claim(economy) {
      if (strengthStatus(state.xp).level < 10)
        return { ok: false, message: 'Reach strength level 10 at SF Fitness before we invest.' };
      if (state.funded)
        return { ok: false, message: 'We have already funded you. Make those 1,000 coins count.' };
      const result = economy.trade('capital');
      if (result.ok) {
        state.funded = true;
        save();
      }
      return result;
    },
    save,
  };
}
