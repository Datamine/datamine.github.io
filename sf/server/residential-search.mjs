import { HOUSE_SEARCHES, SEARCH_ROCKET } from '../config/search-houses.js';
import { itemLoot, equipmentOwned } from '../item-stats.js';

/** Personal claims and cosmetic cooldowns live in the authoritative profile.
 * Only authored nearby containers can issue rewards; clients submit IDs. */
export function createResidentialSearch({ geometry, now, dirty }) {
  const definitions = new Map(HOUSE_SEARCHES.map((s) => [s.id, s]));
  function search(p, id) {
    const site = geometry.searchSites?.find((s) => s.id === id),
      definition = definitions.get(id);
    if (
      !site ||
      !definition ||
      p.hp <= 0 ||
      p.respawnAllowed ||
      p.personalJailed ||
      (p.instance?.kind || 'world') !== 'world' ||
      !['walk', 'sit', 'bench'].includes(p.mode)
    )
      return { ok: false, message: 'Stand beside the container first.' };
    if (
      Math.hypot(p.x - site.x, p.z - site.z) > 2.2 ||
      Math.abs(p.y - site.base) > 1.2 ||
      geometry.placeAt?.(p.x - 0.5, p.z - 0.5)?.id !== site.houseId ||
      !geometry.canTravel(p.x - 0.5, p.z - 0.5, site.entry.x, site.entry.y, true)
    )
      return { ok: false, message: 'Stand beside the container inside the house first.' };
    const claimed = (p.profile.houseSearches ??= []);
    if (claimed.includes(id))
      return {
        ok: false,
        message: 'You have already searched this. There is nothing else inside.',
      };
    const reward = itemLoot(definition.reward.item, definition.reward.amount),
      duplicate =
        reward.lootKind === 'equipment' && equipmentOwned(p.inventory.economy.state, reward.itemId);
    const result = duplicate ? { ok: true } : p.inventory.receive(reward);
    if (!result.ok) return result;
    claimed.push(id);
    p.angle = Math.atan2(site.z - p.z, site.x - p.x);
    p.gesture = 'work';
    p.gestureUntil = now() + 1200;
    dirty(p);
    return {
      ok: true,
      inventory: p.inventory.snapshot(),
      message: duplicate
        ? 'You find ' + reward.label + '. You already own one.'
        : 'You search the ' +
          site.label.toLowerCase() +
          ' and find ' +
          (reward.lootKind === 'sandwich' ? reward.amount + ' sandwiches' : reward.label) +
          '.',
    };
  }
  function light(p) {
    if (
      p.hp <= 0 ||
      p.respawnAllowed ||
      p.personalJailed ||
      p.appearance.back !== 'new-year-rocket' ||
      !equipmentOwned(p.inventory.economy.state, 'new-year-rocket')
    )
      return { ok: false, message: 'Wear your decorative rocket first.' };
    const readyAt = p.profile.decorativeRocketReadyAt || 0;
    if (now() < readyAt)
      return {
        ok: false,
        message: 'The rocket needs ' + Math.ceil((readyAt - now()) / 1000) + ' more seconds.',
        readyAt,
      };
    p.profile.decorativeRocketReadyAt = now() + SEARCH_ROCKET.cooldownMs;
    p.profile.decorativeRocketBurnUntil = now() + SEARCH_ROCKET.burnMs;
    p.appearance.rocketBurnUntil = p.profile.decorativeRocketBurnUntil;
    p.revision++;
    dirty(p);
    hop(p);
    return {
      ok: true,
      inventory: p.inventory.snapshot(),
      readyAt: p.profile.decorativeRocketReadyAt,
      burningUntil: p.profile.decorativeRocketBurnUntil,
      message:
        'You light the rocket. It gives you a little lift! Press Space to hop again while it burns.',
    };
  }
  function expire(p) {
    if (p.profile.decorativeRocketBurnUntil && p.profile.decorativeRocketBurnUntil <= now()) {
      p.profile.decorativeRocketBurnUntil = 0;
      if (p.appearance.rocketBurnUntil) {
        p.appearance.rocketBurnUntil = 0;
        p.revision++;
      }
      dirty(p);
    }
  }
  function hop(p) {
    if (
      p.hp <= 0 ||
      p.respawnAllowed ||
      p.personalJailed ||
      p.detainAt ||
      p.airship ||
      p.grappling ||
      p.tabletTeleport ||
      (p.instance?.kind || 'world') !== 'world' ||
      !['walk', 'dance'].includes(p.mode)
    )
      return { ok: false, message: 'Find your feet on the ground before jumping.' };
    if (
      p.appearance.back !== 'new-year-rocket' ||
      !equipmentOwned(p.inventory.economy.state, 'new-year-rocket') ||
      !(p.profile.decorativeRocketBurnUntil > now())
    )
      return { ok: false, message: 'Light the rocket on your back before jumping.' };
    if (
      p.profile.decorativeRocketHopAt &&
      now() < p.profile.decorativeRocketHopAt + SEARCH_ROCKET.jumpMs
    )
      return { ok: false, message: 'Land before jumping again.' };
    p.profile.decorativeRocketHopAt = now();
    p.appearance.rocketHopAt = now();
    p.revision++;
    dirty(p);
    return {
      ok: true,
      hopStartedAt: p.profile.decorativeRocketHopAt,
      inventory: p.inventory.snapshot(),
    };
  }
  return { search, light, hop, expire };
}
