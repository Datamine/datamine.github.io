import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from '../geometry.js';
import {createSouthernTerrain} from '../southern-terrain.js';
import {SOUTHERN_ROADS} from '../airship.js';
import {SOUTHERN_LEVEL_PADS,TIMES_SQUARE} from '../southern-layout.js';
import {SQUARE_DIGSITE,SQUARE_CRANES,squareConstructionPolygons} from '../square-construction-layout.js';
import {drawSquareConstruction,drawTowerCrane} from '../square-construction.js';
import {TIMES_SQUARE_PROPS} from '../times-square-layout.js';

test('two detailed cranes and the relocated excavator have bounded finite native geometry',()=>{
    const terrain=createSouthernTerrain({roads:SOUTHERN_ROADS,pads:SOUTHERN_LEVEL_PADS}),m=new Mesh(),p=SQUARE_DIGSITE.pit,before=terrain.height(p.x,p.z),site=drawSquareConstruction(m,new Map(),terrain);
    assert.equal(SQUARE_CRANES.length,2);assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<14000);assert.ok(site.hi[1]-site.base>12);
    assert.ok(SQUARE_DIGSITE.east<TIMES_SQUARE.west,'the main worksite is outside the square');assert.ok(!TIMES_SQUARE_PROPS.some(p=>p.id==='excavator'));
    assert.ok(terrain.height(p.x,p.z)<before-.5);
    const hit=terrain.raycast({origin:[p.x,30,p.z],dir:[0,-1,0]});assert.ok(hit);assert.ok(Math.abs(hit.point[1]-terrain.height(p.x,p.z))<1e-7,'the excavation must retain a closed, pickable terrain floor');
    assert.deepEqual(site.navigationPolygons,squareConstructionPolygons());
    for(const crane of SQUARE_CRANES){const mesh=new Mesh();drawTowerCrane(mesh,crane,terrain.height(crane.x,crane.z));assert.ok(mesh.data.length/33>1000);assert.ok(mesh.data.length/33<6000);}
});
