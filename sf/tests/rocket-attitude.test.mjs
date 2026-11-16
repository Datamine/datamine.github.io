import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from '../geometry.js';
import {createRocketTravel,drawReusableRocket,rocketFlightPoint,tiltRocketMesh,ROCKET_ACCESS,ROCKET_CABIN_HEIGHT,ROCKET_RIDER_CENTER} from '../rocket.js';
import {SF_SPACEPORT} from '../southern-district.js';
import {createTahoe} from '../tahoe.js';

const boarding=ROCKET_ACCESS.walk+ROCKET_ACCESS.grip+ROCKET_ACCESS.climb+ROCKET_ACCESS.enter+ROCKET_ACCESS.seal;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} should equal ${b}`);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('both legs launch vertically, cruise sideways toward their destination, and land upright',()=>{
    const tahoe=createTahoe().spaceport;
    for(const [from,to] of [[SF_SPACEPORT,tahoe],[tahoe,SF_SPACEPORT]]){
        const r=createRocketTravel();r.start(from,to);near(r.state.pitch,0);r.update(boarding+3);near(r.state.pitch,0);
        r.update(3+12);near(r.state.pitch,Math.PI/2);assert.equal(r.state.phase,'cruising');
        const v=r.state.vehicle,pivot={x:v.x,y:v.y+ROCKET_CABIN_HEIGHT+ROCKET_RIDER_CENTER,z:v.z};
        const nose=rocketFlightPoint({...pivot,y:pivot.y+1},v,r.state),engine=rocketFlightPoint({...pivot,y:pivot.y-1},v,r.state),length=Math.hypot(to.x-from.x,to.z-from.z);
        near(nose.y,pivot.y);near(nose.x-pivot.x,(to.x-from.x)/length);near(nose.z-pivot.z,(to.z-from.z)/length);near(engine.x-pivot.x,-(to.x-from.x)/length);near(engine.z-pivot.z,-(to.z-from.z)/length);
        r.update(12);near(r.state.pitch,0);assert.equal(r.state.phase,'descending');r.update(6+boarding+.01);near(r.state.pitch,0);assert.equal(r.state.active,false);near(r.state.position.x,to.entry.x+.5);near(r.state.position.z,to.entry.y+.5);
    }
});

test('rotation fixes the camera target, preserves cabin contact, and has an exact inverse',()=>{
    const v={x:104,y:150,z:122},pivot={x:v.x,y:v.y+ROCKET_CABIN_HEIGHT+ROCKET_RIDER_CENTER,z:v.z};
    for(const heading of [0,.4,1.5,3,-2])for(const pitch of [0,.2,.8,Math.PI/2]){
        assert.ok(distance(rocketFlightPoint(pivot,v,{pitch,heading}),pivot)<1e-8);
        for(const p of [{x:104.25,y:155,z:121.8},{x:103.7,y:149,z:122.2}]){
            const rotated=rocketFlightPoint(p,v,{pitch,heading}),back=rocketFlightPoint(rotated,v,{pitch:-pitch,heading});assert.ok(distance(back,p)<1e-7);near(distance(rotated,pivot),distance(p,pivot));
        }
        const floor={x:v.x,y:v.y+ROCKET_CABIN_HEIGHT,z:v.z},riderFeet={...floor,y:floor.y+.016};
        near(distance(rocketFlightPoint(floor,v,{pitch,heading}),rocketFlightPoint(riderFeet,v,{pitch,heading})),.016);
    }
});

test('pitch is continuous across phase boundaries and variable frame durations',()=>{
    const r=createRocketTravel();r.start(SF_SPACEPORT,createTahoe().spaceport);let previous=0,horizontal=0;
    for(let i=0;i<6000&&r.state.active;i++){
        const dt=[1/120,1/60,.025][i%3];r.update(dt);assert.ok(Number.isFinite(r.state.pitch));assert.ok(r.state.pitch>=0&&r.state.pitch<=Math.PI/2);assert.ok(Math.abs(r.state.pitch-previous)<dt*1.1);previous=r.state.pitch;if(r.state.pitch===Math.PI/2)horizontal++;
    }
    assert.equal(r.state.active,false);assert.ok(horizontal>500);r.start(SF_SPACEPORT,createTahoe().spaceport);r.update(boarding+18);r.cancel();near(r.state.pitch,0);
});

test('hull and rider mesh transforms preserve normals, colors and prior batch geometry',()=>{
    const m=new Mesh();m.tri([0,0,0],[1,0,0],[0,1,0],'#ffffff');const start=m.data.length,prefix=m.data.slice();m.tri([104,155,122],[105,155,122],[104,156,122],'#dce4e1');
    const original=m.data.slice(start),vehicle={x:104,y:150,z:122},attitude={pitch:Math.PI/2,heading:-.6};tiltRocketMesh(m,start,vehicle,attitude);assert.deepEqual(m.data.slice(0,start),prefix);
    for(let i=start;i<m.data.length;i+=11){const j=i-start,p=rocketFlightPoint({x:original[j],y:original[j+1],z:original[j+2]},vehicle,attitude);near(m.data[i],p.x);near(m.data[i+1],p.y);near(m.data[i+2],p.z);near(Math.hypot(...m.data.slice(i+3,i+6)),1);assert.deepEqual(m.data.slice(i+6,i+11),original.slice(j+6,j+11));}
});

test('tilted cabins use the local viewing direction and remain finite at every camera angle',()=>{
    const v={x:104,y:150,z:122};
    for(const heading of [-.6,2.5])for(const pitch of [0,.7,Math.PI/2])for(let i=0;i<4;i++){
        const localEye={x:v.x+Math.cos(i*Math.PI/2)*12,y:v.y+ROCKET_CABIN_HEIGHT+.9+9,z:v.z+Math.sin(i*Math.PI/2)*12},eye=rocketFlightPoint(localEye,v,{pitch,heading});
        const expected=new Mesh(),actual=new Mesh();drawReusableRocket(expected,v,1000,{occupied:true,cameraAngle:i*Math.PI/2,thrust:.35});tiltRocketMesh(expected,0,v,{pitch,heading});
        drawReusableRocket(actual,v,1000,{occupied:true,cameraPosition:[eye.x,eye.y,eye.z],pitch,heading,thrust:.35});assert.equal(actual.data.length,expected.data.length);assert.ok(actual.data.every(Number.isFinite));assert.ok(actual.data.length/33<12000);
        for(let j=0;j<actual.data.length;j++)assert.ok(Math.abs(actual.data[j]-expected.data[j])<1e-7);
    }
});
