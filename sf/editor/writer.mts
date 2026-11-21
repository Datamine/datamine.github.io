import type { ContentBundle } from '../types/content.ts';
import type { EditorSaveJob, WriterStatus } from '../types/editor.ts';
import { errorMessage, isRecord } from '../types/json.ts';
import { format, resolveConfig } from 'prettier';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { buildEditor } from '../build-editor.mts';
import { readContent, atomicWrite, contentFiles } from '../content/build.mts';
import { projectCatalog } from './project.mts';
import { planEditorWrite } from './write-plan.mts';
interface EditorRequest extends AsyncIterable<string | Uint8Array> {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}
interface EditorResponse {
  writeHead(status: number, headers: Record<string, string>): unknown;
  end(body?: string): unknown;
}

export function createEditorWriter({
  root,
  rebuild = (bundle) => buildEditor({ bundle, outputRoot: root }),
}: {
  root: string;
  rebuild?: (bundle: ContentBundle) => Promise<unknown>;
}) {
  const token = randomBytes(24).toString('hex');
  let busy = false,
    job: EditorSaveJob | null = null;
  const json = (res: EditorResponse, status: number, body: unknown) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify(body));
  };
  const status = (): WriterStatus => ({
    available: true,
    token,
    busy,
    file: 'content/*.json',
    job,
  });
  async function body(req: EditorRequest): Promise<Record<string, unknown>> {
    const parts: Buffer[] = [];
    let size = 0;
    for await (const part of req) {
      size += Buffer.byteLength(part);
      if (size > 2 * 1024 * 1024)
        throw Object.assign(new Error('Save request exceeds 2 MiB.'), { status: 413 });
      parts.push(Buffer.from(part));
    }
    try {
      const value: unknown = JSON.parse(Buffer.concat(parts).toString());
      if (!isRecord(value)) throw new Error('Invalid save request JSON.');
      return value;
    } catch {
      throw Object.assign(new Error('Invalid save request JSON.'), { status: 400 });
    }
  }
  async function handle(req: EditorRequest, res: EditorResponse) {
    const path = new URL(req.url || '/', 'http://localhost').pathname;
    if (!path.startsWith('/__editor/')) return false;
    if (path === '/__editor/status' && req.method === 'GET') {
      if (job?.phase === 'done') {
        const meta = JSON.parse(await readFile(resolve(root, 'editor/build-meta.json'), 'utf8'));
        if (meta.fingerprint !== job.catalogFingerprint) job = null;
      }
      json(res, 200, status());
      return true;
    }
    if (path !== '/__editor/save' || req.method !== 'POST') {
      json(res, 404, { error: 'Unknown editor operation.' });
      return true;
    }
    if (req.headers['x-editor-token'] !== token) {
      json(res, 403, { error: 'Reload the editor to connect to this local server.' });
      return true;
    }
    if (busy) {
      json(res, 423, { error: 'A save is already in progress.' });
      return true;
    }
    busy = true;
    try {
      const request = await body(req),
        existing = await readContent(root);
      if (request.catalogFingerprint !== existing.revision)
        throw Object.assign(new Error('Content changed. Reload the editor before saving.'), {
          status: 409,
        });
      const next = planEditorWrite(projectCatalog(existing), existing, request.changes);
      const files = [
        ...contentFiles.map((key) => 'content/' + key + '.json'),
        'content/runtime.json',
        'content/manifest.json',
        'editor.html',
        'editor/build-meta.json',
      ];
      const backups = await Promise.all(
        files.map(
          async (file) =>
            [
              file,
              await readFile(resolve(root, file), 'utf8').catch((e) =>
                e.code === 'ENOENT' ? null : Promise.reject(e),
              ),
            ] as const,
        ),
      );
      try {
        for (const key of contentFiles)
          if (JSON.stringify(existing[key]) !== JSON.stringify(next[key]))
            await atomicWrite(
              resolve(root, 'content/' + key + '.json'),
              await format(JSON.stringify(next[key], null, 2), {
                ...(await resolveConfig(resolve(root, 'content/' + key + '.json'))),
                parser: 'json',
              }),
            );
        await rebuild(next);
      } catch (error) {
        for (const [file, value] of backups)
          if (value !== null) await atomicWrite(resolve(root, file), value);
          else await rm(resolve(root, file), { force: true });
        throw error;
      }
      const current = await readContent(root);
      job = {
        id: randomBytes(12).toString('hex'),
        phase: 'done',
        saved: true,
        changes: request.changes as EditorSaveJob['changes'],
        catalogFingerprint: current.revision,
        message: 'Saved to sf/content JSON. The game loads the updated content automatically.',
      };
      busy = false;
      json(res, 200, status());
    } catch (error) {
      busy = false;
      json(res, isRecord(error) && typeof error.status === 'number' ? error.status : 500, {
        error: errorMessage(error),
      });
    }
    return true;
  }
  return { handle, status, done: () => Promise.resolve() };
}
