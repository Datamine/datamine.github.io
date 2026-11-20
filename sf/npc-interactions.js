import { MERCHANTS } from './config/npcs.js';
/** Menu capability, shared by combat labels and action construction. */
export function npcOffersAttack(npc = {}) {
  if (npc.networkPlayer) return false;
  if (npc.wilderness || ['raptor', 'cow', 'kraken', 'spectre'].includes(npc.combatKind))
    return true;
  if (
    npc.neighborhoodService ||
    npc.police ||
    npc.keeper ||
    npc.parrot ||
    npc.rehabilitation ||
    npc.expeditionRole ||
    npc.questRole ||
    npc.researcher ||
    npc.child ||
    npc.baby ||
    npc.dog === true
  )
    return false;
  return (
    ![
      'yohji',
      'hiking-supplier',
      'illuminati-elder',
      'tablet-wizard',
      'banker',
      'guild-master',
      'market-farmer',
      'recruiter',
      'deli',
      'bartender',
      'burger-clerk',
      'rail-worker',
    ].includes(npc.kind) && !MERCHANTS[npc.kind]
  );
}
export function npcDisplayLabel(npc, { revealed = false, level = 1, combat = true } = {}) {
  const name = revealed ? 'Green spectre' : npc.serviceTitle || npc.label;
  if (!combat) return name;
  if (npc.networkPlayer) return name + ' - Level ' + level;
  return name + (npcOffersAttack(npc) ? ' (Level ' + level + ')' : '');
}
/** Both ordinary clicks and context-menu actions dispatch through the same
 * actor interaction handler. Keep menu eligibility independent of rendering. */
export function npcContextActions(
  npc,
  { primary = 'talk', duel = false, following = false, pvp = false } = {},
) {
  if (npc.networkPlayer)
    return [
      ...(duel ? ['duel'] : []),
      'follow',
      ...(following ? ['unfollow'] : []),
      ...(pvp ? ['attack'] : []),
      'walk',
    ];
  let actions;
  if (npc.police) actions = [];
  else if (npc.wilderness) actions = npc.combatKind === 'bear' ? ['pet', 'attack'] : ['attack'];
  else if (['raptor', 'cow', 'kraken'].includes(npc.combatKind)) actions = ['attack'];
  else if (!npcOffersAttack(npc)) actions = ['talk'];
  else actions = primary === 'attack' ? ['attack', 'talk', 'steal'] : ['talk', 'attack', 'steal'];
  return [...actions, 'examine', 'walk'];
}
export function promoteWalkAction(menu) {
  const buttons = [...menu.querySelectorAll('button')],
    walk = buttons.find((b) => /^Walk (here|to entrance)(?:$| )/.test(b.textContent));
  if (walk && buttons[0] !== walk && !/^Take /.test(buttons[0]?.textContent || ''))
    menu.insertBefore(walk, buttons[0]);
}
