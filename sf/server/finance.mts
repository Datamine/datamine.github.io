import type { SimulationServices, ServerPlayer } from '../types/server.ts';
import { createGrowthEquity } from '../growth-equity.ts';

export function createServerFinance({
  geometry,
  players,
  send,
  dirty,
  now,
  random,
}: Pick<SimulationServices, 'geometry' | 'players' | 'send' | 'dirty' | 'now' | 'random'>) {
  const accounts = new Map<number, ReturnType<typeof createGrowthEquity>>();
  function account(p: ServerPlayer) {
    let a = accounts.get(p.id);
    if (!a) {
      a = createGrowthEquity({
        saved: p.profile.growth,
        economy: p.inventory.economy,
        now,
        random,
        onSave: (value) => {
          p.profile.growth = value;
          p.inventory.save();
          dirty(p);
        },
        onClose: (r) => send(p, { type: 'notice', message: r.message }),
      });
      accounts.set(p.id, a);
    }
    return a;
  }
  function publish(p: ServerPlayer) {
    const value = account(p).snapshot(),
      signature = JSON.stringify(value);
    if (signature !== p.financeSignature) {
      p.financeSignature = signature;
      send(p, { type: 'finance', position: value });
    }
    return value;
  }
  function command(p: ServerPlayer, action: string, args: { amount?: unknown }) {
    const kind = action === 'growthBuy' ? 'capital' : 'stockbroker',
      npc = geometry.merchants?.find((n) => n.kind === kind);
    if (
      p.hp <= 0 ||
      p.personalJailed ||
      p.bomberActive ||
      (p.instance?.kind || 'world') !== 'world' ||
      !npc ||
      Math.hypot(p.x - npc.x, p.z - npc.z) > 2.6 ||
      Math.abs(p.y - Number(npc.base)) > 2.5
    )
      return {
        ok: false,
        message:
          'Visit ' +
          (kind === 'capital'
            ? 'Sand Hill Road Capital Partners.'
            : 'the Times Square stockbroker.'),
      };
    const a = account(p),
      r =
        action === 'growthBuy'
          ? a.buy(args.amount)
          : action === 'growthList'
            ? a.list()
            : action === 'growthSell'
              ? a.sell()
              : { ok: false, message: 'Unknown market action.' };
    publish(p);
    return { ...r, position: a.snapshot(), inventory: p.inventory.snapshot() };
  }
  let next = 0;
  return {
    account,
    command,
    publish,
    remove: (p: Pick<ServerPlayer, 'id'>) => accounts.delete(p.id),
    tick() {
      if (now() < next) return;
      next = now() + 1000;
      for (const p of players.values())
        if (p.profile.growth || accounts.has(p.id)) {
          account(p).update();
          publish(p);
        }
    },
  };
}
