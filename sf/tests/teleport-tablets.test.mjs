import test from 'node:test';
import assert from 'node:assert/strict';
import {createTeleportTablets,tabletCounts,tabletTeleportPose,TABLET_TELEPORT_SECONDS} from '../teleport-tablets.js';
import {createEconomy} from '../economy.js';
import {drawTabletTeleport} from '../teleport-models.js';
import {Mesh} from '../geometry.js';
import {sampleCharacterPose} from '../characters.js';

const targets={downtown:{x:10,y:2,z:20},tahoe:{x:100,y:12,z:-200}};
test('tablet purchases cost exactly 20 coins, persist, consume once and refuse custody',async()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},economy=createEconomy({coins:45,iphoneOwned:true,iphoneEquipped:true});let time=10000,allowed=true,arrival=null;
 const args={storage,economy,destinations:targets,getPlayer:()=>({x:1,y:2,z:3}),canUse:()=>allowed,now:()=>time,onArrive:p=>arrival=p};
 const t=createTeleportTablets(args);assert.equal((await t.buy('downtown')).ok,true);assert.equal((await t.buy('tahoe')).ok,true);assert.equal(economy.state.coins,5);assert.equal((await t.buy('tahoe')).ok,false);assert.deepEqual(createTeleportTablets(args).inventory(),{downtown:1,tahoe:1});
 allowed=false;assert.equal((await t.use('tahoe')).ok,false);assert.equal(t.inventory().tahoe,1);allowed=true;assert.equal((await t.use('tahoe')).ok,true);assert.equal(t.inventory().tahoe,0);assert.equal((await t.use('downtown')).ok,false);
 time+=900;t.update();assert.ok(t.state.pose.position.y>2);assert.ok(t.state.pose.arms>.99);time+=2000;t.update();assert.equal(t.state.active,false);assert.deepEqual(arrival,targets.tahoe);assert.equal(createTeleportTablets(args).inventory().tahoe,0);
 assert.deepEqual(tabletCounts({downtown:-1,tahoe:Infinity}),{downtown:0,tahoe:0});
});
test('teleport raises both arms, swooshes up with finite purple geometry, then settles at the fixed destination',()=>{
 const flight={from:{x:1,y:2,z:3},to:targets.tahoe};
 for(const seconds of [0,.6,1.2,1.5,2.2,TABLET_TELEPORT_SECONDS]){const p=tabletTeleportPose(flight,seconds),m=new Mesh();drawTabletTeleport(m,p,seconds*1000);assert.ok(m.data.length>0&&m.data.every(Number.isFinite));assert.ok(m.data.length/33<1800);}
 assert.deepEqual(tabletTeleportPose(flight,0).position,flight.from);assert.deepEqual(tabletTeleportPose(flight,2.8).position,targets.tahoe);
 const pose=sampleCharacterPose('idle',0,{action:'teleport',actionT:1});assert.ok(pose.matrices.every(Number.isFinite));
});
test('network tablets wait for the server arrival, and reject local double use during a flight',async()=>{
 let subscriber,time=10000,arrivals=0;const calls=[],client={state:{serverOffset:0,inventory:{tablets:{tahoe:1,downtown:1}}},subscribe:f=>subscriber=f,command:async(...a)=>{calls.push(a);return {ok:true};}};
 const t=createTeleportTablets({client,economy:createEconomy(),destinations:targets,now:()=>time,onArrive:()=>arrivals++});await t.use('tahoe');assert.equal(calls[0][0],'useTablet');subscriber({type:'tabletTeleport',flight:{from:{x:1,y:2,z:3},to:targets.tahoe,startedAt:time}});time+=5000;t.update();assert.equal(t.state.active,true);assert.equal(arrivals,0);assert.equal((await t.use('downtown')).ok,false);subscriber({type:'tabletArrived',position:targets.tahoe,message:'Arrived'});assert.equal(arrivals,1);assert.equal(t.state.active,false);
});
