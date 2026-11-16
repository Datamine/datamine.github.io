import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from '../geometry.js';
import {createFerrari} from '../ferrari.js';
import {createRegionalRoad} from '../regional-road.js';
import {createEsotericCampus} from '../alien-sites.js';

const campus=createEsotericCampus(createFerrari(createRegionalRoad()));
test('Berkeley has a sculpted institute, campanile, library, reading hall and a bounded mesh',()=>{
    const m=new Mesh(),site=campus.draw(m,new Map());
    assert.equal(campus.layout.buildings.length,4);assert.ok(campus.layout.trees.length>=6);
    assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33>18000&&m.data.length/33<35000);
    assert.ok(site.hi[1]-site.base>8);assert.ok(site.hi[0]-site.lo[0]>15);assert.equal(site.kind,'esoteric-institute');
    assert.ok(campus.mapFeatures.some(f=>f.color==='#879c78'),'the minimap shows the campus lawns');
});
test('the campus adjacency graph connects every lawn and path around solid buildings and props',()=>{
    const targets=[[-7,6],[7,5],[-5,14],[5,14],[0,14.8],[0,2.65],[0,7.25],[.6,8.15],[0,5.7]];
    for(const [u,v] of targets){const p=campus.point(u,v),to={x:p.x-.5,y:p.z-.5};
        for(const [from,end] of [[campus.gate,to],[to,campus.gate]]){
            const path=campus.path(from,end,()=>null);assert.ok(path?.length);let previous=from;
            for(const next of path){assert.ok(campus.segment(previous,next));previous=next;}
            assert.ok(Math.hypot(previous.x-end.x,previous.y-end.y)<1e-7);
        }
        const hit=campus.raycast({origin:[p.x,campus.base+10,p.z],dir:[0,-1,0]});assert.ok(hit);assert.ok(Math.abs(hit.point[1]-campus.ground())<1e-8);
    }
    for(const building of campus.layout.buildings){const [x,z,xx,zz]=building.rect,p=campus.point((x+xx)/2,(z+zz)/2);assert.equal(campus.contains(p.x,p.z),building.id==='institute','only the institute has an open indoor aisle');}
    const gate=campus.graph.regionAt(9,.25),regions=new Set([...campus.graph.regions].filter(n=>n>=0));assert.deepEqual([...regions],[gate],'there must be no stranded courtyard pockets');
});
