import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,fixtureGeometry,player,latestResult} from './fixtures.mjs';
import {createGame} from '../game.mjs';
import {createMemoryStore} from '../store.mjs';
import {decodePlayerFrame} from '../../multiplayer-protocol.js';

async function act(game,p,action,args={},epoch=p.inventory.meta.epoch){game.receive(p,{type:'command',request:Math.random(),action,args,inventoryEpoch:epoch});await p.queue;return p.transport.messages?.at(-1);}
const gear={'sf-expeditions-v1':'{"railgun":true,"equipped":true}'};
async function enable(game,...people){for(const person of people)await act(game,person.p,'pvp',{enabled:true});}
async function finishKill(game,advance,attacker,victim){await act(game,attacker.p,'pvpAttack',{id:victim.p.id});for(let i=0;i<15&&victim.p.hp>0;i++){advance(850);game.tick(.05);}await victim.p.deathTask;}

test('both players must opt in and disabling has a persisted 30-second cooldown',async()=>{
    const {game,store,advance}=await fixture(),a=await player(game,201,gear),b=await player(game,202);
    await act(game,a.p,'pvpAttack',{id:b.p.id});assert.equal(latestResult(a.messages).ok,false);
    await enable(game,a);await act(game,a.p,'pvpAttack',{id:b.p.id});assert.equal(latestResult(a.messages).ok,false);
    await enable(game,b);await act(game,a.p,'pvp',{enabled:false});assert.equal(latestResult(a.messages).ok,false);
    const saved=await store.get('player:'+a.p.owner);assert.equal(saved.pvp.enabled,true);assert.equal(saved.pvp.disableAt,1060000-30000);
    advance(29999);await act(game,a.p,'pvp',{enabled:false});assert.equal(latestResult(a.messages).ok,false);
    advance(1);await act(game,a.p,'pvp',{enabled:false});assert.equal(latestResult(a.messages).ok,true);assert.equal(game.pvp.status(a.p).enabled,false);await game.close();
});
test('PvP rolls damage on server time, enforces range/line of sight and publishes true strength levels',async()=>{
    const {game,advance}=await fixture(),a=await player(game,203,{'sf-strength-v1':'{"xp":12000}',...gear}),b=await player(game,204);await enable(game,a,b);
    a.p.x=b.p.x+8;await act(game,a.p,'pvpAttack',{id:b.p.id});assert.equal(latestResult(a.messages).ok,false);
    a.p.x=b.p.x+4;await act(game,a.p,'pvpAttack',{id:b.p.id});assert.equal(latestResult(a.messages).ok,true);game.tick(.05);assert.ok(b.p.hp<30);const after=b.p.hp;game.tick(.05);assert.equal(b.p.hp,after,'render/tick frequency cannot bypass attack cooldown');
    advance(800);game.tick(.05);assert.ok(b.p.hp<after);game.broadcast();const frame=decodePlayerFrame(b.messages.filter(m=>m instanceof ArrayBuffer).at(-1));const remote=frame.players.find(p=>p.id===a.p.id);assert.equal(remote.level,10);assert.equal(remote.pvp,true);await game.close();
    const geometry=fixtureGeometry();geometry.lineClear=()=>false;const blocked=await createGame({geometry,store:createMemoryStore()}),x=await player(blocked,205,gear),y=await player(blocked,206);await enable(blocked,x,y);await act(blocked,x.p,'pvpAttack',{id:y.p.id});assert.equal(latestResult(x.messages).ok,false);assert.equal(y.p.hp,30);await blocked.close();
});
test('a PvP death drops every specified item exactly once and stale saves cannot restore them',async()=>{
    const {game,store,advance}=await fixture(),a=await player(game,207,gear),b=await player(game,208,{
        'sf-purse-v1':'{"coins":431,"iphoneOwned":true,"iphoneEquipped":true,"ownedHats":["paper","crown"],"equity":2}',
        'sf-deli-v1':'{"sandwiches":7,"pending":false}','sf-character-v1':'{"hat":"crown","shirt":"#707b4b"}'
    });await enable(game,a,b);await finishKill(game,advance,a,b);
    assert.equal(b.p.hp,0);const items=[...game.shared.loot.values()];assert.equal(items.length,5);
    assert.equal(items.find(i=>i.lootKind==='coins').amount,431);assert.equal(items.find(i=>i.lootKind==='sandwich').amount,7);assert.ok(items.some(i=>i.lootKind==='iphone'));assert.deepEqual(items.filter(i=>i.lootKind==='hat').map(i=>i.hatId).sort(),['crown','paper']);
    assert.equal(b.p.inventory.economy.state.coins,0);assert.equal(b.p.inventory.meta.sandwiches,0);assert.equal(b.p.inventory.economy.state.iphoneOwned,false);assert.deepEqual(b.p.inventory.economy.state.ownedHats,[]);assert.equal(b.p.inventory.economy.state.equity,2);
    game.receive(b.p,{type:'checkpoint',inventoryEpoch:0,privateState:{'sf-purse-v1':'{"coins":999,"iphoneOwned":true,"ownedHats":["crown"]}','sf-deli-v1':'{"sandwiches":999}'}});await b.p.queue;
    assert.equal(b.p.inventory.economy.state.coins,0);assert.equal(JSON.parse(b.p.profile.privateState['sf-purse-v1']).coins,0);
    await act(game,b.p,'inventory',{op:'credit',amount:1000},0);assert.equal(latestResult(b.messages).ok,false);assert.equal(b.p.inventory.economy.state.coins,0);
    const persisted=await store.get('player:'+b.p.owner);assert.equal(JSON.parse(persisted.privateState['sf-purse-v1']).coins,0);assert.equal((await store.get('world')).shared.loot.filter(i=>i.transfer).length,5);
    game.tick(.05);assert.equal(game.shared.loot.size,5);await game.close();
});
test('PvP loot transfers do not multiply coins through the iPhone earnings boost and survive collector retries',async()=>{
    const {game,advance}=await fixture(),a=await player(game,209,{'sf-purse-v1':'{"coins":25,"iphoneOwned":true,"iphoneEquipped":true}',...gear}),b=await player(game,210,{'sf-purse-v1':'{"coins":100,"ownedHats":["paper"]}','sf-deli-v1':'{"sandwiches":3}'});await enable(game,a,b);await finishKill(game,advance,a,b);
    const coins=[...game.shared.loot.values()].find(i=>i.lootKind==='coins');await act(game,a.p,'collect',{id:coins.id});assert.equal(latestResult(a.messages).ok,true);assert.equal(a.p.inventory.economy.state.coins,125,'all 100 coins transfer without minting a 25% bonus');
    await act(game,a.p,'collect',{id:coins.id});assert.equal(latestResult(a.messages).ok,false);assert.equal(a.p.inventory.economy.state.coins,125);
    const hat=[...game.shared.loot.values()].find(i=>i.lootKind==='hat');await act(game,a.p,'collect',{id:hat.id});assert.ok(a.p.inventory.economy.state.ownedHats.includes('paper'));
    await act(game,b.p,'respawn');assert.equal(b.p.hp,30);assert.equal(b.p.inventory.economy.state.coins,0);await game.close();
});
test('inventory operations settle in order and pending client balances cannot overrule death epochs',async()=>{
    const {game}=await fixture(),a=await player(game,211,{'sf-purse-v1':'{"coins":200}'});
    await act(game,a.p,'inventory',{op:'buyHat',id:'beanie'});assert.equal(a.p.inventory.economy.state.coins,190);assert.ok(a.p.inventory.economy.state.ownedHats.includes('beanie'));
    await act(game,a.p,'inventory',{op:'pickup'});assert.equal(a.p.inventory.economy.state.coins,187);assert.equal(a.p.inventory.meta.sandwiches,1);
    a.p.hp=10;await act(game,a.p,'inventory',{op:'eat',hpBefore:10});assert.equal(a.p.hp,28);assert.equal(a.p.inventory.meta.sandwiches,0);
    await act(game,a.p,'inventory',{op:'buyPhone'});assert.equal(a.p.inventory.economy.state.coins,87);assert.equal(a.p.inventory.economy.state.iphoneOwned,true);await game.close();
});

test('a non-player death with PvP enabled does not drop the PvP inventory',async()=>{
    const {game}=await fixture(),a=await player(game,212,{'sf-purse-v1':'{"coins":80,"iphoneOwned":true,"ownedHats":["paper"]}','sf-deli-v1':'{"sandwiches":2}'});
    await enable(game,a);
    // A personal animal/spectre controller reports zero HP through the normal
    // pose stream, then requests the same hospital respawn as before PvP.
    game.receive(a.p,{type:'pose',pose:{x:a.p.x,y:a.p.y,z:a.p.z,angle:0,phase:0,motion:0,moving:false,mode:'walk',hp:0}});
    assert.equal(a.p.hp,0);await act(game,a.p,'respawn');assert.equal(a.p.hp,30);
    assert.equal(a.p.inventory.economy.state.coins,80);assert.equal(a.p.inventory.meta.sandwiches,2);
    assert.deepEqual(a.p.inventory.economy.state.ownedHats,['paper']);assert.equal(a.p.inventory.meta.epoch,0);
    assert.equal(game.shared.loot.size,0);await game.close();
});
