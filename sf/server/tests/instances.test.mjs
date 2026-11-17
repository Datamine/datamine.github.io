import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../game.mjs';
import {createMemoryStore} from '../store.mjs';
import {fixtureGeometry,player,latestResult} from './fixtures.mjs';
import {ILLUMINATI_CAVE,CAVE_NAVIGATION,guildSecretSites} from '../../map-instances.js';
import {BOMB_COOLDOWN_MS,BOMB_FALL_MS,bombTileArea,cowInBombArea} from '../../stealth-bomber.js';

async function fixture(){let time=1000000;const geometry=fixtureGeometry(),store=createMemoryStore();
    geometry.places=[{id:'freemasons-guild',x:90,y:118,w:4.4,d:3.8}];geometry.expeditions={ship:{home:{x:87,z:120}}};
    geometry.merchants=[{id:'captain-ahab',label:'Captain Ahab',x:92.2,z:120,base:1.15},{id:'test-spectre',label:'Man',alienId:'test',x:35.5,z:175.5,base:1.15,hp:36}];
    const game=await createGame({geometry,store,now:()=>time,random:()=>.5});return {game,geometry,store,advance:ms=>time+=ms,now:()=>time};
}
async function act(game,person,action,args={}){game.receive(person.p,{type:'command',request:Math.random(),action,args,inventoryEpoch:person.p.inventory.meta.epoch});await person.p.queue;return latestResult(person.messages);}
async function member(game,id,coins=250100){const a=await player(game,id,{'sf-purse-v1':JSON.stringify({coins}),'sf-expeditions-v1':'{"railgun":true,"equipped":true}'});a.p.profile.guild={version:2,visits:24,member:true,lastVisitAt:1};return a;}
async function initiate(game,a){assert.equal((await act(game,a,'joinIlluminati')).ok,true);assert.equal((await act(game,a,'instanceEnter',{kind:'illuminati'})).ok,true);}

test('the Old Man charges exactly 250,000 coins once and requires physical guild membership',async()=>{
    const {game,store}=await fixture(),a=await player(game,501,{'sf-purse-v1':'{"coins":999999}'});
    assert.equal((await act(game,a,'joinIlluminati')).ok,false);a.p.profile.guild={member:true,visits:24};
    a.p.x=80;assert.equal((await act(game,a,'joinIlluminati')).ok,false);a.p.x=92.2;
    assert.equal((await act(game,a,'joinIlluminati')).ok,true);assert.equal(a.p.inventory.economy.state.coins,749999);
    await act(game,a,'joinIlluminati');assert.equal(a.p.inventory.economy.state.coins,749999);
    assert.equal((await store.get('player:'+a.p.owner)).illuminati,true);
    const poor=await member(game,502,249999);assert.equal((await act(game,poor,'joinIlluminati')).ok,false);assert.equal(poor.p.inventory.economy.state.coins,249999);await game.close();
});
test('private cave instances isolate players, shared interactions, chat and PvP at identical tile coordinates',async()=>{
    const {game}=await fixture(),a=await member(game,503),b=await member(game,504);await initiate(game,a);await initiate(game,b);
    assert.equal(a.p.instance.kind,'illuminati');assert.notEqual(a.p.instance.id,b.p.instance.id);game.broadcast();
    assert.equal(a.p.seen.size,0);assert.equal(b.p.seen.size,0);assert.equal((await act(game,a,'releaseTiger')).ok,false);
    const before=b.messages.length;game.receive(a.p,{type:'say',text:'yo'});assert.equal(b.messages.length,before);
    await act(game,a,'pvp',{enabled:true});await act(game,b,'pvp',{enabled:true});assert.equal((await act(game,a,'pvpAttack',{id:b.p.id})).ok,false);
    const update=a.messages.filter(m=>m.type==='world').at(-1);assert.deepEqual(update.state.cows,[]);assert.deepEqual(update.state.npcs,[]);assert.deepEqual(update.state.loot,[]);await game.close();
});
test('cave movement uses its own tile graph and exits return to the guild surface',async()=>{
    const {game,advance}=await fixture(),a=await member(game,505);await initiate(game,a);
    const initial={x:a.p.x,z:a.p.z};advance(1000);game.receive(a.p,{type:'pose',pose:{x:13.5,z:23.5,y:ILLUMINATI_CAVE.floor+.025,angle:0,phase:0,motion:1,moving:true,mode:'walk',hp:30}});assert.equal(a.p.z,23.5);
    game.receive(a.p,{type:'pose',pose:{x:1,z:1,y:ILLUMINATI_CAVE.floor,angle:0,phase:0,motion:1,moving:true,mode:'walk',hp:30}});assert.equal(a.p.z,23.5);
    assert.ok(CAVE_NAVIGATION.path({x:initial.x-.5,y:initial.z-.5},{x:ILLUMINATI_CAVE.boarding.x-.5,y:ILLUMINATI_CAVE.boarding.z-.5}));
    assert.equal((await act(game,a,'instanceLeave')).ok,true);assert.equal(a.p.instance.kind,'world');assert.equal(a.p.x,92.2);assert.equal(a.p.z,120);await game.close();
});
test('the bomber is personal, requires the cave, launches airborne over the Pacific and returns to its own hangar',async()=>{
    const {game}=await fixture(),a=await member(game,506),b=await member(game,507);
    assert.equal((await act(game,a,'bomberBoard')).ok,false);await initiate(game,a);
    Object.assign(a.p,ILLUMINATI_CAVE.boarding);assert.equal((await act(game,a,'bomberBoard')).ok,true);
    assert.equal(a.p.instance.kind,'world');assert.equal(a.p.mode,'bomber');assert.ok(a.p.x<0&&a.p.y===25);assert.equal(b.p.profile.bomber,undefined);
    assert.equal((await act(game,b,'bomberBomb')).ok,false);assert.equal((await act(game,a,'bomberReturn')).ok,true);assert.equal(a.p.instance.kind,'illuminati');await game.close();
});
test('B-2 poses require ownership and obey separate airship/Shift-boost speed limits',async()=>{
    const {game,advance}=await fixture(),a=await member(game,512),b=await member(game,513);await initiate(game,a);Object.assign(a.p,ILLUMINATI_CAVE.boarding);await act(game,a,'bomberBoard');
    const pose=(p,x,boost=false)=>game.receive(p,{type:'pose',pose:{x,z:p.z,y:p.y,angle:0,phase:0,motion:0,moving:true,mode:'bomber',boost,hp:30}});
    advance(100);pose(a.p,a.p.x+.8);assert.equal(a.p.x,-23.2);
    advance(100);pose(a.p,a.p.x+10);assert.equal(a.p.x,-23.2,'rocket speed requires Shift boost');
    advance(100);pose(a.p,a.p.x+10,true);assert.equal(a.p.x,-13.2);
    advance(100);pose(b.p,b.p.x+1,true);assert.equal(b.p.mode,'walk','unowned aircraft mode is rejected');await game.close();
});
test('ejection is server-driven, rejects repeated exits and bombs, and saves a ground landing on disconnect',async()=>{
    const {game,geometry,advance,store}=await fixture(),a=await member(game,514),observer=await member(game,515);await initiate(game,a);Object.assign(a.p,ILLUMINATI_CAVE.boarding);await act(game,a,'bomberBoard');
    geometry.landClearAt=(x,z)=>x>=0&&z>90&&z<130;Object.assign(observer.p,{x:1,z:106});
    const hp=a.p.hp,result=await act(game,a,'bomberEject');assert.equal(result.ok,true);assert.match(result.message,/Illuminati will pay/);assert.equal(a.p.mode,'parachute');assert.ok(a.p.parachute.to.x>=.5);assert.ok(observer.messages.some(m=>m.type==='bomberEjected'));
    assert.equal((await act(game,a,'bomberEject')).ok,false);assert.equal((await act(game,a,'bomberBomb')).ok,false);assert.equal((await act(game,a,'bomberReturn')).ok,false);
    const before=a.p.x;game.receive(a.p,{type:'pose',pose:{x:100,z:100,y:1.15,angle:0,phase:0,motion:1,moving:true,mode:'walk',hp:30}});assert.equal(a.p.x,before);
    const flight=a.p.parachute;advance(flight.duration*500);game.tick(.05);assert.ok(a.p.y>flight.to.y&&a.p.y<flight.from.y);
    await game.flush();assert.equal((await store.get('player:'+a.p.owner)).position.y,flight.to.y,'reconnect never strands a player in the air');
    advance(flight.duration*500+1);game.tick(.05);assert.equal(a.p.bomberActive,false);assert.equal(a.p.parachute,null);assert.equal(a.p.mode,'walk');assert.equal(a.p.hp,hp);assert.equal(a.p.x,flight.to.x);assert.ok(a.messages.some(m=>m.type==='bomberLanded'));assert.equal(a.p.profile.illuminati,true);await game.close();
});
test('bombs land after a fall, deal 100 only to cows inside 3×3 tiles, and enforce a persisted 30-second cooldown',async()=>{
    const {game,advance,store}=await fixture(),a=await member(game,508),b=await member(game,509);await initiate(game,a);Object.assign(a.p,ILLUMINATI_CAVE.boarding);await act(game,a,'bomberBoard');
    Object.assign(a.p,{x:35.5,z:175.5});Object.assign(b.p,{x:35.5,z:175.5});const area=bombTileArea(a.p.x,a.p.z),affected=game.shared.cows.filter(c=>cowInBombArea(c,area));assert.ok(affected.length>0);
    const result=await act(game,a,'bomberBomb',{target:b.p.id});assert.equal(result.ok,true);assert.equal((await act(game,a,'bomberBomb')).ok,false);
    advance(BOMB_FALL_MS-1);game.tick(.05);assert.ok(affected.every(c=>c.hp===20));advance(1);game.tick(.05);assert.ok(affected.every(c=>c.hp===0));
    assert.equal(b.p.hp,30);assert.equal(game.shared.raptor.hp,50);assert.equal(game.shared.npcById.get('test-spectre').hp,36);
    assert.equal(b.messages.find(m=>m.type==='cowBombed').damage,100);assert.equal(game.shared.loot.size,affected.length);
    assert.equal((await store.get('player:'+a.p.owner)).bombReadyAt,result.bomber.readyAt);
    advance(BOMB_COOLDOWN_MS-BOMB_FALL_MS-1);assert.equal((await act(game,a,'bomberBomb')).ok,false);advance(1);assert.equal((await act(game,a,'bomberBomb')).ok,true);await game.close();
});
test('boarding Ahab creates a personal instance and returning leaves the private tiles behind',async()=>{
    const {game}=await fixture(),a=await member(game,510),b=await member(game,511);
    assert.equal((await act(game,a,'instanceEnter',{kind:'kraken'})).ok,true);assert.equal(a.p.instance.kind,'kraken');
    assert.equal((await act(game,b,'instanceEnter',{kind:'kraken'})).ok,true);assert.notEqual(a.p.instance.id,b.p.instance.id);game.broadcast();assert.equal(a.p.seen.size,0);
    assert.equal((await act(game,a,'collect',{id:'shared-loot-1'})).ok,false);assert.equal((await act(game,a,'instanceLeave')).ok,true);assert.equal(a.p.instance.kind,'world');await game.close();
});
