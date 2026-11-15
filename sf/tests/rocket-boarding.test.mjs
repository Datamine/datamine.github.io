import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from '../geometry.js';
import {createCharacterPose,sampleCharacterPose} from '../characters.js';
import {createRocketTravel,drawReusableRocket,drawRocketPad,ROCKET_ACCESS,ROCKET_CABIN_HEIGHT} from '../rocket.js';
import {SF_SPACEPORT} from '../southern-district.js';
import {createTahoe} from '../tahoe.js';

const near=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} should equal ${b}`);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const accessDuration=ROCKET_ACCESS.walk+ROCKET_ACCESS.grip+ROCKET_ACCESS.climb+ROCKET_ACCESS.enter+ROCKET_ACCESS.seal;

test('boarding walks to the visible ladder, climbs outside the hull, then enters a level hatch',()=>{
    const rocket=createRocketTravel(),site=SF_SPACEPORT,stages=new Set();rocket.start(site,createTahoe().spaceport);
    for(let i=0;i<Math.floor((accessDuration-.01)*120);i++){
        rocket.update(1/120);const {position:p,pose,hatch,thrust,vehicle}=rocket.state;stages.add(pose.stage);assert.equal(thrust,0);near(vehicle.y,site.base+.14);
        if(pose.stage==='approach'){near(p.y,site.base+.04);assert.ok(p.z<=site.z+ROCKET_ACCESS.riderZ);}
        if(['grip','ladder'].includes(pose.stage)){near(p.x,site.x);near(p.z,site.z+ROCKET_ACCESS.riderZ);near(pose.angle,Math.PI/2);assert.equal(pose.mode,'climb');assert.equal(hatch,1);assert.ok(Math.hypot(p.x-site.x,p.z-site.z)>.7);}
        if(pose.stage==='hatch'){near(p.y,site.base+.14+ROCKET_CABIN_HEIGHT);assert.equal(hatch,1);assert.equal(pose.mode,'move');}
    }
    assert.deepEqual([...stages],['approach','grip','ladder','hatch','seal']);
    rocket.update(.03);assert.equal(rocket.state.phase,'ascending');assert.equal(rocket.state.hatch,0);assert.equal(rocket.state.occupied,true);assert.equal(rocket.state.thrust,1);
});

test('boarding starts at the live avatar position without snapping to a preset entrance',()=>{
    const rocket=createRocketTravel(),entry={x:SF_SPACEPORT.x+.27,y:SF_SPACEPORT.base+.03,z:SF_SPACEPORT.z-3.2};
    rocket.start(SF_SPACEPORT,createTahoe().spaceport,entry);assert.deepEqual(rocket.state.position,entry);entry.x+=50;
    const before={...rocket.state.position};rocket.update(1/60);assert.ok(distance(before,rocket.state.position)<.01);
});

test('landing reverses the access route, facing the ladder on descent and away when stepping out',()=>{
    const site=SF_SPACEPORT,to={...site,x:site.x+100,z:site.z+100,base:12,entry:{x:site.entry.x+100,y:site.entry.y+100}},forward=createRocketTravel();
    forward.start(to,site);
    for(let i=0;i<65;i++){
        forward.update(.1);const reverseElapsed=accessDuration-forward.state.elapsed;
        const sample=createRocketTravel();sample.start(site,to);sample.update(accessDuration+36+reverseElapsed);
        assert.ok(distance(forward.state.position,sample.state.position)<1e-6);
        if(sample.state.pose.stage==='ladder')near(sample.state.pose.angle,Math.PI/2);
        if(sample.state.pose.stage==='hatch')near(sample.state.pose.angle,-Math.PI/2);
    }
});

test('climbing phase follows height so planted hands and feet stay put when frame rate varies',()=>{
    const rocket=createRocketTravel();rocket.start(SF_SPACEPORT,createTahoe().spaceport);rocket.update(ROCKET_ACCESS.walk+ROCKET_ACCESS.grip+1.1);
    let planted=0;
    for(const dt of [.003,.011,.021,.005,.017,.033,.007,.019]){
        const before={y:rocket.state.position.y,pose:sampleCharacterPose('climb',rocket.state.pose.phase,{motion:1},createCharacterPose())};
        rocket.update(dt);const after=sampleCharacterPose('climb',rocket.state.pose.phase,{motion:1},createCharacterPose()),dy=rocket.state.position.y-before.y;
        for(let side=0;side<2;side++)if(before.pose.feet[side].contact&&after.feet[side].contact){
            near(before.pose.feet[side].point[1],after.feet[side].point[1]+dy,1e-5);
            const oppositeHand=side?6:9;near(before.pose.joints[oppositeHand*3+1],after.joints[oppositeHand*3+1]+dy,1e-5);planted++;
        }
    }
    assert.ok(planted>3);
});

test('hatch animation and ladder geometry remain finite and inexpensive from every camera angle',()=>{
    for(const hatch of [0,.25,.5,1])for(const occupied of [false,true])for(const cameraAngle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
        const m=new Mesh();drawReusableRocket(m,{x:0,y:0,z:0},0,{hatch,occupied,cameraAngle});assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<12000);
    }
    const pad=new Mesh();drawRocketPad(pad,SF_SPACEPORT,new Map());assert.ok(pad.data.every(Number.isFinite));assert.ok(pad.data.length/33<4000);
});
