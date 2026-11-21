import { valueAt } from './drafts.ts';
import { sourceValue, setSourceValue } from './project.mts';
import { validateContent } from '../content-validation.ts';
import { isRecord, errorMessage } from '../types/json.ts';
import type { ContentBundle } from '../types/content.ts';
import type { EditorCatalog, BoundRecord } from '../types/editor.ts';
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
/** Resolve UI fields to canonical ID paths using the server's own catalog. */
export function planEditorWrite(
  catalog: EditorCatalog,
  existing: ContentBundle,
  changes: unknown,
): ContentBundle {
  if (!Array.isArray(changes) || !changes.length || changes.length > 10000)
    fail('Choose between 1 and 10,000 changes to save.');
  const roots = new Map<string, BoundRecord>([
    ...catalog.records.map((r): [string, BoundRecord] => [r.key, r]),
    ...catalog.sharedDialogue.map((r): [string, BoundRecord] => ['shared:' + r.id, r]),
  ]);
  const next = structuredClone(existing),
    written = new Map<string, unknown>();
  for (const change of changes as unknown[]) {
    if (
      !isRecord(change) ||
      !Array.isArray(change.path) ||
      !change.path.every((p) => typeof p === 'string' || typeof p === 'number') ||
      typeof change.record !== 'string' ||
      typeof change.after !== 'string' ||
      change.after.length > 16000
    )
      fail('Every change must contain an editable field and text under 16,000 characters.');
    const root = roots.get(change.record),
      binding = root?.bindings[JSON.stringify(change.path)];
    if (!root || !binding) fail('Unknown editable content field.');
    if (
      change.before !== valueAt(root, change.path) ||
      JSON.stringify(sourceValue(existing, binding.file, binding.path)) !==
        JSON.stringify(binding.value)
    )
      fail('Content changed. Reload the editor before saving.', 409);
    let value: unknown = change.after;
    if (binding.kind === 'condition') {
      try {
        value = JSON.parse(change.after);
        if (value === true) value = undefined;
      } catch {
        fail('Conditions must be valid JSON.');
      }
    }
    const key = JSON.stringify([binding.file, binding.path]);
    if (written.has(key) && JSON.stringify(written.get(key)) !== JSON.stringify(value))
      fail('Two edits disagree about the same shared definition field.');
    written.set(key, value);
    setSourceValue(next, binding.file, binding.path, value);
  }
  try {
    return validateContent(next);
  } catch (error) {
    fail(errorMessage(error));
  }
}
