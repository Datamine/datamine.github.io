import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,rayTriangle} from '../geometry.js';
import {createSouthernTerrain} from '../southern-terrain.js';
import {SOUTHERN_BOUNDS,SOUTHERN_HOUSING,SOUTHERN_TRAILS,SOUTHERN_LEVEL_PADS} from '../southern-layout.js';
import {SOUTHERN_ROADS,AIRSHIP_TERMINAL,STARTUP_HQ,createAirship,airportRoadDistance,airportSurfaceTypeAt,drawAirportRoad} from '../airship.js';
import {RAIL_PIT,TAX_HQ,drawSouthernDistrict} from '../southern-district.js';
import {createHousing} from '../housing.js';
import {airportRoadTiles} from '../airship.js';
import {populateSouthernNeighborhood} from '../southern-neighborhood.js';

const makeTerrain=edgeHeight=>createSouthernTerrain({roads:SOUTHERN_ROADS,pit:RAIL_PIT,pads:SOUTHERN_LEVEL_PADS,edgeHeight});

test('the southern peninsula has rolling hills, a continuous city seam, and level facilities',()=>{
    const edge=x=>1.15+Math.sin(x*.1)*.2,t=makeTerrain(edge),b=SOUTHERN_BOUNDS;let low=Infinity,high=-Infinity;
    for(let z=b.north;z<=b.south;z+=2)for(let x=b.west;x<=b.east;x+=2){const h=t.height(x,z);assert.ok(Number.isFinite(h));low=Math.min(low,h);high=Math.max(high,h);}
    assert.ok(high-low>7&&high<13);for(let x=b.west;x<=b.east;x+=.5)assert.ok(Math.abs(t.height(x,b.north)-edge(x))<1e-8);
    for(const [x,z] of [[81.5,109.5],[83.7,109.5],[83.8,148],[TAX_HQ.x,130.5],[STARTUP_HQ.x,131.8]])assert.ok(Math.abs(t.height(x,z)-1.15)<1e-8,'facility pads must remain level');
    assert.equal(t.height((RAIL_PIT.west+RAIL_PIT.east)/2,143),RAIL_PIT.floor);
});

test('southern picking follows the actual textured terrain and keeps the rail pit open',()=>{
    const t=makeTerrain(),m=new Mesh();t.drawLand(m);drawSouthernDistrict(m,new Map());assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<65000);
    const cases=[[38.13,114.72],[52.8,139.1],[63.2,103.8],[TAX_HQ.x,143],[70.2,138.3]];
    for(const [x,z] of cases){const height=t.height(x,z),ray={origin:[x,25,z],dir:[0,-1,0]},hit=t.raycast(ray);assert.ok(hit);assert.ok(Math.abs(hit.point[1]-height)<1e-8);
        let closest=Infinity;for(let i=0;i<m.data.length;i+=33){const distance=rayTriangle(ray,...[0,11,22].map(j=>m.data.slice(i+j,i+j+3)));if(distance!==null)closest=Math.min(closest,distance);}assert.ok(Math.abs(25-closest-height)<1e-7,'walking, picking, and rendered ground must agree');}
});

test('private hillside plot cuts do not change the street or natural reference heights',()=>{
    const t=makeTerrain(),p=SOUTHERN_HOUSING[2],samples=SOUTHERN_ROADS.flatMap(r=>r.points).filter(([x,z])=>t.contains(x,z)).map(([x,z])=>({x,z,h:t.height(x,z)})),original=t.naturalHeight(p.x,p.z),floor=original-.3;
    t.cutPlot({cx:p.x,cz:p.z,w:p.w,d:p.d,angle:p.rotation,height:floor,onlyLower:true});assert.ok(t.height(p.x,p.z)<=floor+1e-7);assert.equal(t.naturalHeight(p.x,p.z),original);
    for(const q of samples)assert.equal(t.height(q.x,q.z),q.h,'a private foundation must not move a public curb');
});

test('all authored hillside homes preserve the paved road and trail vertices',()=>{
    const t=makeTerrain(),m=new Mesh(),samples=new Map();
    for(const {x,z,step,tile} of airportRoadTiles()){
        const patches=tile.patches||[{type:tile.type,polygon:[[0,0],[1,0],[1,1],[0,1]]}];
        for(const patch of patches)if(['road','path','sidewalk'].includes(patch.type))for(const p of patch.polygon){const xx=x+p[0]*step,zz=z+p[1]*step;if(t.contains(xx,zz))samples.set(xx+','+zz,{x:xx,z:zz,h:t.height(xx,zz)});}
    }
    const housing=createHousing({MAP_SCALE:1.5,terrainHeight:t.height,naturalHeight:t.naturalHeight,cutHousePlot:t.cutPlot,getSceneMesh:()=>m,registerObject:(mesh,start,info)=>info,rectangle:()=>[],sashWindow:()=>{}});
    for(const [i,p] of SOUTHERN_HOUSING.entries())housing.makeTownhomeRow(p.x-p.w/2,p.z-p.d/2,p.w,p.d,2,.17+i*.083,p.rotation,i%3===2?'victorian':'west');
    assert.ok(samples.size>5000);for(const p of samples.values())assert.ok(Math.abs(t.height(p.x,p.z)-p.h)<1e-8,'a house excavation moved public paving at '+p.x+','+p.z);
});

test('all new blocks and the ridge trail connect to the existing airport street network',()=>{
    const a=createAirship(),from=AIRSHIP_TERMINAL.boarding;
    const destinations=[[62.5,99.5],[56.5,105.5],[62.5,117.5],[74.6,126.5],...SOUTHERN_TRAILS[0].points];
    for(const [x,z] of destinations){const to={x:x-.5,y:z-.5},route=a.path(from,to,()=>null);assert.ok(route?.length,'unreachable southern street or trail '+x+','+z);let previous=from;for(const p of route){assert.ok(a.segment(previous,p));previous=p;}}
    assert.equal(airportSurfaceTypeAt(43,114),'path');assert.equal(airportSurfaceTypeAt(62.5,111),'road');
    for(const p of SOUTHERN_HOUSING){const c=Math.cos(p.rotation),s=Math.sin(p.rotation);for(const u of [-p.w/2,0,p.w/2])for(const v of [-p.d/2,0,p.d/2])assert.ok(airportRoadDistance(p.x+u*c-v*s,p.z+u*s+v*c)>.15,'a house plot overlaps a road or curb');}
});

test('the southern road mesh follows the same graded height field and has no steep steps',()=>{
    const t=makeTerrain(),m=new Mesh();drawAirportRoad(m,96,(x,z)=>t.contains(x,z)?t.height(x,z):1.15);assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<30000);
    let rise=0;
    for(const r of SOUTHERN_ROADS)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);let previous=t.height(...a);for(let j=1;j<=count;j++){const x=a[0]+(b[0]-a[0])*j/count,z=a[1]+(b[1]-a[1])*j/count,height=t.height(x,z);rise=Math.max(rise,Math.abs(height-previous));previous=height;}}
    assert.ok(rise<.22,'road grading has an abrupt step: '+rise);
});

test('the hillside café has a grounded lower façade and occupied outdoor seating',()=>{
    const t=makeTerrain(),m=new Mesh(),neighborhood=populateSouthernNeighborhood({mesh:m,terrain:t,makeTownhomeRow:()=>({homes:0}),tree:()=>{},bench:()=>{},roadDistance:airportRoadDistance,signs:new Map()}),cafe=neighborhood.sights[0];
    assert.ok(m.data.every(Number.isFinite));assert.equal(neighborhood.diners.length,2);assert.ok(cafe.lo[1]<=t.naturalHeight(59.4,101.3));
    const y=t.naturalHeight(59.4,101.3)+.3,ray={origin:[59.4,y,100],dir:[0,0,1]};let hit=false;
    for(let i=cafe.start;i<cafe.start+cafe.count;i+=33){const distance=rayTriangle(ray,...[0,11,22].map(j=>m.data.slice(i+j,i+j+3)));if(distance!==null&&distance<2){hit=true;break;}}
    assert.ok(hit,'the downhill wall must reach the ground instead of floating above it');
});
