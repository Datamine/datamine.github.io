import { configuredDialogue } from './dialogue-config.js';
export const SALES_THINK_SECONDS = 10;
export function softwareSalesChance(percent) {
  return 0.1 + (0.4 * Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0))) / 100;
}

/** A single pending pitch reserves the prospect's attention, not the player's
 * money. Only a successful decision consumes a saved software copy and pays. */
export function createSocialBusiness({
  economy,
  inebriation,
  random = Math.random,
  onEvent = () => {},
}) {
  const state = { pitch: null };
  let lastClock = null;
  function cancelPitch() {
    const pitch = state.pitch;
    if (!pitch) return false;
    state.pitch = null;
    pitch.npc.waiting = false;
    pitch.npc.thinking = false;
    return true;
  }
  function startPitch(npc) {
    if (state.pitch)
      return {
        ok: false,
        message: 'One salesman is already thinking about your pitch. Give him ten seconds.',
      };
    if (!economy.state.softwareCopies)
      return {
        ok: false,
        message: 'Buy a copy of sales software from the redheaded vendor first. It costs 10 coins.',
      };
    const percent = inebriation.state.percent,
      chance = softwareSalesChance(percent);
    state.pitch = { npc, remaining: 10, chance, percent };
    npc.waiting = true;
    npc.thinking = true;
    return {
      ok: true,
      pending: true,
      message:
        '“Let me think about how this helps me sell more sales software…” He needs ten seconds. Your purchase chance is ' +
        Math.round(chance * 100) +
        '%.',
    };
  }
  function update(seconds, { eligible = true, insideTwitter = false, sitting = false } = {}) {
    if (!eligible || !Number.isFinite(seconds) || seconds <= 0) return null;
    inebriation.update(seconds, { gainPerSecond: insideTwitter ? 3 : 0, sitting });
    const pitch = state.pitch;
    if (!pitch) return null;
    pitch.remaining = Math.max(0, pitch.remaining - seconds);
    if (pitch.remaining > 1e-8) return null;
    state.pitch = null;
    pitch.npc.waiting = false;
    pitch.npc.thinking = false;
    const accepted = random() < pitch.chance,
      result = accepted ? economy.trade('sales-software-sale') : { ok: false };
    const message = result.ok
      ? '“This will help me sell more software for selling software!” He buys one copy for ' +
        result.earned +
        ' coins' +
        (result.bonus ? ' (including your iPhone bonus)' : '') +
        '.'
      : accepted
        ? result.message
        : '“Let us circle back next quarter.” He declines. You keep your copy and can try another pitch.';
    const event = {
      type: 'sales-decision',
      npc: pitch.npc,
      accepted: !!result.ok,
      message,
      chance: pitch.chance,
      earned: result.earned || 0,
    };
    onEvent(event);
    return event;
  }
  function advanceTo(time, options = {}) {
    if (!Number.isFinite(time)) {
      lastClock = null;
      return null;
    }
    if (options.eligible === false) {
      lastClock = null;
      return null;
    }
    if (lastClock !== null && time < lastClock) return null;
    const before = lastClock;
    lastClock = time;
    return update(before === null ? 0 : (time - before) / 1000, options);
  }
  return {
    state,
    startPitch,
    cancelPitch,
    update,
    advanceTo,
    suspend() {
      lastClock = null;
    },
  };
}
export function softwareSalesDialogue(npc, economy, game, inebriation) {
  const id =
    npc.kind === 'software-vendor'
      ? 'software-vendor'
      : npc.thinking
        ? 'software-thinking'
        : 'software-buyer';
  return configuredDialogue(
    id,
    npc,
    { pitch: () => game.startPitch(npc) },
    { chance: Math.round(softwareSalesChance(inebriation.state.percent) * 100) },
  );
}
