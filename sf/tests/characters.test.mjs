import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from '../geometry.js';
import {CHARACTER_CLIPS,getCharacterMesh,sampleCharacterPose,drawCharacter} from '../characters.js';

const joint=(p,i)=>Array.from(p.joints.subarray(i*3,i*3+3));
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

test('petting crouches with planted feet, a lowered hand and an exact return to idle',()=>{
    const idle=sampleCharacterPose('idle',0,{motion:0,time:0}),rest=new Float32Array(idle.joints),middle=sampleCharacterPose('idle',0,{motion:0,time:0,action:'pet',actionT:.5});
    assert.ok(middle.joints[1]<rest[1]-.25);assert.ok(joint(middle,9)[1]<.65);assert.ok(middle.matrices.every(Number.isFinite));
    for(const foot of [12,15])assert.ok(distance(joint(middle,foot),Array.from(rest.subarray(foot*3,foot*3+3)))<1e-5);
    for(const thigh of [10,13]){assert.ok(Math.abs(distance(joint(middle,thigh),joint(middle,thigh+1))-.41)<1e-5);assert.ok(Math.abs(distance(joint(middle,thigh+1),joint(middle,thigh+2))-.38)<1e-5);}
    assert.deepEqual(sampleCharacterPose('idle',0,{motion:0,time:0,action:'pet',actionT:1}).joints,rest);
});

test('the indexed character mesh is reusable across colors and all indices are valid',()=>{
    const a=getCharacterMesh({shirt:'#aabbcc'}),b=getCharacterMesh({shirt:'#332211'});
    assert.equal(a,b);assert.ok(a.indices.length/3>1000&&a.indices.length/3<2000);
    assert.ok(a.indices.every(i=>i<a.bonesA.length));assert.ok(a.vertices.every(Number.isFinite));
    assert.ok(a.weights.every(w=>w>=0&&w<=1));assert.ok(a.bonesA.every(b=>b<16)&&a.bonesB.every(b=>b<16));
    const before=a.vertices.slice();
    for(const phase of [0,1,2,3])drawCharacter(new Mesh(),0,0,0,phase,phase,false,'#bd9369','#707b4b',{mode:'move',run:1,motion:1});
    assert.deepEqual(a.vertices,before);
});

test('limb lengths remain constant through walking, running, sitting, cycling, surfing and climbing',()=>{
    for(const mode of ['idle','move','sit','cycle','surf','climb'])for(const run of [0,1])for(let phase=0;phase<Math.PI*2;phase+=.13){
        const p=sampleCharacterPose(mode,phase,{motion:mode==='move'||mode==='climb'?1:0,run,time:phase});
        assert.ok(p.matrices.every(Number.isFinite));
        for(const thigh of [10,13]){
            assert.ok(Math.abs(distance(joint(p,thigh),joint(p,thigh+1))-.41)<1e-5);
            assert.ok(Math.abs(distance(joint(p,thigh+1),joint(p,thigh+2))-.38)<1e-5);
        }
        for(const arm of [4,7]){
            assert.ok(Math.abs(distance(joint(p,arm),joint(p,arm+1))-.31)<1e-5);
            assert.ok(Math.abs(distance(joint(p,arm+1),joint(p,arm+2))-.275)<1e-5);
        }
    }
});

test('planted climbing hands and feet cancel vertical travel along a rung',()=>{
    const f0=.1,f1=.2,a=sampleCharacterPose('climb',f0*Math.PI*2),b=sampleCharacterPose('climb',f1*Math.PI*2);
    const travel=CHARACTER_CLIPS.climb.stride*(f1-f0);
    assert.ok(a.feet[0].contact&&b.feet[0].contact);
    assert.ok(Math.abs(a.feet[0].point[1]-(b.feet[0].point[1]+travel))<1e-5);
    assert.ok(Math.abs(joint(a,9)[1]-(joint(b,9)[1]+travel))<1e-5);
    assert.ok(a.matrices.every(Number.isFinite)&&b.matrices.every(Number.isFinite));
});

test('a planted walking foot cancels the exact forward travel instead of sliding',()=>{
    const f0=.10,f1=.20,a=sampleCharacterPose('move',f0*Math.PI*2,{motion:1}),b=sampleCharacterPose('move',f1*Math.PI*2,{motion:1});
    assert.ok(a.feet[0].contact&&b.feet[0].contact);
    const travel=CHARACTER_CLIPS.walk.stride*(f1-f0);
    assert.ok(Math.abs(a.feet[0].point[2]-(b.feet[0].point[2]+travel))<.0001);
});

test('blending to idle settles a raised foot rather than snapping on stop',()=>{
    const phase=.80*Math.PI*2,poses=[1,.75,.5,.25,0].map(motion=>sampleCharacterPose('move',phase,{motion}));
    for(let i=1;i<poses.length;i++)assert.ok(poses[i].feet[0].point[1]<=poses[i-1].feet[0].point[1]+.0001);
    assert.ok(Math.abs(poses.at(-1).feet[0].point[2])<.0001);
});

test('slope adaptation keeps the shoes above the ground and the mesh finite',()=>{
    for(const slope of [-.25,0,.25])for(let phase=0;phase<Math.PI*2;phase+=.25){
        const mesh=new Mesh();drawCharacter(mesh,0,0,.07,0,phase,false,'#bd9369','#707b4b',{mode:'move',motion:1,ground:(x,z)=>x*slope});
        assert.ok(mesh.data.every(Number.isFinite));
        for(let i=0;i<mesh.data.length;i+=11)assert.ok(mesh.data[i+1]>=mesh.data[i]*slope-.018);
    }
});

test('upper-body gestures preserve the stance and return to the base pose',()=>{
    const base=sampleCharacterPose('idle');
    for(const action of ['attack','steal','talk']){
        const during=sampleCharacterPose('idle',0,{action,actionT:.5}),after=sampleCharacterPose('idle',0,{action,actionT:1});
        assert.ok(joint(during,9)[2]>joint(base,9)[2]+.15);
        assert.ok(distance(joint(during,12),joint(base,12))<.005);
        assert.ok(distance(joint(after,9),joint(base,9))<1e-5);
    }
});

test('windsurfing stance places both feet on the board beneath the leaning rider',()=>{
    const p=sampleCharacterPose('surf');
    for(const foot of p.feet){
        const boardForward=-.49+foot.point[2],boardSide=-.28-foot.point[0];
        assert.ok(Math.abs(boardForward)<1.15);
        assert.ok(Math.abs(boardSide)<.27);
    }
});

test('the foot pose stays continuous at toe-off and when a gait loops',()=>{
    for(const run of [0,1]){
        const stance=run?CHARACTER_CLIPS.run.stance:CHARACTER_CLIPS.walk.stance;
        for(const boundary of [stance,1]){
            const a=sampleCharacterPose('move',(boundary-.000001)*Math.PI*2,{motion:1,run}),b=sampleCharacterPose('move',(boundary+.000001)*Math.PI*2,{motion:1,run});
            assert.ok(distance(a.feet[0].point,b.feet[0].point)<.0001);
            assert.ok(Math.abs(a.feet[0].pitch-b.feet[0].pitch)<.0001);
        }
    }
});
