import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from '../geometry.js';
import {westernCoastX} from '../coastline.js';
import {createSurfing,sampleSurfWave,SURF_TRICKS,drawSurfRack,drawWaveSurfer,drawPacificaWaves} from '../surfing.js';

const start=()=>{const s=createSurfing(),w=sampleSurfWave(0,2);s.start({x:w.x,z:w.z});assert.ok(s.catchWave(s.state.position,0));return s;};
test('surfing requires a nearby wave and rides continuously on open water beside Pacifica',()=>{
    const s=createSurfing();s.start({x:30,z:120});assert.equal(s.catchWave(s.state.position,0),false);s.start({x:-100,z:121});assert.equal(s.catchWave(s.state.position,0),false);
    const ride=start(),before={...ride.state.position};let finish=false;
    for(let i=0;i<160;i++){const previous={...ride.state.position};const events=ride.update(.05);finish||=events.some(e=>e.type==='finish');assert.ok(ride.state.position.x<westernCoastX(ride.state.position.z));assert.ok(Math.hypot(ride.state.position.x-previous.x,ride.state.position.z-previous.z)<.5);}
    assert.ok(finish);assert.equal(ride.state.phase,'paddling');assert.ok(Math.abs(ride.state.position.z-before.z)>18);assert.equal(ride.pose.stand,0);
});
test('Air 360s, kickflips and backflips animate, land once and award their own points',()=>{
    for(const t of SURF_TRICKS){const s=start();assert.equal(s.trick(t.id),false,'pop up before attempting tricks');s.update(.5);assert.ok(s.trick(t.id));assert.equal(s.trick(t.id),false);
        s.update(t.duration/2);assert.ok(s.pose.height>1.5);assert.ok([s.pose.yaw,s.pose.roll,s.pose.pitch].some(v=>Math.abs(v)>2));const events=s.update(t.duration/2+.001);
        assert.equal(events.filter(e=>e.type==='trick').length,1);assert.equal(s.state.score,t.points);assert.equal(s.state.landed,1);s.update(.1);assert.equal(s.state.score,t.points);
    }
});
test('wave movement respects collision, steering, pause, and different frame rates',()=>{
    const a=start(),b=start();a.update(2);for(let i=0;i<120;i++)b.update(1/60);assert.ok(Math.hypot(a.state.position.x-b.state.position.x,a.state.position.z-b.state.position.z)<1e-7);
    const before={...a.state.position};a.update(0);assert.deepEqual(a.state.position,before);assert.ok(a.steer(before.x,before.z-20));a.update(1);assert.ok(a.state.position.z<before.z);
    const blocked=createSurfing({segment:()=>false}),w=sampleSurfWave(0,2);blocked.start({x:w.x,z:w.z});assert.ok(blocked.catchWave(blocked.state.position,0));blocked.update(.05);assert.deepEqual(blocked.state.position,{x:w.x,z:w.z});assert.equal(blocked.state.phase,'paddling');assert.equal(blocked.state.score,0);
});
test('surfboards, paddling, tricks and moving wave crests use bounded finite native geometry',()=>{
    const rack=new Mesh();drawSurfRack(rack,{x:0,z:0,base:0});assert.ok(rack.data.every(Number.isFinite));assert.ok(rack.data.length/33<1200);
    const s=start();s.update(.5);s.trick('backflip');s.update(.6);const flip=new Mesh();drawWaveSurfer(flip,0,0,.06+s.pose.height,0,1000,s.pose);assert.ok(flip.data.every(Number.isFinite));assert.ok(flip.data.length/33<7000);
    const paddle=new Mesh(),later=new Mesh();s.stop();drawWaveSurfer(paddle,0,0,.06,0,0,s.pose,{moving:true});drawWaveSurfer(later,0,0,.06,0,800,s.pose,{moving:true});assert.notDeepEqual(paddle.data,later.data);
    const first=new Mesh(),next=new Mesh(),viewer={x:6,z:121};drawPacificaWaves(first,0,viewer);drawPacificaWaves(next,2000,viewer);assert.ok(first.data.every(Number.isFinite));assert.ok(first.data.length/33<2000);assert.notDeepEqual(first.data,next.data);
    const reduced=new Mesh();drawPacificaWaves(reduced,2000,viewer,{reduced:true});assert.deepEqual(reduced.data,next.data,'visible catch targets stay aligned with moving waves under reduced motion');
});
