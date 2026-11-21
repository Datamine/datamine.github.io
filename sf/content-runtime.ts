import type { ContentBundle, TextValues } from './types/content.ts';
import { validateContent } from './content/validate.js';
import entities from './content/entities.json' with { type: 'json' };
import dialogues from './content/dialogues.json' with { type: 'json' };
import texts from './content/texts.json' with { type: 'json' };

export const CONTENT: ContentBundle = validateContent({ entities, dialogues, texts });
const listeners = new Set<(content: ContentBundle) => void>();
export function installContent(bundle: ContentBundle) {
  for (const key of ['entities', 'dialogues', 'texts'] as const)
    Object.assign(CONTENT, { [key]: bundle[key] });
  CONTENT.revision = bundle.revision;
  for (const listener of listeners) listener(CONTENT);
  return CONTENT;
}
export function subscribeContent(listener: (content: ContentBundle) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export async function refreshContent() {
  if (typeof document === 'undefined' || !/^https?:/.test(document.baseURI)) return false;
  const manifestURL = new URL('./content/manifest.json', document.baseURI);
  const manifest = await fetch(manifestURL, { cache: 'no-store' });
  if (!manifest.ok) return false;
  const { revision } = await manifest.json();
  if (revision === CONTENT.revision) return false;
  const response = await fetch(new URL('./content/runtime.json', document.baseURI), {
    cache: 'no-store',
  });
  if (!response.ok) return false;
  const bundle = await response.json();
  if (bundle.revision !== revision) return false;
  const { validateContent } = await import('./content/validate.js');
  installContent(validateContent(bundle));
  return true;
}

export function renderContentText(template: string, values: TextValues = {}) {
  return template.replace(/\{([\w.:-]+)\}/g, (match, key) =>
    Object.hasOwn(values, key)
      ? String(typeof values[key] === 'function' ? values[key]() : values[key])
      : match,
  );
}

/** Bind runtime values to authored JSON templates; neither expressions nor callbacks come from JSON. */
export function contentText(id: string, values: TextValues = {}) {
  const source = CONTENT.texts.texts[id];
  if (!source) throw new Error('Unknown content text: ' + id);
  return renderContentText(source.template, values);
}
