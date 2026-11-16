import test from 'node:test';
import assert from 'node:assert/strict';
import {createNPCRoaming} from '../npc-roaming.js';

const walkable=(x,y)=>Math.abs(x)<1.5&&Math.abs(y)<1.5&&!(x>.25&&Math.abs(y)<.55);
function canTravel(ax,ay,bx,by){const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/.025));for(let i=0;i<=n;i++)if(!walkable(ax+(bx-ax)*i/n,ay+(by-ay)*i/n))return false;return true;}
const make=()=>({id:'test-merchant',x:.5,z:.5,base:0,angle:0,hold:Infinity});
const create=n=>createNPCRoaming([n],{eligible:()=>true,walkable,canTravel,ground:()=>0,approachFor:()=>({x:0,y:-.8})});

test('small NPC patrols route around obstacles, stay bounded, and use distance-driven footfalls',()=>{
    const npc=make(),life=create(npc);assert.deepEqual(life.unavailable,[]);assert.equal(life.people.length,1);
    const r=npc.roam;assert.ok(r.bounds.east-r.bounds.west<=3);assert.ok(r.bounds.south-r.bounds.north<=3);
    let previous=r.points[0];for(const next of r.points.slice(1)){assert.ok(canTravel(previous.x,previous.y,next.x,next.y));previous=next;}
    let moving=0,paused=0;
    for(let frame=0;frame<1800;frame++){
        const before={x:npc.x,z:npc.z,phase:npc.phase};life.update(.05);
        assert.ok(walkable(npc.x-.5,npc.z-.5));assert.ok(npc.x-.5>=r.bounds.west&&npc.x-.5<=r.bounds.east);assert.ok(npc.z-.5>=r.bounds.north&&npc.z-.5<=r.bounds.south);
        const d=Math.hypot(npc.x-before.x,npc.z-before.z);assert.ok(d<=r.speed*.05+1e-8);
        if(npc.moving){moving++;assert.ok(npc.phase>before.phase);}else paused++;
        const to=npc.approach;assert.ok(walkable(to.x,to.y));assert.ok(canTravel(npc.x-.5,npc.z-.5,to.x,to.y));
    }
    assert.ok(moving>100&&paused>100);assert.ok(r.stops>4);
});
test('selected NPCs wait and face the player, remain still in dialogue, and resume without snapping',()=>{
    const npc=make(),life=create(npc);life.update(3);npc.waiting=true;
    const p={x:npc.x,z:npc.z};life.update(5,{lookAt:{x:npc.x,z:npc.z+2}});
    assert.deepEqual({x:npc.x,z:npc.z},p);assert.ok(Math.abs(npc.angle-Math.PI/2)<1e-7);
    npc.waiting=false;npc.hold=2;life.update(10,{paused:true});assert.equal(npc.hold,2);assert.deepEqual({x:npc.x,z:npc.z},p);
    life.update(1);assert.deepEqual({x:npc.x,z:npc.z},p);
    let previous=p;for(let i=0;i<200;i++){life.update(.05);assert.ok(Math.hypot(npc.x-previous.x,npc.z-previous.z)<=npc.roam.speed*.05+1e-7);previous={x:npc.x,z:npc.z};}
    assert.ok(npc.phase>0);assert.equal(npc.waiting,false);
});
