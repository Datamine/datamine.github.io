import { isFiniteNumber, isRecord } from './types/json.ts';
import type { Health, Economy } from './types/controllers.ts';

import { configuredDialogue } from './dialogue-config.ts';
import type { Actor } from './types/world.ts';
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
  saved: savedInput = {},
  onSave = () => {},
  onMessage = () => {},
  onDeath = () => {},
  dropPhoneOnDeath = true,
}: {
  economy: Economy;
  health: Pick<Health, 'damage' | 'state'>;
  saved?: unknown;
  onSave?: (state: { doomElapsed: number; taxiElapsed: number }) => void;
  onMessage?: (message: string) => void;
  onDeath?: () => void;
  dropPhoneOnDeath?: boolean;
}) {
  const saved = isRecord(savedInput) ? savedInput : {};
  const elapsed = (value: unknown, limit: number) =>
    isFiniteNumber(value) && value >= 0 ? Math.min(limit - 0.000001, value) : 0;
  const state = {
    doomElapsed: economy.state.iphoneOwned ? elapsed(saved.doomElapsed, 120) : 0,
    taxiElapsed: economy.state.robotaxiOwned ? elapsed(saved.taxiElapsed, 60) : 0,
  };
  let checkpoint = 0,
    lastClock: number | null = null;
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
        ? 'Tim Apple hands you an equipped iPhone. You can put it away in Character settings.'
        : r.message,
    };
  }
  function equipPhone(on: boolean) {
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
      message: r.ok ? 'Your robotaxi is dispatched.' : r.message,
    };
  }
  function update(seconds: unknown, { eligible = true }: { eligible?: boolean } = {}) {
    if (!eligible || !isFiniteNumber(seconds) || seconds <= 0) return { earned: 0, damage: 0 };
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
        if (r.ok) earned += r.earned ?? 0;
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
          if (dropPhoneOnDeath) losePhone('death');
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
  function advanceTo(milliseconds: unknown, { eligible = true } = {}) {
    if (!isFiniteNumber(milliseconds)) {
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
export function techMerchantDialogue(
  npc: Partial<Actor>,
  game: {
    buyPhone: () => import('./types/world.ts').ActionReceipt;
    equipPhone: (on: boolean) => import('./types/world.ts').ActionReceipt;
    buyRobotaxi: () => import('./types/world.ts').ActionReceipt;
  },
  economy: Economy,
) {
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
      message: 'Your robotaxi is out finding fares.',
    }),
  });
}
