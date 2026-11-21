import type { ActorMetadata } from './types/world.ts';
import { MERCHANTS } from './config/npcs.ts';
import { applyEntityEdits } from './world-edits.ts';
/** Menu capability, shared by combat labels and action construction. */
export function npcOffersAttack(npc: ActorMetadata = {}) {
  if (npc.networkPlayer) return false;
  if (
    npc.wilderness ||
    (['raptor', 'cow', 'kraken', 'spectre'] satisfies [string, string, string, string]).includes(
      npc.combatKind || '',
    )
  )
    return true;
  if (
    npc.dogSurfJudge ||
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
    !(
      [
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
      ] satisfies [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    ).includes(npc.kind || '') && !MERCHANTS[npc.kind || '']
  );
}
export function npcDisplayLabel(
  npc: ActorMetadata,
  { revealed = false, level = 1, combat = true } = {},
) {
  applyEntityEdits(npc, npc.editorKey || 'actor:' + npc.id);
  const name = revealed ? 'Alien' : npc.serviceTitle || npc.label || 'Person';
  if (!combat) return name;
  if (npc.networkPlayer) return name + ' - Level ' + level;
  return name + (npcOffersAttack(npc) ? ' (Level ' + level + ')' : '');
}
/** Both ordinary clicks and context-menu actions dispatch through the same
 * actor interaction handler. Keep menu eligibility independent of rendering. */
export function npcContextActions(
  npc: ActorMetadata = {},
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
  let actions: string[];
  if (npc.police) actions = [];
  else if (npc.wilderness)
    actions =
      npc.combatKind === 'bear' ? (['pet', 'attack'] satisfies [string, string]) : ['attack'];
  else if (
    (['raptor', 'cow', 'kraken'] satisfies [string, string, string]).includes(npc.combatKind || '')
  )
    actions = ['attack'];
  else if (!npcOffersAttack(npc)) actions = ['talk'];
  else
    actions =
      primary === 'attack'
        ? (['attack', 'talk', 'steal'] satisfies [string, string, string])
        : (['talk', 'attack', 'steal'] satisfies [string, string, string]);
  return [...actions, 'walk', 'examine'];
}
export function promoteWalkAction(menu: HTMLDivElement) {
  const buttons = [...menu.querySelectorAll<HTMLElementTagNameMap['button']>('button')],
    walk = buttons.find((b) => /^Walk (here|to entrance)(?:$| )/.test(b.textContent || ''));
  if (walk && buttons[0] !== walk && !/^Take /.test(buttons[0]?.textContent || ''))
    menu.insertBefore(walk, buttons[0]);
}
