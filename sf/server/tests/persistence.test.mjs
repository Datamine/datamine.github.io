import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../store.mjs';
import {createGame} from '../game.mjs';
import {fixtureGeometry,player,command,latestResult} from './fixtures.mjs';
import {GUILD_RESET_MS,PEPTIDE_SPAWN_MS} from '../../guild.js';
import {ILLUMINATI_CAVE} from '../../map-instances.js';
import {BANK_HOUR_MS} from '../../banking.js';

test('SQLite restarts retain identity, username cooldown, private progress and shared cow state',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'loeberland-store-')),filename=join(dir,'world.sqlite');let store,game;
    try{
        store=await createStore({filename});game=await createGame({geometry:fixtureGeometry(),store,now:()=>1000000,allowDebug:true,random:()=>.5});
        const a=await player(game,43,{'sf-sunglasses-v1':'{"owned":true}'});await command(game,a.p,'rename',{name:'MarinPilot'});assert.equal(latestResult(a.messages).ok,true);
        const cow=game.shared.cows[0];await command(game,a.p,'teleport',{x:cow.x,z:cow.z+1});await command(game,a.p,'attack',{id:cow.id});
        await game.close();await store.close();
        store=await createStore({filename});game=await createGame({geometry:fixtureGeometry(),store,now:()=>1001000});
        const b=await player(game,43);assert.equal(b.p.name,'MarinPilot');assert.equal(b.p.profile.privateState['sf-sunglasses-v1'],'{"owned":true}');assert.equal(game.shared.cows[0].hp,10);
        await command(game,b.p,'rename',{name:'OtherPilot'});assert.equal(latestResult(b.messages).ok,false);assert.match(latestResult(b.messages).message,/Wait/);
    }finally{await game?.close();await store?.close();await rm(dir,{recursive:true,force:true});}
});

test('SQLite restarts retain PvP consent, its cooldown and an atomic death inventory transfer',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'loeberland-pvp-store-')),filename=join(dir,'world.sqlite');let store,game,time=1000000;
    try{
        store=await createStore({filename});game=await createGame({geometry:fixtureGeometry(),store,now:()=>time,random:()=>.5});
        const a=await player(game,301,{'sf-expeditions-v1':'{"railgun":true,"equipped":true}'}),b=await player(game,302,{
            'sf-purse-v1':'{"coins":123,"iphoneOwned":true,"ownedHats":["beanie"]}',
            'sf-deli-v1':'{"sandwiches":2}','sf-character-v1':'{"hat":"beanie"}'
        });
        for(const p of [a.p,b.p])await command(game,p,'pvp',{enabled:true});
        await command(game,a.p,'pvpAttack',{id:b.p.id});
        for(let i=0;i<10&&b.p.hp>0;i++){time+=850;game.tick(.05);}
        await b.p.deathTask;assert.equal(b.p.hp,0);
        await game.close();await store.close();
        store=await createStore({filename});game=await createGame({geometry:fixtureGeometry(),store,now:()=>time});
        const returned=await player(game,302,{'sf-purse-v1':'{"coins":999999}'});
        assert.equal(returned.p.hp,30);assert.equal(returned.p.x,75.2);assert.equal(returned.p.inventory.economy.state.coins,0);
        assert.equal(returned.p.inventory.meta.sandwiches,0);assert.equal(returned.p.inventory.economy.state.iphoneOwned,false);
        assert.deepEqual(returned.p.inventory.economy.state.ownedHats,[]);assert.equal(returned.p.inventory.meta.epoch,1);
        assert.equal(game.pvp.status(returned.p).enabled,true);await command(game,returned.p,'pvp',{enabled:false});
        assert.equal(latestResult(returned.messages).ok,false);assert.match(latestResult(returned.messages).message,/Wait/);
        const drops=[...game.shared.loot.values()].filter(l=>l.transfer);assert.equal(drops.length,4);
        assert.equal(drops.find(l=>l.lootKind==='coins').amount,123);assert.equal(drops.find(l=>l.lootKind==='sandwich').amount,2);
    }finally{await game?.close();await store?.close();await rm(dir,{recursive:true,force:true});}
});

test('SQLite retains the guild rank timer, shared peptide schedule, inventory and donated ranks',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'loeberland-guild-store-')),filename=join(dir,'world.sqlite');let store,game,time=1000000;
    const geometry=fixtureGeometry();geometry.merchants=[{id:'guild-ray',label:'Ray',x:92.2,z:120,base:1.15}];geometry.peptideSpawns=[{x:92.7,z:120}];
    try{
        store=await createStore({filename});game=await createGame({geometry,store,now:()=>time});const a=await player(game,406);
        await command(game,a.p,'guildCheckIn');time+=GUILD_RESET_MS;await command(game,a.p,'guildCheckIn');assert.equal(latestResult(a.messages).guild.rank,2);
        game.tick(.05);await command(game,a.p,'collect',{id:[...game.shared.loot.keys()][0]});assert.equal(a.p.inventory.meta.peptides,1);
        await game.close();await store.close();
        store=await createStore({filename});game=await createGame({geometry,store,now:()=>time});const b=await player(game,406);
        assert.equal(b.messages[0].guild.rank,2);assert.equal(b.p.inventory.meta.peptides,1);assert.equal(game.shared.persist().nextPeptideAt,time+PEPTIDE_SPAWN_MS);
        await command(game,b.p,'guildCheckIn');assert.equal(latestResult(b.messages).ok,false);
        game.receive(b.p,{type:'command',action:'guildDonate',inventoryEpoch:b.p.inventory.meta.epoch,args:{}});await b.p.queue;
        assert.equal(latestResult(b.messages).guild.rank,3);assert.equal(latestResult(b.messages).guild.member,false);assert.equal(b.p.inventory.meta.peptides,0);
        await game.close();await store.close();
        store=await createStore({filename});game=await createGame({geometry,store,now:()=>time});const c=await player(game,406);
        assert.equal(c.messages[0].guild.rank,3);assert.equal(c.messages[0].guild.member,false);assert.equal(c.p.inventory.meta.peptides,0);
    }finally{await game?.close();await store?.close();await rm(dir,{recursive:true,force:true});}
});

test('SQLite retains initiation, personal aircraft and bomb cooldown, reconnecting at a safe surface point',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'loeberland-cave-store-')),filename=join(dir,'world.sqlite');let store,game,time=1000000;
    const geometry=fixtureGeometry();geometry.places=[{id:'freemasons-guild',x:90,y:118,w:4.4,d:3.8}];
    try{
        store=await createStore({filename});game=await createGame({geometry,store,now:()=>time});const a=await player(game,407,{'sf-purse-v1':'{"coins":250100}'});a.p.profile.guild={version:2,visits:24,member:true,lastVisitAt:1};
        await command(game,a.p,'joinIlluminati');assert.equal(latestResult(a.messages).ok,true);await command(game,a.p,'instanceEnter',{kind:'illuminati'});
        Object.assign(a.p,ILLUMINATI_CAVE.boarding);await command(game,a.p,'bomberBoard');await command(game,a.p,'bomberBomb');const readyAt=latestResult(a.messages).bomber.readyAt;a.p.hp=17;
        await game.close();await store.close();time+=1000;
        store=await createStore({filename});game=await createGame({geometry,store,now:()=>time});const b=await player(game,407);
        assert.equal(b.p.profile.illuminati,true);assert.equal(b.p.profile.bomber,true);assert.equal(b.p.inventory.economy.state.coins,100);assert.equal(b.p.profile.bombReadyAt,readyAt);
        assert.equal(b.p.instance.kind,'world');assert.equal(b.p.mode,'walk');assert.equal(b.p.y,1.15);assert.equal(b.p.hp,17);assert.equal(b.p.x,92.2);assert.equal(b.p.z,120);
        await command(game,b.p,'joinIlluminati');assert.equal(b.p.inventory.economy.state.coins,100,'revisiting the Old Man never charges twice');
    }finally{await game?.close();await store?.close();await rm(dir,{recursive:true,force:true});}
});

test('SQLite bank deposits accrue interest while offline and coffee inventory survives a restart',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'loeberland-bank-store-')),filename=join(dir,'world.sqlite');let store,game,time=1000000;
    const geometry=fixtureGeometry();geometry.merchants=[{id:'green-banker',label:'Friendly banker',x:92.2,z:120,base:1.15}];
    const request=async(p,action,args={})=>{game.receive(p,{type:'command',action,args,inventoryEpoch:p.inventory.meta.epoch});await p.queue;};
    try{
        store=await createStore({filename});game=await createGame({geometry,store,now:()=>time});const a=await player(game,408,{'sf-purse-v1':'{"coins":1000}'});
        await request(a.p,'bankDeposit',{amount:'all'});await request(a.p,'bankCoffee');assert.equal(a.p.inventory.economy.state.coins,0);await game.close();await store.close();
        time+=BANK_HOUR_MS;store=await createStore({filename});game=await createGame({geometry,store,now:()=>time});const b=await player(game,408);
        assert.equal(b.p.inventory.economy.state.coins,0);assert.equal(b.p.inventory.meta.coffee,1);assert.ok(Math.abs(b.messages[0].bank.balance-1050)<1e-8);
        await request(b.p,'bankWithdraw',{amount:'all'});assert.equal(b.p.inventory.economy.state.coins,1050);
    }finally{await game?.close();await store?.close();await rm(dir,{recursive:true,force:true});}
});
