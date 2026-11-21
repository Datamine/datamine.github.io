import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('the website links to the independent game without embedding game markup or styles', async () => {
  const [html, css, main] = await Promise.all(
    ['index.html', 'new.css', 'main.ts'].map((file) =>
      readFile(new URL('../' + file, import.meta.url), 'utf8'),
    ),
  );
  assert.match(html, /href="\.\/sf\/"/);
  assert.doesNotMatch(html, /id="sf-world"|id="sf-loading"|SF-ENTRY/);
  assert.doesNotMatch(css, /#sf-world|\.sf-chat|\.sf-actions/);
  assert.doesNotMatch(main, /sf-toggle|sf-loading|sfEntry/);
});
