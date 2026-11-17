import test from 'node:test';
import assert from 'node:assert/strict';
import {createCountryside} from '../countryside.js';
import {createRegionalRoad} from '../regional-road.js';
import {createFerrari} from '../ferrari.js';
import {createEsotericCampus} from '../alien-sites.js';
import {TAHOE_BOUNDS} from '../tahoe.js';
import {EAST_BAY_COAST_X} from '../geography.js';
const road=createRegionalRoad(),campus=createEsotericCampus(createFerrari(road)),grass=createCountryside({road,campus,parcels:[{x:400,z:-300,w:4,d:3,angle:.6}]});
test('regional lawns are walkable off the highway and solid parcels and water remain blocked',()=>{
 for(const [x,z] of [[180,-10],[350,-150],[720,-530],[1000,-730]]){assert.ok(grass.contains(x,z));const a={x:x-.5,y:z-.5},b={x:x+8,y:z-4};assert.ok(grass.segment(a,b));assert.deepEqual(grass.path(a,b,()=>null),[b]);}
 assert.equal(grass.contains(EAST_BAY_COAST_X-1,0),false);assert.equal(grass.contains(400,-300),false);
 for(const o of grass.obstacles)assert.equal(grass.contains(o.x,o.z),false);
});
test('native visibility adjacency routes around buildings and the Tahoe boundary without a huge empty grid',()=>{
 assert.ok(grass.nodes.length<60);const from={x:390,y:-300.5},to={x:410,y:-300.5},path=grass.path(from,to,()=>null);assert.ok(path.length>1);let previous=from;for(const next of path){assert.ok(grass.segment(previous,next));previous=next;}assert.deepEqual(previous,to);
 const b=TAHOE_BOUNDS,a={x:b.west-2,y:b.north+10},c={x:b.east+2,y:b.north+10},around=grass.path(a,c,()=>null);assert.ok(around);previous=a;for(const next of around){assert.ok(grass.segment(previous,next));previous=next;}
});
test('grass picking and foot heights match the actual regional backdrop triangles',()=>{
 for(const [x,z] of [[180,-10],[350,-150],[720,-530],[1000,-730],[TAHOE_BOUNDS.west-1,TAHOE_BOUNDS.north+7]]){const y=grass.height(x,z),hit=grass.raycast({origin:[x,y+30,z],dir:[0,-1,0]});assert.ok(hit);assert.ok(Math.abs(hit.point[1]-y)<1e-7);}
});
