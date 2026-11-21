import { transform } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, extname } from 'node:path';
import { renderDevelopment } from './build.mts';
import { renderMaterialAssets } from './build-materials.mts';
import { createEditorWriter } from './editor/writer.mts';

const root = fileURLToPath(new URL('./', import.meta.url));
const portFlag = process.argv.indexOf('--port');
const port = portFlag < 0 ? 8080 : Number(process.argv[portFlag + 1]);
const editorWriter = createEditorWriter({ root });
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.ts': 'text/javascript',
  '.mts': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
};

createServer(async (req, res) => {
  try {
    if (await editorWriter.handle(req, res)) return;
    const url = new URL(req.url || '/', 'http://localhost'),
      path = decodeURIComponent(url.pathname),
      file = resolve(root, '.' + (path === '/' || path === '/explore.html' ? '/index.html' : path));
    const local = relative(root, file);
    if (
      local.startsWith('..') ||
      local.split(/[\\/]/).some((part) => part.startsWith('.')) ||
      !types[extname(file)]
    ) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', types[extname(file)]);
    if (['/', '/index.html', '/explore.html'].includes(path) && !url.searchParams.has('built')) {
      res.end(renderDevelopment(await readFile(resolve(root, 'game.template.html'), 'utf8')));
    } else if (path === '/textures/sf-materials.svg') res.end((await renderMaterialAssets()).atlas);
    else if (path === '/textures/materials/preview.html')
      res.end((await renderMaterialAssets()).preview);
    else if (/\.(?:ts|mts)$/.test(file))
      res.end(
        (
          await transform(await readFile(file, 'utf8'), {
            loader: 'ts',
            format: 'esm',
            target: 'esnext',
            sourcefile: local,
            sourcemap: 'inline',
          })
        ).code,
      );
    else res.end(await readFile(file));
  } catch (error) {
    res.writeHead(
      error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT' ? 404 : 500,
    );
    res.end('Unable to load this preview file.');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Development: http://127.0.0.1:${port}/ (Explore SF loads source modules)`);
  console.log(`Built preview: http://127.0.0.1:${port}/?built`);
});
