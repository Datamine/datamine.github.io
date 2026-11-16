import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from '../geometry.js';
import {AIRSHIP_TERMINAL,AIRPORT_TERMINAL_BUILDING,AIRSHIP_ACCESS,AIRPORT_RUNWAY,STARTUP_HQ,SOUTHERN_ROAD_END,airportGate,airportRoadDistance,airportRoadTiles,createAirship,drawAirportRoad,drawAirship,drawAirshipTerminal} from '../airship.js';
import {AIRSHIP_BASKET} from '../airship-basket.js';
import {buildSurfaceTile} from '../tiles.js';
import {WORLD_SIZE,STREET_LAYOUT_SIZE} from '../geography.js';

const boarding=AIRSHIP_TERMINAL.boarding;
function advance(airship,until){for(let i=0;i<6000;i++){const event=airship.update(1/60);if(until(event))return;}assert.fail('flight transition did not complete');}

test('the southern apron connects to the city in both directions without a teleport',()=>{
    const a=createAirship(),city={x:60,y:80};a.setGate(airportGate());
    const cityPath=(to,from)=>[{...to}];
    const out=a.path(city,boarding,cityPath);assert.ok(out?.length>1);assert.ok(a.gates.some(g=>g.x===out[0].x&&g.y===out[0].y));assert.deepEqual(out.at(-1),boarding);
    let previous=out[0];for(const p of out.slice(1)){assert.ok(a.segment(previous,p));previous=p;}
    const back=a.path(boarding,city,cityPath);assert.deepEqual(back.at(-1),city);assert.ok(back.some(p=>a.gates.some(g=>p.x===g.x&&p.y===g.y)));
    assert.equal(a.path(boarding,{x:100,y:110},()=>null),null,'unreachable ground outside the terminal stays blocked');
});

test('the airport road continues Third Street and reaches the apron without the old walkway',()=>{
    const a=createAirship(),gate=airportGate(),apron={x:AIRPORT_RUNWAY.x-2.1,y:109.5};
    assert.deepEqual(AIRSHIP_ACCESS.points[0],[70.5*WORLD_SIZE/STREET_LAYOUT_SIZE,77.5*WORLD_SIZE/STREET_LAYOUT_SIZE]);
    assert.ok(a.contains(gate.x+.5,gate.y+.5));
    const bends=AIRSHIP_ACCESS.points.slice(1).map(([x,y])=>({x:x-.5,y:y-.5}));
    for(let i=1;i<bends.length;i++)assert.ok(a.segment(bends[i-1],bends[i]),'the route must follow each road bend');
    assert.ok(a.segment({x:airportGate().x,y:109.5},apron),'the road opens directly onto the apron west of the parked jets');
    assert.ok(a.path(boarding,{x:STARTUP_HQ.x-.5,y:131.5},()=>null)?.length,'the street continues beyond the airport to the startup house');
    assert.ok(AIRSHIP_ACCESS.points.every(p=>p[0]===AIRSHIP_ACCESS.points[0][0]),'the road is straight south');
    assert.ok(AIRPORT_RUNWAY.z+AIRPORT_RUNWAY.depth>145,'the runway extends south from the center of the airport');
    assert.ok(Math.abs(AIRPORT_RUNWAY.x+AIRPORT_RUNWAY.width/2-87.9)<1,'the runway aligns below the airplanes');
    assert.ok(a.contains(AIRPORT_RUNWAY.x+1,148),'the continuous apron remains walkable to the southern threshold');
    assert.equal(a.contains(92,126),false,'the terminal east of the runway blocks walking through its walls');
    assert.equal(a.contains(65.875,99.5),true,'the new Bayview street connects the southern neighborhood');
    assert.equal(a.contains(65.875,101.5),false,'private lots beside the street remain blocked');
    assert.equal(a.contains(80,102),true,'open grass beside the airport is walkable');
    assert.equal(a.segment(gate,apron),true,'walking may cut across unobstructed dry ground');
});

test('the relocated terminal, entrance and airship mooring use the eastern building and connected clear ground',()=>{
    const a=createAirship(),b=AIRPORT_TERMINAL_BUILDING,s=AIRSHIP_TERMINAL;
    assert.ok(b.x>AIRPORT_RUNWAY.x+AIRPORT_RUNWAY.width);
    assert.ok(s.x>b.x&&s.x<b.x+b.w&&s.z>b.z&&s.z<b.z+b.d);
    assert.ok(a.contains(s.entry.x+.5,s.entry.y+.5));
    for(const [from,to] of [[{x:AIRPORT_RUNWAY.x-2.1,y:109.5},s.entry],[s.entry,boarding],[boarding,s.entry]]){
        const path=a.path(from,to,()=>null);assert.ok(path?.length);let previous=from;
        for(const next of path){assert.ok(a.segment(previous,next),'the route must avoid jets and terminal walls');previous=next;}
        assert.deepEqual(path.at(-1),to);
    }
    for(const x of [AIRSHIP_BASKET.left,AIRSHIP_BASKET.right])for(const z of [AIRSHIP_BASKET.north,AIRSHIP_BASKET.south])assert.ok(a.contains(a.home.x+z,a.home.z-x),'the whole parked basket must clear buildings, jets and water');
    const m=new Mesh(),model=drawAirshipTerminal(m);assert.ok(model.lo[0]>AIRPORT_RUNWAY.x+AIRPORT_RUNWAY.width);
    for(let i=0;i<m.data.length;i+=11)if(m.data[i]>75.6&&m.data[i]<81&&m.data[i+2]>104.9&&m.data[i+2]<111.1)assert.ok(m.data[i+1]<s.base+.5,'the old western terminal has been removed');
});

test('airport road and curb tiles exactly match the city edge, with no overlapping materials',()=>{
    const tiles=airportRoadTiles(),seam=tiles.filter(p=>p.z===WORLD_SIZE);assert.ok(seam.length>3);
    for(const {x,z,step,tile} of seam){
        const values=[[x,z-step],[x+step,z-step],[x+step,z],[x,z]].map(p=>[airportRoadDistance(...p),100]);
        assert.deepEqual(tile.edges[0],buildSurfaceTile('grass',values).edges[2]);
    }
    for(const {tile} of tiles)assert.ok(Math.abs(Object.values(tile.areas).reduce((a,b)=>a+b,0)-1)<1e-8);
    const mesh=new Mesh();drawAirportRoad(mesh);assert.ok(mesh.data.length>0);assert.ok(mesh.data.length/33<42500,'includes the coastal garden lane and orchard loop');
    for(let i=0;i<mesh.data.length;i+=11){assert.ok(mesh.data[i+2]>=WORLD_SIZE);assert.ok(mesh.data[i+2]<=SOUTHERN_ROAD_END+1e-8);}
});

test('renting ascends smoothly, then flies at a fixed height above the skyline',()=>{
    const a=createAirship();a.setCruiseHeight(27);assert.ok(a.board(boarding));assert.ok(!a.board(boarding));
    let previous={...a.state.position};
    advance(a,event=>{const p=a.state.position;assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)<=3/60+1e-7);previous={...p};return event==='cruising';});
    assert.equal(a.state.position.y,27);assert.equal(a.state.phase,'flying');
    assert.ok(a.flyTo(20,-30));advance(a,event=>event==='arrived');
    assert.deepEqual(a.state.position,{x:20,y:27,z:-30});assert.equal(a.state.speed,0);
    assert.ok(a.flyTo(-1000,1000),'flight is not confined to the walking grid');
    const target={...a.state.target};assert.ok(!a.flyTo(NaN,Infinity));assert.deepEqual(a.state.target,target);
});

test('returning flies home before descending and leaves a reusable rental',()=>{
    const a=createAirship();a.board(boarding);advance(a,e=>e==='cruising');a.flyTo(40,60);advance(a,e=>e==='arrived');
    a.returnHome();assert.equal(a.state.phase,'returning');const altitude=a.state.position.y;
    advance(a,()=>{if(a.state.phase==='descending')return true;assert.equal(a.state.position.y,altitude);return false;});
    assert.equal(a.state.position.x,a.home.x);assert.equal(a.state.position.z,a.home.z);
    advance(a,e=>e==='landed');assert.ok(!a.state.active);assert.equal(a.state.position,null);assert.equal(a.cancel(),null);
    assert.ok(a.board(boarding));assert.equal(a.state.phase,'ascending');
});

test('a mid-ascent return reverses in place and cancellation clears flight state',()=>{
    const a=createAirship();a.board(boarding);for(let i=0;i<90;i++)a.update(1/60);
    const before={...a.state.position};a.returnHome();assert.deepEqual(a.state.position,before);assert.equal(a.state.phase,'descending');
    advance(a,e=>e==='landed');a.board(boarding);assert.deepEqual(a.cancel(),boarding);assert.equal(a.state.target,null);assert.equal(a.state.position,null);assert.ok(!a.state.active);
});

test('stopping a return flight restores the flight controls without changing altitude',()=>{
    const a=createAirship();a.board(boarding);advance(a,e=>e==='cruising');a.flyTo(40,60);advance(a,e=>e==='arrived');a.returnHome();a.update(1);
    const before={...a.state.position};assert.ok(a.stop());assert.deepEqual(a.state.position,before);assert.equal(a.state.phase,'flying');assert.equal(a.state.target,null);
    assert.ok(a.flyTo(45,65));advance(a,e=>e==='arrived');assert.equal(a.state.position.y,before.y);
});

test('walking around the terminal apron never passes through the parked jets',()=>{
    const a=createAirship();assert.ok(!a.contains(88.3,105.9));assert.ok(!a.contains(87.5,114.3));
    for(const destination of [{x:91.7,y:115.5},{x:91.7,y:105},{x:82.2,y:116.5}]){
        const path=a.path(boarding,destination,()=>null);assert.ok(path?.length);let previous=boarding;
        for(const point of path){assert.ok(a.segment(previous,point));previous=point;}
        assert.deepEqual(path.at(-1),destination);
    }
});

test('airship and private terminal models have valid materials and bounded mesh sizes',()=>{
    const ship=new Mesh();drawAirship(ship,{x:0,y:0,z:0},0,0,true);
    const terminal=new Mesh();drawAirshipTerminal(terminal);
    for(const [mesh,limit] of [[ship,12000],[terminal,53000]]){assert.ok(mesh.data.every(Number.isFinite));assert.ok(mesh.data.length/33>500);assert.ok(mesh.data.length/33<limit);}
    const envelope=[],deck=[];
    for(let i=0;i<ship.data.length;i+=11){
        if(ship.data[i+9]===-1&&ship.data[i+10]===-8)envelope.push(ship.data[i]);
        if(Math.abs(ship.data[i+1]-.05)<1e-8&&Math.abs(ship.data[i+4]-1)<1e-8)deck.push(ship.data[i]);
    }
    const center=values=>(Math.min(...values)+Math.max(...values))/2;
    assert.ok(envelope.length&&deck.length);assert.ok(Math.abs(center(envelope)-center(deck))<.015,'the gondola must sit beneath the center of the envelope');
    const again=new Mesh();drawAirship(again,{x:0,y:0,z:0},0,0,true);assert.deepEqual(ship.data,again.data,'reusing the mesh must not mutate the cached model');
});
