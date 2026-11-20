import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, extname } from 'node:path';
import { renderDevelopment } from './build.mjs';
import { renderMaterialAssets } from './build-materials.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const portFlag = process.argv.indexOf('--port');
const port = portFlag < 0 ? 8742 : Number(process.argv[portFlag + 1]);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
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
    const url = new URL(req.url, 'http://localhost'),
      path = decodeURIComponent(url.pathname),
      file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
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
    if (path === '/explore.html' && !url.searchParams.has('built')) {
      res.end(renderDevelopment(await readFile(resolve(root, 'index.html'), 'utf8')));
    } else if (path === '/textures/sf-materials.svg') res.end((await renderMaterialAssets()).atlas);
    else if (path === '/textures/materials/preview.html')
      res.end((await renderMaterialAssets()).preview);
    else res.end(await readFile(file));
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end('Unable to load this preview file.');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Development: http://127.0.0.1:${port}/ (Explore SF loads source modules)`);
  console.log(`Built preview: http://127.0.0.1:${port}/explore.html?built`);
});
