import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../game.mjs';
import {createMemoryStore} from '../store.mjs';
import {fixtureGeometry,player,latestResult} from './fixtures.mjs';
import {BANK_HOUR_MS} from '../../banking.js';

async function fixture(){let time=1000000;const geometry=fixtureGeometry();geometry.merchants=[{id:'green-banker',label:'Friendly banker',x:92.2,z:120,base:1.15}];const store=createMemoryStore(),game=await createGame({geometry,store,now:()=>time});return {game,store,advance:ms=>time+=ms};}
async function act(game,a,action,args={},epoch=a.p.inventory.meta.epoch){game.receive(a.p,{type:'command',request:Math.random(),action,args,inventoryEpoch:epoch});await a.p.queue;return latestResult(a.messages);}
test('banking is a direct server-owned transfer and hourly interest does not receive an iPhone multiplier',async()=>{
    const {game,advance,store}=await fixture(),a=await player(game,601,{'sf-purse-v1':'{"coins":2000,"iphoneOwned":true,"iphoneEquipped":true}'});
    assert.equal((await act(game,a,'bankDeposit',{amount:1000})).ok,true);assert.equal(a.p.inventory.economy.state.coins,1000);assert.equal(a.p.profile.bank.balance,1000);
    advance(BANK_HOUR_MS);const bank=await act(game,a,'bankStatus');assert.ok(Math.abs(bank.bank.balance-1050)<1e-8);
    assert.equal((await act(game,a,'bankWithdraw',{amount:'all'})).ok,true);assert.equal(a.p.inventory.economy.state.coins,2050);assert.ok(a.p.profile.bank.balance<1e-8);
    assert.equal(JSON.parse((await store.get('player:'+a.p.owner)).privateState['sf-purse-v1']).coins,2050);await game.close();
});
test('deposited coins stay outside death drops and client checkpoints cannot forge bank money',async()=>{
    const {game}=await fixture(),a=await player(game,602,{'sf-purse-v1':'{"coins":2000}'});await act(game,a,'bankDeposit',{amount:1500});
    const drops=a.p.inventory.deathDrops();assert.equal(drops.find(d=>d.lootKind==='coins').amount,500);assert.equal(a.p.profile.bank.balance,1500);
    game.receive(a.p,{type:'checkpoint',privateState:{'sf-green-bank-v1':'{"balance":999999999}'}});await a.p.queue;assert.equal(a.p.profile.bank.balance,1500);
    assert.equal((await act(game,a,'bankWithdraw',{amount:100},0)).ok,false);assert.equal(a.p.profile.bank.balance,1500);await game.close();
});
test('transfers require a live player beside the banker and malformed amounts never move coins',async()=>{
    const {game}=await fixture(),a=await player(game,603,{'sf-purse-v1':'{"coins":1000}'});
    a.p.x+=20;assert.equal((await act(game,a,'bankDeposit',{amount:100})).ok,false);a.p.x-=20;
    for(const amount of [-1,0,.5,'100',Infinity,NaN])assert.equal((await act(game,a,'bankDeposit',{amount})).ok,false);
    assert.equal(a.p.inventory.economy.state.coins,1000);a.p.hp=0;assert.equal((await act(game,a,'bankDeposit',{amount:100})).ok,false);await game.close();
});
test('coffee is complimentary, limited to one carried cup, and drinking consumes it without moving coins',async()=>{
    const {game}=await fixture(),a=await player(game,604,{'sf-purse-v1':'{"coins":0}'});
    assert.equal((await act(game,a,'bankCoffee')).ok,true);assert.equal(a.p.inventory.meta.coffee,1);assert.equal((await act(game,a,'bankCoffee')).ok,false);
    a.p.x+=20;assert.equal((await act(game,a,'bankCoffeeDrink')).ok,true);assert.equal(a.p.inventory.meta.coffee,0);assert.equal(a.p.inventory.economy.state.coins,0);assert.equal(a.p.gesture,'drink');assert.equal((await act(game,a,'bankCoffeeDrink')).ok,false);await game.close();
});
