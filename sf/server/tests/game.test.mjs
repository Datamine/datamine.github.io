import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,player,command,latestResult} from './fixtures.mjs';
import {normalizeUsername} from '../usernames.mjs';
import {decodePlayerFrame,encodePlayerFrame} from '../../multiplayer-protocol.js';

test('usernames are moderated on the backend, including common substitutions',()=>{
    for(const name of ['John_123','Cassidy','Classy','v','TwelveChars1'])assert.equal(normalizeUsername(name).ok,true,name);
    for(const name of ['13charactersxx','hello there','<script>','f_u_c_k','fuuuck','sh1t','b1tch','F4GG0T','shiiit','fuq','Guest42'])assert.equal(normalizeUsername(name).ok,false,name);
});
test('simultaneous case-insensitive username claims are exclusive; cooldown survives reconnect',async()=>{
    const {game,advance}=await fixture(),a=await player(game,1),b=await player(game,2);
    await Promise.all([command(game,a.p,'rename',{name:'SkyPilot'}),command(game,b.p,'rename',{name:'skypilot'})]);
    assert.equal(latestResult(a.messages).ok,true);assert.equal(latestResult(b.messages).ok,false);
    await command(game,a.p,'rename',{name:'NewPilot'});assert.equal(latestResult(a.messages).ok,false);assert.match(latestResult(a.messages).message,/Wait/);
    game.disconnect(a.p);const again=await player(game,1);assert.equal(again.p.name,'SkyPilot');
    await command(game,again.p,'rename',{name:'NewPilot'});assert.equal(latestResult(again.messages).ok,false);
    advance(60000);await command(game,again.p,'rename',{name:'NewPilot'});assert.equal(latestResult(again.messages).ok,true);
    await command(game,b.p,'rename',{name:'SkyPilot'});assert.equal(latestResult(b.messages).ok,true);
    await game.close();
});
test('shared cow death, loot claims and respawn have exactly one owner and timeline',async()=>{
    const {game,store}=await fixture(),a=await player(game,10),b=await player(game,11),cow=game.shared.cows[0];
    for(const person of [a,b])await command(game,person.p,'teleport',{x:cow.x,z:cow.z+1});
    await Promise.all([command(game,a.p,'attack',{id:cow.id}),command(game,b.p,'attack',{id:cow.id})]);
    assert.equal(cow.hp,0);assert.equal(game.shared.loot.size,1);const item=[...game.shared.loot.values()][0],owner=item.owner===a.p.owner?a:b,other=owner===a?b:a;
    await command(game,other.p,'collect',{id:item.id});assert.equal(latestResult(other.messages).ok,false);
    await command(game,owner.p,'collect',{id:item.id});assert.equal(latestResult(owner.messages).award.kind,'sandwich');assert.equal(game.shared.loot.size,0);
    await command(game,owner.p,'collect',{id:item.id});assert.equal(latestResult(owner.messages).ok,false);
    const persisted=await store.get('player:'+owner.p.owner);assert.equal(persisted.awards.length,1);assert.equal((await store.get('world')).shared.loot.length,0);
    for(let i=0;i<201;i++)game.tick(.05);assert.equal(cow.hp,20);await game.close();
});
test('the airship is shared, passengers cannot steer and a hook boards an occupied ship',async()=>{
    const {game}=await fixture(),pilot=await player(game,20),passenger=await player(game,21),climber=await player(game,22);
    await command(game,pilot.p,'airshipBoard');assert.equal(latestResult(pilot.messages).ok,true);
    await command(game,passenger.p,'airshipBoard');assert.equal(latestResult(passenger.messages).ok,true);
    await command(game,passenger.p,'airshipTarget',{x:94,z:120});assert.equal(latestResult(passenger.messages).ok,false);
    await command(game,climber.p,'buyGrapple');assert.equal(latestResult(climber.messages).ok,true);assert.equal(climber.p.profile.grapplingHook,true);
    await command(game,climber.p,'buyGrapple');assert.equal(latestResult(climber.messages).ok,false);
    for(let i=0;i<400;i++)game.tick(.05);
    await command(game,climber.p,'grapple');assert.equal(latestResult(climber.messages).ok,true);
    for(let i=0;i<180;i++)game.tick(.05);
    assert.equal(game.shared.passengers.size,3);assert.equal(climber.p.airship,true);assert.ok(climber.p.y>20);
    assert.ok(Math.hypot(pilot.p.deck.x-climber.p.deck.x,pilot.p.deck.z-climber.p.deck.z)>.3,'new passengers occupy distinct basket positions');
    await command(game,pilot.p,'airshipLeave');assert.equal(latestResult(pilot.messages).ok,true);
    await command(game,passenger.p,'airshipTarget',{x:96,z:120});assert.equal(latestResult(passenger.messages).ok,true);await game.close();
});
test('animal releases affect the common world and an escaped tiger survives a restart',async()=>{
    const {game,store}=await fixture(),a=await player(game,24),b=await player(game,25);
    for(const person of [a,b])await command(game,person.p,'teleport',{x:16,z:90.5});
    await command(game,a.p,'releaseTiger');assert.equal(latestResult(a.messages).ok,true);
    for(let i=0;i<40;i++)game.tick(.05);
    assert.equal(game.shared.snapshot(a.p).tiger.phase,game.shared.snapshot(b.p).tiger.phase);assert.notEqual(game.shared.tiger.state.phase,'caged');
    await game.close();assert.notEqual((await store.get('world')).shared.tiger.state.phase,'caged');
    const {createGame}=await import('../game.mjs'),{fixtureGeometry}=await import('./fixtures.mjs');
    const restored=await createGame({geometry:fixtureGeometry(),store});assert.equal(restored.shared.tiger.state.phase,game.shared.tiger.state.phase);await restored.close();
});
test('movement is validated; distant and rocket-hidden players stay out of interest packets',async()=>{
    const {game,advance}=await fixture(),a=await player(game,30),b=await player(game,31),x=a.p.x;
    game.receive(a.p,{type:'pose',pose:{x:x+50,z:a.p.z,y:1.15,angle:0,phase:0,motion:1,mode:'walk',hp:30}});assert.equal(a.p.x,x);assert.ok(a.messages.some(m=>m.type==='position'));
    advance(100);game.receive(a.p,{type:'pose',pose:{x:x+.4,z:a.p.z,y:1.15,angle:0,phase:0,motion:1,mode:'walk',hp:30}});assert.ok(a.p.x>x);
    game.broadcast();let frame=decodePlayerFrame(a.messages.filter(m=>m instanceof ArrayBuffer).at(-1));assert.ok(frame.players.some(p=>p.id===b.p.id));
    b.p.mode='hidden';game.broadcast();frame=decodePlayerFrame(a.messages.filter(m=>m instanceof ArrayBuffer).at(-1));assert.ok(!frame.players.some(p=>p.id===b.p.id));
    b.p.mode='walk';b.p.x=300;game.broadcast();frame=decodePlayerFrame(a.messages.filter(m=>m instanceof ArrayBuffer).at(-1));assert.equal(frame.players.length,0);await game.close();
});
test('binary movement packets roundtrip with bounded size and reject malformed data',()=>{
    const source={id:42,x:1.25,z:17,y:29,angle:.8,phase:12,motion:.8,mode:'airship',hp:24,max:30,moving:true,gesture:'attack'},buffer=encodePlayerFrame([source],123,456),frame=decodePlayerFrame(buffer);
    assert.equal(buffer.byteLength,44);assert.equal(frame.players[0].id,42);assert.equal(frame.players[0].mode,'airship');assert.equal(frame.players[0].hp,24);assert.ok(Math.abs(frame.players[0].angle-.8)<1e-5);
    assert.equal(decodePlayerFrame(new ArrayBuffer(13)),null);
});
test('a reward waits for its own durable revision when an older background flush is in flight',async()=>{
    const {createMemoryStore}=await import('../store.mjs'),{createGame}=await import('../game.mjs'),{fixtureGeometry}=await import('./fixtures.mjs');
    const store=createMemoryStore(),batch=store.batch;store.batch=async entries=>{if(entries.some(([key])=>key==='world'))await new Promise(resolve=>setTimeout(resolve,25));return batch(entries);};
    const game=await createGame({geometry:fixtureGeometry(),store,allowDebug:true,random:()=>.5}),a=await player(game,98),cow=game.shared.cows[0],older=game.flush();
    await command(game,a.p,'teleport',{x:cow.x,z:cow.z+1});await command(game,a.p,'attack',{id:cow.id});for(let i=0;i<20;i++)game.tick(.05);
    const item=[...game.shared.loot.values()][0];assert.ok(item);await command(game,a.p,'collect',{id:item.id});await older;
    assert.equal(latestResult(a.messages).ok,true);assert.equal((await store.get('player:'+a.p.owner)).awards.length,1);assert.equal((await store.get('world')).shared.loot.length,0);await game.close();
});
test('disconnecting during a loot commit cannot evict or discard the pending reward',async()=>{
    const {createMemoryStore}=await import('../store.mjs'),{createGame}=await import('../game.mjs'),{fixtureGeometry}=await import('./fixtures.mjs');
    const store=createMemoryStore(),batch=store.batch;store.batch=async entries=>{await new Promise(resolve=>setTimeout(resolve,15));return batch(entries);};
    const game=await createGame({geometry:fixtureGeometry(),store,allowDebug:true,random:()=>.5}),a=await player(game,99),cow=game.shared.cows[0];
    await command(game,a.p,'teleport',{x:cow.x,z:cow.z+1});await command(game,a.p,'attack',{id:cow.id});for(let i=0;i<20;i++)game.tick(.05);
    const item=[...game.shared.loot.values()][0],receipt=command(game,a.p,'collect',{id:item.id});await new Promise(resolve=>setTimeout(resolve,1));a.transport.open=false;game.disconnect(a.p);await receipt;
    const again=await player(game,99);assert.equal(again.p.profile.awards.length,1);assert.equal(again.p.profile.awards[0].kind,'sandwich');assert.equal(game.shared.loot.size,0);await game.close();
});
test('simultaneous authentication obeys the capacity limit while an existing character can replace its tab',async()=>{
    const {createMemoryStore}=await import('../store.mjs'),{createGame}=await import('../game.mjs'),{fixtureGeometry}=await import('./fixtures.mjs');
    const game=await createGame({geometry:fixtureGeometry(),store:createMemoryStore(),maxPlayers:2});
    const results=await Promise.allSettled([player(game,101),player(game,102),player(game,103)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,2);assert.equal(game.players.size,2);
    const first=results[0].value,again=await player(game,101);assert.notEqual(again.p.id,first.p.id);assert.equal(first.transport.open,false);assert.equal(game.players.size,2);await game.close();
});
