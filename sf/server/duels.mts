import { isSafeInteger } from '../types/json.ts';
import type { SimulationServices, ServerPlayer } from '../types/server.ts';
import type { DuelOffer } from '../types/finance.ts';

import { randomInt, randomUUID } from 'node:crypto';
import { DUEL_ARENA, atDuelArena } from '../duel-layout.ts';
import { DUEL_RULES } from '../config/finance.ts';
export function createDuels({
  players,
  send,
  dirty,
  now,
  flip = () => randomInt(2),
}: Pick<SimulationServices, 'players' | 'send' | 'dirty' | 'now'> & { flip?: () => number }) {
  const offers = new Map<string, DuelOffer>(),
    busy = new Map<number, string>();
  const eligible = (p: ServerPlayer | null | undefined): p is ServerPlayer =>
    !!p &&
    p.transport.open &&
    p.hp > 0 &&
    !p.personalJailed &&
    !p.bomberActive &&
    !p.attack &&
    !p.personalBattle &&
    !p.pvpTarget &&
    (p.instance?.kind || 'world') === 'world' &&
    (['walk', 'sit', 'dance'] satisfies [string, string, string]).includes(p.mode) &&
    atDuelArena(p.x, p.z) &&
    Math.abs(p.y - DUEL_ARENA.base) < 1.5;
  function release(offer: DuelOffer, message: string) {
    offers.delete(offer.id);
    for (const id of [offer.from, offer.to]) {
      busy.delete(id);
      const p = players.get(id);
      if (p) send(p, { type: 'duelClosed', id: offer.id, message });
    }
  }
  function expire() {
    for (const o of offers.values())
      if (o.expires <= now() || !eligible(players.get(o.from)) || !eligible(players.get(o.to)))
        release(o, 'The wager was cancelled. No coins changed hands.');
  }
  function command(p: ServerPlayer, action: string, args: Record<string, unknown>) {
    expire();
    if (action === 'duelOffer') {
      const to = typeof args.id === 'number' ? players.get(args.id) : undefined,
        stake = args.stake;
      if (!eligible(p) || !eligible(to) || p === to)
        return { ok: false, message: 'Both players must stand at the Duel Arena, out of combat.' };
      if (!isSafeInteger(stake) || stake < 1 || stake > DUEL_RULES.maxStake)
        return { ok: false, message: 'Choose a positive whole-coin stake.' };
      if (busy.has(p.id) || busy.has(to.id))
        return { ok: false, message: 'Finish or decline the existing offer first.' };
      if (p.inventory.economy.state.coins < stake || to.inventory.economy.state.coins < stake)
        return { ok: false, message: 'Both players need enough coins for this stake.' };
      const o = {
        id: randomUUID(),
        from: p.id,
        to: to.id,
        stake,
        expires: now() + DUEL_RULES.offerSeconds * 1000,
        fromName: p.name,
        toName: to.name,
      };
      offers.set(o.id, o);
      busy.set(p.id, o.id);
      busy.set(to.id, o.id);
      for (const person of [p, to]) send(person, { type: 'duelOffer', offer: o });
      return { ok: true, message: 'Offer sent. No coins move until your opponent accepts.' };
    }
    const o = offers.get(typeof args.offer === 'string' ? args.offer : '');
    if (!o || ![o.from, o.to].includes(p.id))
      return { ok: false, message: 'That offer has expired.' };
    if (action === 'duelDecline') {
      release(o, 'The wager was declined. No coins changed hands.');
      return { ok: true };
    }
    if (action !== 'duelAccept' || p.id !== o.to || args.stake !== o.stake)
      return { ok: false, message: 'Accept the exact stake shown in the offer.' };
    const a = players.get(o.from),
      b = players.get(o.to);
    if (
      !eligible(a) ||
      !eligible(b) ||
      a.inventory.economy.state.coins < o.stake ||
      b.inventory.economy.state.coins < o.stake
    ) {
      release(o, 'The wager is no longer valid. No coins changed hands.');
      return { ok: false, message: 'One player can no longer cover the stake.' };
    }
    const winner = flip() === 0 ? a : b,
      loser = winner === a ? b : a;
    if (!Number.isSafeInteger(winner.inventory.economy.state.coins + o.stake))
      return { ok: false, message: 'The winner’s purse could overflow.' };
    // This synchronous transfer is indivisible across both per-player queues.
    // Persist both profiles together before announcing the outcome.
    a.inventory.economy.state.coins -= o.stake;
    b.inventory.economy.state.coins -= o.stake;
    winner.inventory.economy.state.coins += o.stake * 2;
    offers.delete(o.id);
    busy.delete(a.id);
    busy.delete(b.id);
    for (const person of [a, b]) {
      person.inventory.save();
      dirty(person);
    }
    return {
      ok: true,
      settlement: {
        id: o.id,
        winner: winner.id,
        loser: loser.id,
        winnerName: winner.name,
        stake: o.stake,
      },
      participants: [a, b],
    };
  }
  return {
    command,
    tick: expire,
    remove: (p: Pick<ServerPlayer, 'id'>) => {
      const o = offers.get(busy.get(p.id) || '');
      if (o) release(o, 'A player left. No coins changed hands.');
    },
  };
}
