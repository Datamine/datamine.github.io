import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../game.mjs';
import {createMemoryStore} from '../store.mjs';
import {fixtureGeometry,player as fixturePlayer,latestResult} from './fixtures.mjs';
import {GUILD_RESET_MS,PEPTIDE_SPAWN_MS} from '../../guild.js';

async function guildFixture(){
    let time=1000000;const geometry=fixtureGeometry();geometry.peptideSpawns=[{x:92.7,z:120},{x:91.7,z:120.5}];geometry.merchants=[{id:'guild-ray',x:92.2,z:120,base:1.15,label:'Ray'}];
    geometry.places=[{id:'freemasons-guild',x:94,y:118,w:4,d:4}];
    const store=createMemoryStore(),game=await createGame({geometry,store,now:()=>time,random:()=>.5});
    return {game,store,geometry,advance:ms=>time+=ms,now:()=>time};
}
async function player(...args){const result=await fixturePlayer(...args);result.transport.messages=result.messages;return result;}
async function act(game,p,action,args={}){game.receive(p,{type:'command',request:Math.random(),action,args,inventoryEpoch:p.inventory.meta.epoch});await p.queue;return latestResult(p.transport.messages);}

test('shared peptides spawn once every ten minutes and two collectors cannot both take a vial',async()=>{
    const {game,advance,store}=await guildFixture(),a=await player(game,401),b=await player(game,402);
    assert.equal(game.shared.snapshot(a.p).peptideSpawnAt,1000000+PEPTIDE_SPAWN_MS);
    advance(PEPTIDE_SPAWN_MS-1);game.tick(.05);assert.equal(game.shared.loot.size,0);
    advance(1);game.tick(.05);const vial=[...game.shared.loot.values()][0];assert.equal(vial.lootKind,'peptides');assert.equal(game.shared.snapshot(b.p).peptideSpawnAt,1000000+2*PEPTIDE_SPAWN_MS);game.broadcast();assert.equal(a.messages.filter(m=>m.type==='world').at(-1).state.peptideSpawnAt,1000000+2*PEPTIDE_SPAWN_MS);
    assert.equal(game.shared.snapshot(a.p).loot[0].id,vial.id);assert.equal(game.shared.snapshot(b.p).loot[0].id,vial.id);
    const results=await Promise.all([act(game,a.p,'collect',{id:vial.id}),act(game,b.p,'collect',{id:vial.id})]);
    assert.equal(results.filter(r=>r.ok).length,1);assert.equal(a.p.inventory.meta.peptides+b.p.inventory.meta.peptides,1);
    assert.equal((await store.get('world')).shared.loot.length,0);
    advance(PEPTIDE_SPAWN_MS);game.tick(.05);assert.equal(game.shared.loot.size,1);await game.close();
});
test('server ranks survive reconnects and require 24 elapsed-hour returns with no catch-up promotions',async()=>{
    const {game,advance}=await guildFixture(),a=await player(game,403);
    assert.equal((await act(game,a.p,'guildCheckIn')).guild.rank,1);advance(1000);
    assert.equal((await act(game,a.p,'guildCheckIn')).ok,false);
    const reconnected=await player(game,403,{'sf-guild-v1':'{"member":true,"visits":24}'});
    assert.equal((await act(game,reconnected.p,'guildCheckIn')).ok,false);
    for(let i=1;i<=24;i++){advance(GUILD_RESET_MS);const r=await act(game,reconnected.p,'guildCheckIn');assert.equal(r.guild.rank,i+1);assert.equal(r.guild.member,i===24);}
    assert.equal(reconnected.p.profile.guild.member,true);await game.close();
});
test('Ray requires proximity and 24 real one-vial donations earn exactly 24 ranks before admission',async()=>{
    const {game,store,advance}=await guildFixture(),a=await player(game,404);
    assert.equal((await act(game,a.p,'guildDonate')).ok,false);
    advance(PEPTIDE_SPAWN_MS);game.tick(.05);await act(game,a.p,'collect',{id:[...game.shared.loot.keys()][0]});
    a.p.x+=20;assert.equal((await act(game,a.p,'guildDonate')).ok,false);assert.equal(a.p.inventory.meta.peptides,1);a.p.x-=20;
    const r=await act(game,a.p,'guildDonate');assert.equal(r.guild.rank,2);assert.equal(r.guild.member,false);assert.equal(r.inventory.peptides,0);
    const saved=await store.get('player:'+a.p.owner);assert.equal(saved.guild.visits,1);assert.equal(saved.guild.member,false);assert.equal(saved.inventory.peptides,0);
    assert.equal((await act(game,a.p,'guildDonate')).ok,false,'a repeat without another vial cannot advance a rank');
    for(let i=2;i<=24;i++){
        advance(PEPTIDE_SPAWN_MS);game.tick(.05);await act(game,a.p,'collect',{id:[...game.shared.loot.keys()][0]});
        const result=await act(game,a.p,'guildDonate');assert.equal(result.guild.rank,i+1);assert.equal(result.guild.member,i===24);assert.equal(result.inventory.peptides,0);
    }
    assert.equal((await store.get('player:'+a.p.owner)).guild.member,true);
    await act(game,a.p,'guildDonate');assert.equal(a.p.inventory.meta.peptides,0);await game.close();
});
test('nonmembers cannot walk into the guild and stale private saves cannot forge rank or peptides',async()=>{
    const {game,advance}=await guildFixture(),a=await player(game,405);advance(1000);
    const pose={x:94.3,z:120,y:1.15,angle:0,phase:0,motion:1,moving:true,mode:'walk',hp:30};
    game.receive(a.p,{type:'pose',pose});assert.equal(a.p.x,92.2);assert.match(a.messages.at(-1).reason,/members only/);
    game.receive(a.p,{type:'checkpoint',privateState:{'sf-guild-v1':'{"member":true,"visits":24,"peptides":100}'}});await a.p.queue;
    assert.equal(a.p.profile.guild,undefined);assert.equal(a.p.inventory.meta.peptides,0);
    a.p.profile.guild={member:true,visits:0,lastVisitAt:null};game.receive(a.p,{type:'pose',pose});assert.equal(a.p.x,94.3);await game.close();
});
test('a persisted spawn schedule resumes after restart without a restart-reset or missed-spawn flood',async()=>{
    const {game,geometry,store,advance,now}=await guildFixture();advance(PEPTIDE_SPAWN_MS-100);await game.close();
    const restored=await createGame({geometry,store,now,random:()=>.5});advance(100);restored.tick(.05);assert.equal(restored.shared.loot.size,1);
    advance(PEPTIDE_SPAWN_MS*20);restored.tick(.05);assert.equal(restored.shared.loot.size,1,'old vials expire and a missed interval produces only one new vial');await restored.close();
});
