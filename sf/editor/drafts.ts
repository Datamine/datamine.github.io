import type { DraftChange, Drafts, EditorPath } from '../types/editor.ts';
import { isRecord } from '../types/json.ts';
export function valueAt(root: unknown, path: EditorPath): unknown {
  let value = root;
  for (const key of path)
    value =
      value !== null && typeof value === 'object' && Object.hasOwn(value, key)
        ? Reflect.get(value, key)
        : undefined;
  return value;
}
export function draftKey(root: string, path: EditorPath): string {
  return root + ':' + JSON.stringify(path);
}
export function applicableDraft(
  roots: ReadonlyMap<string, unknown>,
  change: unknown,
): change is DraftChange {
  if (
    !isRecord(change) ||
    !Array.isArray(change.path) ||
    !change.path.every((p) => typeof p === 'string' || typeof p === 'number') ||
    typeof change.record !== 'string'
  )
    return false;
  return (
    roots.has(change.record) &&
    typeof change.before === 'string' &&
    valueAt(roots.get(change.record), change.path) === change.before &&
    typeof change.after === 'string' &&
    (change.path.length !== 1 ||
      change.path[0] !== 'group' ||
      ['npc', 'object'].includes(change.after))
  );
}
export function readDraft(
  roots: ReadonlyMap<string, unknown>,
  drafts: Drafts,
  root: string,
  path: EditorPath,
): string {
  const change = drafts[draftKey(root, path)];
  if (applicableDraft(roots, change)) return change.after;
  const original = valueAt(roots.get(root), path);
  return typeof original === 'string' ? original : '';
}
export function identityDraftChanges(
  members: readonly { key: string; name: string; group: string }[],
  field: string,
  value: string,
): DraftChange[] {
  if (field === 'name') {
    if (typeof value !== 'string' || !value.trim() || value.length > 80)
      throw new Error('Enter a name between 1 and 80 characters.');
  } else if (field === 'group') {
    if (!['npc', 'object'].includes(value)) throw new Error('Choose NPC or Object.');
  } else throw new Error('Unknown identity field.');
  return members.map((r) => ({
    record: r.key,
    name: r.name,
    path: [field],
    before: r[field],
    after: value,
  }));
}
export function renamedActionLabel(label: string, originalName: string, draftName: string): string {
  return originalName && draftName !== originalName && !label.includes(draftName)
    ? label.replace(originalName, () => draftName)
    : label;
}
