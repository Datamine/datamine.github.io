import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from '../geometry.js';
import {createTigerEncounter} from '../zoo-encounter.js';
import {SF_ZOO,UCSF_HOSPITAL,drawZooAndHospital,drawTigerGate,drawTiger,drawAnimalControlNet} from '../zoo.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} should equal ${b}`);
const loose=e=>{e.release();for(let i=0;i<200&&e.state.phase!=='loose';i++)e.update(.01);assert.equal(e.state.phase,'loose');};
function fixture(options={}){
    const player={x:-15,y:0},events=[],deaths=[];
    const encounter=createTigerEncounter({player,home:{x:2,y:0},exit:{x:0,y:0},wardenStarts:[{x:3,y:3},{x:3,y:-3}],routeTo:(x,y)=>[{x,y}],canCapture:()=>true,
        onEvent:event=>events.push(event),onDeath:()=>{deaths.push(true);player.x=-40;player.y=10;},...options});
    return {encounter,player,events,deaths};
}
test('the tiger stays inside until the gate opens, and cannot be released twice',()=>{
    const {encounter:e}=fixture();e.update(3);assert.equal(e.state.phase,'caged');assert.ok(Math.abs(e.state.tiger.y)<=.8);assert.ok(e.release());assert.equal(e.release(),false);
    e.update(.35);assert.equal(e.state.phase,'opening');close(e.state.gate,.5);assert.equal(e.state.tiger.x,2);for(let i=0;i<200&&e.state.phase!=='loose';i++)e.update(.01);assert.equal(e.state.phase,'loose');assert.equal(e.state.gate,1);close(e.state.tiger.x,0);
});
test('pursuit spends exactly the walking-speed budget across corners without cutting through geometry',()=>{
    const {encounter:e}=fixture({routeTo:(x,y,from)=>from.x===0&&from.y===0?[{x:0,y:-.3},{x:-.3,y:-.3},{x,y}]:[{x,y}]});loose(e);
    const before=e.state.tiger.travel;e.update(.2);close(e.state.tiger.travel-before,4.6*.2);assert.ok(e.state.tiger.y<0);assert.ok(e.state.tiger.x<-.3);close(Math.hypot(e.state.tiger.x+.3,e.state.tiger.y+.3),.32);
});
test('a catch respawns once, and grants a short grace period without ending the animal-control pursuit',()=>{
    const {encounter:e,player,deaths}=fixture({random:()=>.5});player.x=0;e.release();e.update(2);assert.equal(deaths.length,1);assert.equal(player.x,-40);assert.equal(e.state.phase,'loose');assert.ok(e.state.grace>0);
    Object.assign(player,{x:e.state.tiger.x,y:e.state.tiger.y});e.update(.5);assert.equal(deaths.length,1);
});
test('capture requires a clear route, and unreachable vehicle riders cannot be caught',()=>{
    for(const options of [{canCapture:()=>false},{canPursue:()=>false}]){
        const {encounter:e,player,deaths}=fixture(options);player.x=0;e.release();e.update(4);assert.equal(deaths.length,0);
    }
});
test('animal control physically catches, escorts, and cages the tiger, then permits another release',()=>{
    const {encounter:e,events}=fixture({canPursue:()=>false,random:()=>0});e.release();
    for(let i=0;i<1000&&e.state.phase!=='caged';i++)e.update(.1);
    assert.equal(e.state.phase,'caged');assert.equal(e.state.gate,0);assert.ok(Math.abs(e.state.tiger.x-2)<1e-6);
    assert.deepEqual(events,['released','dispatched','captured','caged']);assert.ok(e.release());assert.equal(e.state.attempts,0);
});
test('dispatch, net attempts and escape duration vary with the injected random stream',()=>{
    const durations=[],dispatch=[];
    for(const seed of [3,12345,987654321,71,849321]){
        let n=seed;const random=()=>{n=(1664525*n+1013904223)>>>0;return n/2**32;};
        const {encounter:e}=fixture({canPursue:()=>false,random});e.release();dispatch.push(e.state.dispatchAt);
        for(let i=0;i<2000&&e.state.phase!=='caged';i++)e.update(.1);
        assert.equal(e.state.phase,'caged');durations.push(+e.state.elapsed.toFixed(1));
    }
    assert.ok(new Set(dispatch).size>3);assert.ok(new Set(durations).size>3);
});
test('repeated missed nets eventually produce a real capture rather than an endless loose tiger',()=>{
    const {encounter:e,events}=fixture({canPursue:()=>false,random:()=>.99});e.release();e.update(100);assert.equal(e.state.phase,'caged');assert.ok(events.includes('missed'));assert.ok(e.state.attempts>2);
});
test('pausing preserves the chase, gate and current limb phase',()=>{
    const {encounter:e}=fixture();e.release();e.update(2);const before=JSON.stringify(e.state);e.update(0);assert.equal(JSON.stringify(e.state),before);
});
test('the zoo, hospital, articulated tiger and nets have finite bounded geometry',()=>{
    const sites=new Mesh(),signs=new Map(),drawn=drawZooAndHospital(sites,()=>1.5,signs);assert.equal(drawn.length,3);assert.ok(sites.data.every(Number.isFinite));assert.ok(sites.data.length/33<12000);
    assert.ok(SF_ZOO.x<25&&SF_ZOO.z>80);assert.ok(UCSF_HOSPITAL.x>70&&UCSF_HOSPITAL.z>80);
    for(const open of [0,.5,1]){const mesh=new Mesh();drawTigerGate(mesh,1.5,open);assert.ok(mesh.data.every(Number.isFinite));}
    for(const angle of [0,1,2,3])for(const travel of [0,.15,.7,1.2]){
        const mesh=new Mesh();drawTiger(mesh,{x:2,y:3,angle,travel,moving:true},(x,z)=>1.5+x*.03+z*.04);drawAnimalControlNet(mesh,2,1.5,3,angle,travel);
        assert.ok(mesh.data.every(Number.isFinite));assert.ok(mesh.data.length/33<6000);
    }
});
