import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,rayTriangle} from '../geometry.js';
import {createSouthernTerrain} from '../southern-terrain.js';
import {SOUTHERN_BOUNDS,SOUTHERN_HOUSING,SOUTHERN_TRAILS,SOUTHERN_LEVEL_PADS} from '../southern-layout.js';
import {SOUTHERN_ROADS,AIRSHIP_TERMINAL,STARTUP_HQ,createAirship,airportRoadDistance,airportSurfaceTypeAt,drawAirportRoad} from '../airship.js';
import {RAIL_PIT,TAX_HQ,drawSouthernDistrict,drawRailPit} from '../southern-district.js';
import {createHousing} from '../housing.js';
import {airportRoadTiles} from '../airship.js';
import {buildNightlife,NIGHTLIFE} from '../nightlife.js';
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
    const t=makeTerrain(),m=new Mesh();t.drawLand(m);drawSouthernDistrict(m,new Map(),{terrain:t});assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<65000);
    const cases=[[38.13,114.72],[52.8,139.1],[63.2,103.8],[TAX_HQ.x,143],[70.2,138.3]];
    for(const [x,z] of cases){const height=t.height(x,z),ray={origin:[x,25,z],dir:[0,-1,0]},hit=t.raycast(ray);assert.ok(hit);assert.ok(Math.abs(hit.point[1]-height)<1e-8);
        let closest=Infinity;for(let i=0;i<m.data.length;i+=33){const distance=rayTriangle(ray,...[0,11,22].map(j=>m.data.slice(i+j,i+j+3)));if(distance!==null)closest=Math.min(closest,distance);}assert.ok(Math.abs(25-closest-height)<1e-7,'walking, picking, and rendered ground must agree');}
});

test('rail pit walls seal against the graded land, including every triangle-diagonal crossing',()=>{
    const t=makeTerrain(),p=RAIL_PIT,mesh=new Mesh(),site=drawRailPit(mesh,new Map(),t),rim=t.pitRim();
    assert.ok(t.height(p.west,p.south)>AIRSHIP_TERMINAL.base+1,'exercise the raised southern rim that exposed the sea');
    assert.ok(mesh.data.every(Number.isFinite));assert.ok(site.hi[1]>t.height(p.west,p.south));
    for(const [i,a] of rim.entries()){
        const b=rim[(i+1)%rim.length];
        for(const f of [.13,.37,.63,.87]){
            const x=a[0]+(b[0]-a[0])*f,z=a[2]+(b[2]-a[2])*f,wall=a[1]+(b[1]-a[1])*f;
            assert.ok(Math.abs(wall-t.height(x,z))<1e-9,'wall top separates from the land at '+x+','+z);
        }
    }
    // Horizontal sight lines below the rim must meet dirt at the excavation
    // boundary, rather than pass through a gap to the background ocean.
    const cx=(p.west+p.east)/2,cz=(p.north+p.south)/2;
    for(const [a,b] of [[[p.west,p.north],[p.east,p.north]],[[p.east,p.north],[p.east,p.south]],[[p.east,p.south],[p.west,p.south]],[[p.west,p.south],[p.west,p.north]]])for(let f=.07;f<1;f+=.13){
        const x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f,d=Math.hypot(x-cx,z-cz);
        for(const fraction of [.25,.75,.98]){
            const y=p.floor+(t.height(x,z)-p.floor)*fraction,ray={origin:[cx,y,cz],dir:[(x-cx)/d,0,(z-cz)/d]};let closest=Infinity;
            for(let i=0;i<mesh.data.length;i+=33){const hit=rayTriangle(ray,...[0,11,22].map(j=>mesh.data.slice(i+j,i+j+3)));if(hit!==null)closest=Math.min(closest,hit);}
            assert.ok(Math.abs(closest-d)<1e-7,'the pit has an open wall at '+x+','+z+' height '+y);
            const pick=t.raycast(ray);assert.ok(pick);assert.ok(Math.abs(pick.distance-d)<1e-7,'terrain picking must agree with the visible wall');
        }
    }
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
    const t=makeTerrain(),m=new Mesh();drawAirportRoad(m,96,(x,z)=>t.contains(x,z)?t.height(x,z):1.15);assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<50000);
    let rise=0;
    for(const r of SOUTHERN_ROADS)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);let previous=t.height(...a);for(let j=1;j<=count;j++){const x=a[0]+(b[0]-a[0])*j/count,z=a[1]+(b[1]-a[1])*j/count,height=t.height(x,z);rise=Math.max(rise,Math.abs(height-previous));previous=height;}}
    assert.ok(rise<.22,'road grading has an abrupt step: '+rise);
});

test('Nightlife moved north into the city with a grounded foundation and two indoor patrons',()=>{
    const t=makeTerrain(),m=new Mesh(),neighborhood=populateSouthernNeighborhood({mesh:m,terrain:t,makeTownhomeRow:()=>({homes:0}),tree:()=>{},bench:()=>{},roadDistance:airportRoadDistance,signs:new Map()});
    assert.ok(!neighborhood.sights.some(s=>s.id==='nightlife'));assert.equal(neighborhood.diners.length,0);
    const ground=(x,z)=>2+(z-NIGHTLIFE.z)*.4,club=buildNightlife(m,{height:ground,naturalHeight:ground,cutPlot(){}}),cafe=club.sight;
    assert.ok(m.data.every(Number.isFinite));assert.equal(cafe.id,'nightlife');assert.equal(club.diners.length,2);assert.ok(club.diners.every(n=>n.club&&Math.abs(n.z-NIGHTLIFE.z)<1));assert.ok(cafe.lo[1]<=ground(59.4,89.3));
    const y=ground(59.4,89.3)+.3,ray={origin:[59.4,y,88],dir:[0,0,1]};let hit=false;
    for(let i=cafe.start;i<cafe.start+cafe.count;i+=33){const distance=rayTriangle(ray,...[0,11,22].map(j=>m.data.slice(i+j,i+j+3)));if(distance!==null&&distance<2){hit=true;break;}}
    assert.ok(hit,'the downhill wall must reach the ground instead of floating above it');
});
