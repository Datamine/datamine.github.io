import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../game.mjs';
import {createMemoryStore} from '../store.mjs';
import {fixtureGeometry,player,latestResult} from './fixtures.mjs';

async function setup(random=()=>0){let time=1000000;const geometry=fixtureGeometry();geometry.wilderness={actors:[{id:'test-bear',combatKind:'bear',x:92.7,z:120},{id:'test-giant',combatKind:'ice-giant',x:94,z:120}]};geometry.merchants=[{id:'industrial-armorer',x:92.2,z:120},{id:'in-n-out-clerk',x:92.2,z:120}];const store=createMemoryStore(),game=await createGame({geometry,store,now:()=>time,random});return {game,store,advance:ms=>time+=ms};}
async function act(game,p,action,args={},privateState){game.receive(p.p,{type:'command',request:Math.random(),action,args,privateState,inventoryEpoch:p.p.inventory.meta.epoch});await p.p.queue;return latestResult(p.messages);}
test('shared bear kill has one peptide roll, a first-claim owner and durable collection',async()=>{
    const {game,store}=await setup(),a=await player(game,701),b=await player(game,702);const bear=game.shared.wilderness.actors[0];
    assert.equal((await act(game,a,'petBear',{id:bear.id})).ok,true);assert.equal(bear.enemy,null);
    assert.equal((await act(game,a,'attack',{id:bear.id,weapon:'railgun'})).ok,true);for(let i=0;bear.hp&&i<20;i++)game.tick(.8);assert.equal(bear.hp,0);
    assert.equal(game.shared.loot.size,1);const loot=[...game.shared.loot.values()][0];assert.equal(loot.lootKind,'peptides');assert.equal((await act(game,b,'collect',{id:loot.id})).ok,false);assert.equal((await act(game,a,'collect',{id:loot.id})).ok,true);assert.equal(a.p.inventory.meta.peptides,1);assert.equal((await act(game,a,'collect',{id:loot.id})).ok,false);
    await game.flush();assert.equal((await store.get('player:'+a.p.owner)).inventory.peptides,1);await game.close();
});
test('giants are shared, retaliate, persist HP and drop equippable ice items only once',async()=>{
    const {game,store}=await setup(),a=await player(game,703),b=await player(game,704);const giant=game.shared.wilderness.actors[1];Object.assign(a.p,{x:93.8,z:120});
    assert.equal((await act(game,a,'attack',{id:giant.id,weapon:'battleaxe'})).ok,false,'unowned weapon is rejected');
    assert.equal((await act(game,a,'attack',{id:giant.id,weapon:'railgun'})).ok,true);game.tick(.8);assert.ok(a.p.hp<30);assert.ok(b.messages.some(m=>m.type==='sharedHit'&&m.target===giant.id));
    await game.flush();assert.ok((await store.get('world')).shared.wilderness.find(n=>n.id===giant.id).hp<180);
    // Finish a nearly defeated giant without allowing retaliation to kill the tester.
    giant.hp=1;a.p.shotAt=0;assert.equal((await act(game,a,'attack',{id:giant.id,weapon:'railgun'})).ok,true);const loot=[...game.shared.loot.values()].find(l=>l.lootKind==='equipment');assert.equal(loot.itemId,'ice-top');
    Object.assign(a.p,{x:loot.x,z:loot.z,y:loot.base});assert.equal((await act(game,a,'collect',{id:loot.id})).ok,true);assert.ok(a.p.inventory.economy.state.ownedEquipment.includes('ice-top'));assert.equal((await act(game,b,'attack',{id:giant.id})).ok,false);await game.close();
});
test('battleaxe is quest/proximity gated, costs 50 exactly once, and cannot be forged by checkpoints',async()=>{
    const {game}=await setup(),a=await player(game,705,{'sf-purse-v1':'{"coins":200}'});
    assert.equal((await act(game,a,'buyBattleaxe')).ok,false);const quest={'sf-quests-v1':'{"theyLive":{"completed":true,"bayonet":true}}'};
    a.p.x+=10;assert.equal((await act(game,a,'buyBattleaxe',{},quest)).ok,false);a.p.x-=10;
    assert.equal((await act(game,a,'buyBattleaxe',{},quest)).ok,true);assert.equal(a.p.inventory.economy.state.coins,150);assert.equal((await act(game,a,'buyBattleaxe')).ok,false);
    game.receive(a.p,{type:'checkpoint',privateState:{'sf-purse-v1':'{"coins":999,"ownedEquipment":["ice-top"]}'}});await a.p.queue;assert.deepEqual(a.p.inventory.economy.state.ownedEquipment,['battleaxe']);await game.close();
});
test('In-N-Out pickup gives the food ledger a sandwich for two coins, requiring the counter',async()=>{
    const {game}=await setup(),a=await player(game,706,{'sf-purse-v1':'{"coins":5}'});
    assert.equal((await act(game,a,'inventory',{op:'pickup',store:'in-n-out'})).ok,true);assert.equal(a.p.inventory.economy.state.coins,3);assert.equal(a.p.inventory.meta.sandwiches,1);
    a.p.x+=10;assert.equal((await act(game,a,'inventory',{op:'pickup',store:'in-n-out'})).ok,false);assert.equal(a.p.inventory.economy.state.coins,3);await game.close();
});
