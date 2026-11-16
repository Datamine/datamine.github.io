import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,rayTriangle,pose} from '../geometry.js';
import {drawPiercedWall} from '../wall-openings.js';
import {drawFacadeWindow} from '../windows.js';
import {GLASS_UV,isGlassVertex,meshGlassTriangles,createGlazingBatch} from '../glazing.js';

function hits(mesh,ray){const out=[];for(let v=0;v<mesh.data.length/11;v+=3){const i=v*11,t=rayTriangle(ray,...[0,11,22].map(k=>mesh.data.slice(i+k,i+k+3)));if(t!==null&&t<1)out.push({t,glass:isGlassVertex(mesh.data,v)});}return out;}
test('rectangular windows pierce the full wall thickness on all elevations and from both sides',()=>{
    for(const isX of [false,true])for(const far of [false,true]){
        const m=new Mesh(),out=far?-1:1,point=(u,y,t)=>isX?[out*t,y,u]:[u,y,out*t];
        drawPiercedWall(m,{isX,far,plane:0,along:0,y:0,w:2,h:2.5,depth:.12,color:'#aaa899',openings:[{x:.4,y:.7,w:.7,h:1.2}]});
        drawFacadeWindow(m,{isX,far,plane:0,along:.4,y:.7,w:.7,h:1.2,transparent:true,wallDepth:.12});
        assert.ok(m.data.every(Number.isFinite));
        for(const side of [1,-1]){
            const ray={origin:point(.4+.7*.23,.7+1.2*.28,side*.4),dir:point(0,0,-side)},found=hits(m,ray);assert.ok(found.some(h=>h.glass));assert.equal(found.some(h=>!h.glass),false);
            assert.ok(hits(m,{...ray,origin:point(.15,.8,side*.4)}).some(h=>!h.glass),'masonry beside the window disappeared');
        }
    }
});
test('arched openings retain solid spandrels while their upper panes remain open',()=>{
    const m=new Mesh();drawPiercedWall(m,{plane:0,along:-2,y:0,w:4,h:3,color:'#aaa899',depth:.12,openings:[{x:-.5,y:.5,w:1,h:1.7,arch:true,segments:20}]});
    for(const [x,y,blocked] of [[.17,.9,false],[.1,2.08,false],[.46,2.1,true],[.7,1.2,true]])for(const side of [-1,1])assert.equal(hits(m,{origin:[x,y,side*.4],dir:[0,0,-side]}).length>0,blocked,x+','+y);
});
test('the transparent batch excludes hidden walls, sorts rear panes first, and reuses its upload storage',()=>{
    const m=new Mesh();for(const z of [2,5,9])m.quad([0,0,z],[1,0,z],[1,1,z],[0,1,z],'#b9d2d5',{glass:.1});
    m.box(2,0,0,1,1,1,'#888888');const data=new Float32Array(m.data),gpu={glass:meshGlassTriangles(data)},batch=createGlazingBatch();assert.equal(gpu.glass.length,6);
    batch.begin();batch.collect(gpu,0,12);assert.equal(batch.triangles,4);const a=batch.data([0,0,0]);assert.equal(a[2],5);assert.ok(Math.abs(a[9]-GLASS_UV)<1e-6);assert.equal(a.length,4*33);
    batch.begin();batch.collect(gpu,12,6);const b=batch.data([0,0,0]);assert.equal(b[2],9);assert.equal(b.length,2*33);assert.equal(a.buffer,b.buffer);
    batch.begin();assert.equal(batch.data([0,0,0]).length,0);
});
test('rotated glazing preserves opacity, finite normals, and a material distinct from opaque scenery windows',()=>{
    const m=new Mesh();pose(m,3,1,7,1.2,()=>drawFacadeWindow(m,{plane:0,along:0,y:0,w:.5,h:.8,transparent:true}));
    assert.ok(m.data.every(Number.isFinite));const glass=meshGlassTriangles(m.data);assert.equal(glass.length,2);for(const t of glass)assert.equal(t.data[10],.1);
    const scenery=new Mesh();drawFacadeWindow(scenery,{plane:0,along:0,y:0,w:.5,h:.8});assert.equal(meshGlassTriangles(scenery.data).length,0);
});


test('elliptical attic windows preserve their rounded masonry boundary above and below',()=>{
    const m=new Mesh();drawPiercedWall(m,{plane:0,along:-2,y:0,w:4,h:3,depth:.12,color:'#aaa899',openings:[{x:-.6,y:.9,w:1.2,h:1.04,ellipse:true,segments:24}]});
    for(const [x,y,blocked] of [[.1,1.1,false],[.1,1.8,false],[.55,1,true],[.55,1.85,true]])for(const side of [-1,1])assert.equal(hits(m,{origin:[x,y,side*.4],dir:[0,0,-side]}).length>0,blocked,x+','+y);
});
