import type { ContentBundle } from '../types/content.ts';
interface ContentWatchOptions {
  root: string;
  onChange?: (content: ContentBundle) => void;
  onError?: (error: unknown) => void;
}
import { watchFile, unwatchFile } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { validateContent } from './validate.js';
import { installContent } from '../content-runtime.ts';
import { resolve } from 'node:path';

/** Reload only published, validated revisions; retain the last good document on errors. */
export async function watchContent({
  root,
  onChange = () => {},
  onError = console.error,
}: ContentWatchOptions) {
  const manifest = resolve(root, 'content/manifest.json');
  let active = true,
    loading = false;
  async function reload() {
    if (!active || loading) return;
    loading = true;
    try {
      const content = validateContent(
        JSON.parse(await readFile(resolve(root, 'content/runtime.json'), 'utf8')),
      );
      if (active) {
        installContent(content);
        onChange(content);
      }
    } catch (error) {
      onError(error);
    } finally {
      loading = false;
    }
  }
  await reload();
  watchFile(manifest, { interval: 1000, persistent: false }, reload);
  return () => {
    active = false;
    unwatchFile(manifest, reload);
  };
}
