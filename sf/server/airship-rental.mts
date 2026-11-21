import { isSafeInteger } from '../types/json.ts';
import type { SimulationServices, ServerPlayer } from '../types/server.ts';
import type { AirshipLease } from '../types/shared-world.ts';

import { AIRSHIP_RULES } from '../config/airship.ts';
import { AIRSHIP_TERMINAL } from '../airship.ts';

/** One shared rental, a persisted hourly timetable and a short owner-bound
 * priority claim. Purchases and ownership changes are synchronous; storage is
 * awaited by the command dispatcher before it issues the payment receipt. */
export function createAirshipRental({
  geometry,
  players,
  airship,
  captain,
  reset,
  now,
  dirty,
  saved = {},
}: Pick<SimulationServices, 'geometry' | 'players' | 'now' | 'dirty'> & {
  airship: ReturnType<typeof import('../airship.ts').createAirship>;
  captain: () => number | null;
  reset: (reason: string, requester?: ServerPlayer) => void;
  saved?: Partial<AirshipLease>;
}) {
  let resetAt =
    isSafeInteger(saved.resetAt) && saved.resetAt! > 0
      ? saved.resetAt!
      : now() + AIRSHIP_RULES.resetIntervalMs;
  let reservation =
    saved.reservation &&
    typeof saved.reservation.owner === 'string' &&
    Number.isSafeInteger(saved.reservation.until)
      ? { ...saved.reservation }
      : null;
  // Older saves recorded only the reservation for a flat 25-coin recall.
  let lastPrice =
    isSafeInteger(saved.lastPrice) && saved.lastPrice! >= 0
      ? saved.lastPrice!
      : reservation
        ? 25
        : 0;
  const nextPrice = () =>
    lastPrice ? lastPrice + AIRSHIP_RULES.bidIncrement : AIRSHIP_RULES.initialPrice;

  function tick() {
    const time = now();
    if (time >= resetAt) {
      resetAt +=
        Math.floor((time - resetAt) / AIRSHIP_RULES.resetIntervalMs + 1) *
        AIRSHIP_RULES.resetIntervalMs;
      reservation = null;
      lastPrice = 0;
      reset('hourly');
    }
    if (reservation && time >= reservation.until) reservation = null;
  }
  function publicStatus() {
    const holder = reservation && reservation.until > now() ? reservation : null;
    const owner = holder ? [...players.values()].find((p) => p.owner === holder.owner) : null;
    return {
      resetAt,
      lastPrice,
      rentalPrice: nextPrice(),
      recallPrice: nextPrice(),
      reservedFor: owner?.id ?? null,
      reservedName: holder?.name || null,
      reservedUntil: holder?.until || 0,
    };
  }
  function status(p: ServerPlayer) {
    const hold = reservation && reservation.until > now() ? reservation : null;
    return {
      ...publicStatus(),
      active: airship.state.active,
      pilot: players.get(captain() ?? -1)?.name || null,
      reservedForYou: !!hold && hold.owner === p.owner,
      canRecall: (airship.state.active || !!hold) && captain() !== p.id && hold?.owner !== p.owner,
      serverTime: now(),
    };
  }
  function nearAgent(p: ServerPlayer) {
    const npc = geometry.merchants?.find((n) => n.id === 'airship-rental-attendant'),
      x = npc?.x ?? AIRSHIP_TERMINAL.entry.x + 0.5,
      z = npc?.z ?? AIRSHIP_TERMINAL.entry.y + 0.5;
    return (
      p.hp > 0 &&
      !p.respawnAllowed &&
      !p.detainAt &&
      !p.personalJailed &&
      !p.bomberActive &&
      !p.airship &&
      !p.grappling &&
      !p.parachute &&
      !p.tabletTeleport &&
      !(
        ['hidden', 'rocket', 'climb', 'surf', 'bomber', 'teleport'] satisfies [
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      ).includes(p.mode) &&
      (p.instance?.kind || 'world') === 'world' &&
      Math.hypot(p.x - x, p.z - z) <= 2.6 &&
      Math.abs(p.y - (npc?.base ?? AIRSHIP_TERMINAL.base)) < 2.5
    );
  }
  function purchase(p: ServerPlayer, price: unknown) {
    const cost = nextPrice();
    if (!Number.isSafeInteger(cost) || cost <= 0)
      return { ok: false, message: 'Please wait for the hourly airship price reset.' };
    if (price !== cost)
      return {
        ok: false,
        message:
          'The airship price has changed. The next rental costs ' +
          cost +
          ' coins. Ask the attendant for a new quote.',
        airship: status(p),
      };
    const purse = p.inventory.economy.state;
    if (!Number.isSafeInteger(purse.coins) || purse.coins < cost)
      return {
        ok: false,
        message: 'This rental costs ' + cost + ' coins. You do not have enough in your purse.',
        airship: status(p),
      };
    purse.coins -= cost;
    lastPrice = cost;
    p.inventory.save();
    dirty(p);
    return { ok: true, paid: cost, inventory: p.inventory.snapshot() };
  }
  function command(p: ServerPlayer, action: string, args: Record<string, unknown> = {}) {
    tick();
    if (!nearAgent(p))
      return { ok: false, message: 'Speak to the airship attendant at the private jet terminal.' };
    if (action === 'airshipStatus') return { ok: true, airship: status(p) };
    if (action !== 'airshipRecall') return { ok: false, message: 'Unknown airship rental action.' };
    if (!airship.state.active && !reservation)
      return {
        ok: false,
        message: 'The airship is at the terminal. The next rental costs ' + nextPrice() + ' coins.',
        airship: status(p),
      };
    if (captain() === p.id) return { ok: false, message: 'You are already directing the airship.' };
    if (reservation?.owner === p.owner)
      return {
        ok: false,
        message: 'You have already paid for the reserved rental. Walk to the basket to board.',
        airship: status(p),
      };
    const payment = purchase(p, args.price);
    if (!payment.ok) return payment;
    reservation = { owner: p.owner, name: p.name, until: now() + AIRSHIP_RULES.reservationMs };
    reset('paid', p);
    return {
      ...payment,
      airship: status(p),
      message:
        'You pay ' +
        payment.paid +
        ' coins. The airship and its passengers have returned safely. You have ' +
        Math.round(AIRSHIP_RULES.reservationMs / 1000) +
        ' seconds to board at no additional cost, unless someone outbids you for ' +
        nextPrice() +
        ' coins. Click OK to walk to the basket.',
    };
  }
  function mayBoard(p: ServerPlayer) {
    tick();
    if (reservation && reservation.owner !== p.owner)
      return {
        ok: false,
        message:
          'The airship is reserved for ' +
          reservation.name +
          '. Pay ' +
          nextPrice() +
          ' coins at the attendant to outbid them.',
        airship: status(p),
      };
    return { ok: true };
  }
  function boarded(p: ServerPlayer) {
    if (reservation?.owner === p.owner) reservation = null;
  }
  function rent(p: ServerPlayer, price: unknown) {
    const permission = mayBoard(p);
    if (!permission.ok) return permission;
    return airship.state.active || reservation?.owner === p.owner
      ? { ok: true }
      : purchase(p, price);
  }
  return {
    tick,
    command,
    publicStatus,
    mayBoard,
    boarded,
    rent,
    persist: () => ({ resetAt, lastPrice, reservation: reservation ? { ...reservation } : null }),
  };
}
