import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,pose,rayTriangle} from '../geometry.js';
import {makeEstateHouse} from '../estate-architecture.js';
import {ESTATE_STYLES,estatePoint,estateRectangle,planEstate} from '../estate-design.js';
import {inEstateDistrict} from '../estate-layout.js';
import {SOUTHERN_HOUSING,SOUTHERN_LEVEL_PADS} from '../southern-layout.js';
import {SOUTHERN_ROADS,airportRoadDistance} from '../airship.js';
import {createSouthernTerrain} from '../southern-terrain.js';
import {RAIL_PIT} from '../southern-district.js';
import {createEstateResidents,drawEstateResidents} from '../estate-life.js';
import {describeCharacter} from '../descriptions.js';
import {navigationObstacles} from '../navigation.js';
const plots=SOUTHERN_HOUSING.filter(p=>inEstateDistrict(p.x,p.z));
const terrain=()=>createSouthernTerrain({roads:SOUTHERN_ROADS,pit:RAIL_PIT,pads:SOUTHERN_LEVEL_PADS});

test('estate massing stays within its reserved, correctly rotated parcel and leaves every road clear',()=>{
    const t=terrain(),mesh=new Mesh(),samples=SOUTHERN_ROADS.flatMap(r=>r.points).map(([x,z])=>[x,z,t.height(x,z)]),houses=plots.map(p=>makeEstateHouse(mesh,p,t));
    assert.deepEqual(new Set(houses.map(h=>h.estateStyle)),new Set(ESTATE_STYLES));
    assert.ok(houses.length>=12);assert.equal(houses.filter(h=>h.pool).length,3);
    for(const h of houses){
        assert.ok(h.count/3<7000,'each estate must stay inexpensive to render');
        const a=h.rotation,c=Math.cos(a),s=Math.sin(a),p=h.plot;
        for(let v=h.start*11;v<(h.start+h.count)*11;v+=11){
            const dx=mesh.data[v]-p.x,dz=mesh.data[v+2]-p.z;
            assert.ok(Math.abs(dx*c+dz*s)<=p.w/2+1e-7,'geometry leaves lot in local X');
            assert.ok(Math.abs(-dx*s+dz*c)<=p.d/2+1e-7,'geometry leaves lot in local Z');
        }
        for(const o of navigationObstacles([h]))for(const [x,z] of o.polygon)assert.ok(airportRoadDistance(x,z)>.15,'collision crosses public paving');
        assert.deepEqual(h.footprint,estateRectangle(p,{x:-p.w/2,z:-p.d/2,w:p.w,d:p.d}));
        if(h.estateStyle==='eichler')assert.equal(h.storeys,1);
    }
    for(const [x,z,height] of samples)assert.equal(t.height(x,z),height,'a private estate moved the road');
    assert.ok(mesh.data.length/33<60000,'the complete estate district exceeds its static geometry budget');
    assert.ok(mesh.data.every(Number.isFinite));
});

test('pools require generous parcels, have their own collision, and reserve a separate house volume',()=>{
    for(const style of ESTATE_STYLES){
        assert.equal(planEstate({w:3,d:2.5,style}).pool,null);
        const p=planEstate({w:6.5,d:3,style}),pool=p.pool;
        assert.ok(pool.x+pool.w<p.house.x-.2,'pool overlaps the house');
        assert.ok(pool.d>=1.5&&pool.w>=1.5,'pool too small for a swimmer');
        const plot={x:60,z:122,w:6.5,d:3,rotation:Math.PI/2,seed:.5},h=makeEstateHouse(new Mesh(),plot,terrain());
        assert.equal(navigationObstacles([h]).length,2,'building and water must be blocked separately, leaving the yard open');
    }
});

test('posed pools retain their shallow-water shader and have no opaque coping over the water',()=>{
    for(const rotation of [-Math.PI/2,0,Math.PI/2,Math.PI]){
        const mesh=new Mesh();pose(mesh,0,0,0,rotation,()=>mesh.quad([0,0,0],[0,0,1],[1,0,1],[1,0,0],'#8bc7c1',{water:4}));
        for(let i=0;i<mesh.data.length;i+=11)assert.equal(mesh.data[i+10],4,'material rotation changed the water kind');
    }
    for(const p of plots.filter(p=>p.w>=5.5)){
        const mesh=new Mesh(),h=makeEstateHouse(mesh,p,terrain()),ray={origin:[h.pool.center[0],h.base+6,h.pool.center[1]],dir:[0,-1,0]},hits=[];
        for(let i=0;i<mesh.data.length;i+=33){const hit=rayTriangle(ray,...[0,11,22].map(j=>mesh.data.slice(i+j,i+j+3)));if(hit!==null)hits.push({y:ray.origin[1]-hit,kind:mesh.data[i+9]});}
        const surface=hits.sort((a,b)=>b.y-a.y)[0];assert.ok(Math.abs(surface.y-h.pool.base)<.01);assert.equal(surface.kind,-1.75);
        assert.ok(!hits.some(hit=>hit.kind!==-1.75&&Math.abs(hit.y-h.pool.base)<.005),'solid paving competes with the pool surface');
    }
});

test('pool residents stay in the water, use the human rig, animate nearby and cull at distance',()=>{
    const houses=plots.map(p=>makeEstateHouse(new Mesh(),p,terrain())),residents=createEstateResidents(houses);
    assert.equal(residents.length,3);
    for(const [i,npc] of residents.entries()){
        const house=houses.filter(h=>h.pool)[i],edge=estatePoint(house.plot,house.pool.x+house.pool.w/2,house.d/2+.38);
        assert.deepEqual(npc.approach,{x:edge[0]-.5,y:edge[1]-.5});
        assert.match(describeCharacter(npc),/pool|lunch|architecture/i);assert.ok(npc.poolTalk.length>30);
        const a=new Mesh(),b=new Mesh(),far=new Mesh();let targets=0;
        drawEstateResidents(a,[npc],1000,npc.origin,false,()=>targets++);
        drawEstateResidents(b,[npc],4000,npc.origin,false,()=>targets++);
        drawEstateResidents(far,[npc],4000,[0,0]);
        assert.equal(targets,2);assert.ok(a.data.length>0&&a.data.every(Number.isFinite));assert.notDeepEqual(a.data,b.data);assert.equal(far.data.length,0);
        assert.ok(Math.hypot(npc.x-npc.origin[0],npc.z-npc.origin[1])<.17,'swimmer left the pool');
    }
});
