/** Mobile actors use NPC colors even when their interactions are represented
 * as sights. Animated scenery and collectable items retain their own colors. */
const mobileActionKinds = new Set([
  'waymo',
  'robotaxi',
  'bus',
  'canoe',
  'wildlife',
  'whale',
  'ducks',
  'bunny',
  'skate-dog',
  'bike',
  'motorcycle',
  'ferrari',
  'pequod',
  'stealth-bomber',
]);
export function actionTargetKind(target = {}) {
  if (['loot', 'sunglasses', 'sand'].includes(target.kind)) return 'item';
  return target.mobile || mobileActionKinds.has(target.kind) ? 'npc' : 'object';
}

/** Style action and target independently, using text nodes rather than HTML. */
export function setActionText(element, text, targets = []) {
  element.replaceChildren();
  const target = targets
    .filter((t) => t?.label && text.includes(t.label))
    .sort((a, b) => b.label.length - a.label.length)[0];
  const span = (value, className) => {
    const part = document.createElement('span');
    part.className = className;
    part.textContent = value;
    element.append(part);
    return part;
  };
  if (!target) {
    span(text, 'sf-action-verb');
    return;
  }
  const at = text.indexOf(target.label);
  if (at) span(text.slice(0, at), 'sf-action-verb');
  const level =
    target.kind === 'npc' ? target.label.match(/(?: \(Level \d+\)| - Level \d+)$/) : null;
  const name = span(
    level ? target.label.slice(0, -level[0].length) : target.label,
    'sf-action-target',
  );
  name.dataset.kind = target.kind;
  if (level) span(level[0], 'sf-action-verb sf-action-level');
  if (at + target.label.length < text.length)
    span(text.slice(at + target.label.length), 'sf-action-verb');
}
