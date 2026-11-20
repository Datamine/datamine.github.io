import { configuredDialogue } from './dialogue-config.js';
export const IPHONE_PRICE = 100,
  ROBOTAXI_PRICE = 100,
  ROBOTAXI_PAY = 20,
  ROBOTAXI_INTERVAL = 60,
  DOOMSCROLL_INTERVAL = 120,
  DOOMSCROLL_DAMAGE = 5;

/** Visible-world elapsed time, with saved partial intervals. Rendering cadence,
 * dialogue, and character settings do not change the rate. Hidden/closed worlds
 * suspend the clock rather than granting offline income or offline damage. */
export function createTechVentures({
  economy,
  health,
  saved = {},
  onSave = () => {},
  onMessage = () => {},
  onDeath = () => {},
}) {
  const elapsed = (value, limit) =>
    Number.isFinite(value) && value >= 0 ? Math.min(limit - 0.000001, value) : 0;
  const state = {
    doomElapsed: economy.state.iphoneOwned ? elapsed(saved.doomElapsed, 120) : 0,
    taxiElapsed: economy.state.robotaxiOwned ? elapsed(saved.taxiElapsed, 60) : 0,
  };
  let checkpoint = 0,
    lastClock = null;
  const save = () => {
    checkpoint = 0;
    onSave({ ...state });
  };
  function buyPhone() {
    const r = economy.buyPhone();
    if (r.ok) {
      state.doomElapsed = 0;
      save();
    }
    return {
      ...r,
      message: r.ok
        ? 'Tim Apple hands you an equipped iPhone. You earn 25% more money, but doomscrolling costs 5 HP every two equipped minutes. Unequip it in Character settings. Death or arrest loses the phone.'
        : r.message,
    };
  }
  function equipPhone(on) {
    const r = economy.equipPhone(on);
    if (r.ok) save();
    return r;
  }
  function losePhone(reason = 'death') {
    const r = economy.losePhone();
    if (!r.ok) return r;
    state.doomElapsed = 0;
    save();
    onMessage(
      reason === 'arrest'
        ? 'Your iPhone is confiscated during the arrest. The earnings boost is gone.'
        : 'You lose your iPhone on death. The earnings boost is gone.',
    );
    return r;
  }
  function buyRobotaxi() {
    const r = economy.buyRobotaxi();
    if (r.ok) {
      state.taxiElapsed = 0;
      save();
    }
    return {
      ...r,
      message: r.ok
        ? 'Your robotaxi is dispatched. It earns 20 coins every minute while this world is open. An equipped iPhone boosts that to 25. Ownership survives death and arrest.'
        : r.message,
    };
  }
  function update(seconds, { eligible = true } = {}) {
    if (!eligible || !Number.isFinite(seconds) || seconds <= 0) return { earned: 0, damage: 0 };
    let remaining = seconds,
      earned = 0,
      damage = 0,
      changed = false;
    while (remaining > 1e-9) {
      const phone = economy.state.iphoneEquipped && health.state.hp > 0,
        taxi = economy.state.robotaxiOwned;
      if (!phone && !taxi) break;
      const nextDoom = phone ? 120 - state.doomElapsed : Infinity,
        nextPay = taxi ? 60 - state.taxiElapsed : Infinity,
        step = Math.min(remaining, nextDoom, nextPay);
      if (phone) state.doomElapsed += step;
      if (taxi) state.taxiElapsed += step;
      remaining -= step;
      changed = true;
      // Settle fares before a simultaneous doomscroll tick. The phone was
      // equipped for the completed minute; later fares cannot use it after death.
      if (taxi && state.taxiElapsed >= 60 - 1e-8) {
        state.taxiElapsed = 0;
        const r = economy.credit(20);
        if (r.ok) earned += r.earned;
        save();
      }
      if (phone && state.doomElapsed >= 120 - 1e-8) {
        state.doomElapsed = 0;
        const hit = health.damage(5);
        damage += hit;
        onMessage(
          'Doomscrolling costs you ' +
            hit +
            ' HP. ' +
            health.state.hp +
            '/' +
            health.state.max +
            ' hitpoints.',
        );
        save();
        if (!health.state.hp) {
          losePhone('death');
          onDeath();
        }
      }
    }
    if (changed) {
      checkpoint += seconds;
      if (checkpoint >= 1) save();
    }
    return { earned, damage };
  }
  function advanceTo(milliseconds, { eligible = true } = {}) {
    if (!Number.isFinite(milliseconds)) {
      lastClock = null;
      return { earned: 0, damage: 0 };
    }
    if (eligible && lastClock !== null && milliseconds < lastClock) return { earned: 0, damage: 0 };
    const previous = lastClock;
    lastClock = eligible ? milliseconds : null;
    return update(
      eligible && previous !== null ? Math.max(0, (milliseconds - previous) / 1000) : 0,
      { eligible },
    );
  }
  return {
    state,
    buyPhone,
    equipPhone,
    losePhone,
    buyRobotaxi,
    update,
    advanceTo,
    save,
    suspend() {
      lastClock = null;
      save();
    },
  };
}
export function techMerchantDialogue(npc, game, economy) {
  const purse = economy.state;
  if (npc.kind === 'tim-apple')
    return configuredDialogue(
      purse.iphoneOwned ? 'phone-owned' : 'phone-shop',
      npc,
      {
        buy: game.buyPhone,
        toggle: () => game.equipPhone(!economy.state.iphoneEquipped),
      },
      {
        phoneStatus: purse.iphoneEquipped ? 'equipped' : 'put away',
        phoneToggle: purse.iphoneEquipped ? 'Unequip' : 'Equip',
        phoneNewStatus: purse.iphoneEquipped ? 'put away' : 'equipped',
      },
    );
  return configuredDialogue(purse.robotaxiOwned ? 'robotaxi-owned' : 'robotaxi-shop', npc, {
    buy: game.buyRobotaxi,
    status: () => ({
      ok: true,
      message:
        'Your robotaxi earns ' +
        (economy.state.iphoneEquipped ? 25 : 20) +
        ' coins per minute. Next fare in ' +
        Math.ceil(60 - game.state.taxiElapsed) +
        ' seconds. There are no offline payouts; partial minutes are saved.',
    }),
  });
}
