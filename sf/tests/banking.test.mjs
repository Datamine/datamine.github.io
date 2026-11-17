import test from 'node:test';
import assert from 'node:assert/strict';
import {createBankAccount,BANK_HOUR_MS,projectedBankBalance} from '../banking.js';
import {createBankService} from '../bank-ui.js';
import {createEconomy} from '../economy.js';
import {drawBankInterior,drawBankBillboard,drawCoffeeCup,drawDrinkingCoffee} from '../bank-models.js';
import {Mesh} from '../geometry.js';

test('deposits leave the purse and accrue 5% per elapsed hour, including offline compounding',()=>{
    let time=0;const purse={coins:1000},account=createBankAccount({},()=>time);assert.equal(account.transfer('deposit',1000,purse).ok,true);assert.equal(purse.coins,0);
    time=BANK_HOUR_MS;account.settle();assert.ok(Math.abs(account.snapshot().balance-1050)<1e-8);
    const restored=createBankAccount(account.state,()=>time);time+=BANK_HOUR_MS;restored.settle();assert.ok(Math.abs(restored.snapshot().balance-1102.5)<1e-8);
    assert.equal(restored.transfer('withdraw',1102,purse).ok,true);assert.equal(purse.coins,1102);assert.ok(Math.abs(restored.snapshot().balance-.5)<1e-8);
});
test('late deposits do not acquire earlier interest, invalid transfers do not move funds and the clock cannot run backwards',()=>{
    let time=1000000;const purse={coins:2000},bank=createBankAccount({},()=>time);bank.transfer('deposit',1000,purse);time+=BANK_HOUR_MS/2;bank.transfer('deposit',1000,purse);time+=BANK_HOUR_MS/2;bank.settle();
    assert.ok(Math.abs(bank.state.balance-(1050+1000*Math.sqrt(1.05)))<1e-8);
    const balance=bank.state.balance;for(const n of [-1,0,.5,NaN,Infinity,'100'])assert.equal(bank.transfer('withdraw',n,purse).ok,false);assert.equal(bank.state.balance,balance);
    time-=BANK_HOUR_MS;bank.settle();assert.equal(bank.state.balance,balance);assert.equal(bank.transfer('withdraw',9999,purse).ok,false);
    assert.ok(Number.isFinite(projectedBankBalance({balance:100,updatedAt:0},Number.MAX_SAFE_INTEGER)));
});
test('single-player bank transfers bypass income bonuses, persist separately and coffee can be drunk once',async()=>{
    let time=1000000;const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},economy=createEconomy({coins:1000,iphoneOwned:true,iphoneEquipped:true});let drinks=0;
    const service=createBankService({economy,storage,now:()=>time,onDrink:()=>drinks++});await service.act('deposit',1000);time+=BANK_HOUR_MS;await service.act('withdraw','all');assert.equal(economy.state.coins,1050);
    assert.equal((await service.act('coffee')).ok,true);assert.equal((await service.act('coffee')).ok,false);assert.equal((await service.act('drink')).ok,true);assert.equal((await service.act('drink')).ok,false);assert.equal(drinks,1);
    assert.equal(createBankService({economy,storage,now:()=>time}).snapshot().coffee,0);
});
test('bank furnishings, billboard and coffee animation use finite reusable geometry',()=>{
    const m=new Mesh(),building={x:0,y:0,w:3,d:3},signs=new Map([['green-bank-roof',[[0,0],[1,0],[1,1],[0,1]]]]);drawBankInterior(m,building,1);drawBankBillboard(m,building,4,signs);drawCoffeeCup(m,0,1,0,{steam:1});
    for(const time of [0,400,800,1200,1599])drawDrinkingCoffee(m,{x:0,y:0,angle:.4},1,time,0);
    assert.ok(m.data.length>0&&m.data.every(Number.isFinite));assert.equal(building.interiorObstacles.length,3);
});
