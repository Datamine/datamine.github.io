import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import {renderExplore,renderDevelopment} from '../build.mjs';

const pageURL=new URL('../../index.html',import.meta.url);

test('the built experience is a standalone classic script with embedded graphics',async()=>{
    const source=await readFile(pageURL,'utf8'),html=await renderExplore(source);
    assert.ok(html.includes('data-sf-entry="explore"'));
    assert.doesNotMatch(html,/<script[^>]*type="module"/);
    assert.doesNotMatch(html,/import\.meta/);
    assert.ok(html.includes("data:image/svg+xml;charset=utf-8,"));
    const runtime=html.match(/<script>\s*('use strict';[\s\S]*?)<\/script>/)?.[1];
    assert.ok(runtime,'missing standalone runtime');
    assert.doesNotThrow(()=>new Script(runtime));
    assert.doesNotMatch(html,/sf-atlas|openCityMap|navigateFromMap|Press C to open/,'the larger map must not be present or reachable');
    assert.ok(html.includes('id="sf-icon-legend"'));
    assert.ok(html.includes('id="sf-place-markers"'));
    for(const link of source.matchAll(/<a\b[^>]*href=["'][^"']+["'][^>]*>/g))assert.ok(html.includes(link[0]),`lost homepage link: ${link[0]}`);
});

test('the development view loads the source modules without changing the homepage',async()=>{
    const source=await readFile(pageURL,'utf8'),html=renderDevelopment(source);
    assert.ok(html.includes('data-sf-entry="explore"'));
    assert.ok(html.includes('<script type="module" src="./sf/world.js"></script>'));
    assert.ok(source.includes("new URL('./explore.html',window.location.href)"));
    assert.ok(!source.includes('data-sf-entry="explore"'));
});

test('the checked-in experience has been rebuilt from the current sources',async()=>{
    const source=await readFile(pageURL,'utf8'),built=await readFile(new URL('../../explore.html',import.meta.url),'utf8');
    assert.equal(built,await renderExplore(source),'Run node sf/build.mjs after editing the homepage, world sources or graphics.');
});
