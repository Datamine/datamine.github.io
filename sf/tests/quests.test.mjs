import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestLog,monkeyQuestDialogue} from '../quests.js';
import {createEconomy} from '../economy.js';
import {RESEARCHERS} from '../research-dialogue.js';
import {railWorkerDialogue,RAIL_WORKER,drawRailWorks} from '../rail-works.js';
import {Mesh} from '../geometry.js';
import {RAIL_PIT,TAX_HQ} from '../southern-district.js';
import {SECOND_STREET_X} from '../airship.js';

test('Monkey Business persists each objective, requires acceptance, and rewards completion exactly once',()=>{
    const saved=[],q=createQuestLog({},state=>saved.push(state)),e=createEconomy();
    assert.equal(q.steal().ok,false);assert.equal(q.complete(e).ok,false);
    assert.equal(q.accept().ok,true);assert.equal(q.accept().ok,false);assert.equal(q.entry().status,'In progress');
    const accepted=createQuestLog(saved.at(-1));assert.equal(accepted.state.monkey,'accepted');
    assert.equal(q.steal().ok,true);assert.equal(q.carrying,true);assert.equal(q.taken,true);
    const carrying=createQuestLog(saved.at(-1));assert.equal(carrying.entry().status,'Ready to turn in');
    assert.equal(carrying.complete(e).ok,true);assert.equal(e.state.coins,50);assert.equal(carrying.carrying,false);
    assert.equal(carrying.complete(e).ok,false);assert.equal(e.state.coins,50);assert.equal(carrying.entry().status,'Complete');
    assert.equal(createQuestLog({monkey:'invalid'}).state.monkey,'not-started');
});

test('professor dialogue follows the saved quest and the worker remembers no time before lunch',()=>{
    const professor=RESEARCHERS.find(n=>n.id==='ada-meridian'),q=createQuestLog(),e=createEconomy();
    let d=monkeyQuestDialogue(professor,q,e);assert.equal(d.choice,'Accept quest');assert.ok(d.accept().ok);
    d=monkeyQuestDialogue(professor,q,e);assert.match(d.intro,/south of the deer/);q.steal();
    d=monkeyQuestDialogue(professor,q,e);assert.match(d.choice,/Hand over/);assert.ok(d.accept().ok);
    assert.match(monkeyQuestDialogue(professor,q,e).intro,/paper titled/);
    const lunch=railWorkerDialogue();assert.equal(lunch.repeat,true);assert.match(lunch.choices[0].label,/How long/);
    assert.ok(lunch.choices[0].next.choices.length>=3);assert.match(lunch.choices[0].next.choices.map(c=>c.receipt).join(' '),/time before lunch/);
});

test('the tax office moves a block west, with a compact fenced pit, excavator, and safe lunch spot',()=>{
    assert.equal(TAX_HQ.x,SECOND_STREET_X-10);assert.ok((RAIL_PIT.east-RAIL_PIT.west)*(RAIL_PIT.south-RAIL_PIT.north)<20);
    assert.ok(RAIL_WORKER.x>RAIL_PIT.east);const m=new Mesh();drawRailWorks(m,()=>1.15);
    assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<2500);
});
