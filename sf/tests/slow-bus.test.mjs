import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreetTraffic} from '../street-traffic.js';
import {createTrafficSignals,advanceSignalledVehicle,TRAFFIC_LIGHT_SECONDS} from '../traffic-signals.js';
import {createSlowBus,SLOW_BUS_DWELL,SLOW_BUS_DESCRIPTION} from '../slow-bus.js';
import {drawSlowBus,drawTrafficSignalPosts,drawTrafficSignalLights,BUS_SIGNS} from '../transit-models.js';
import {Mesh} from '../geometry.js';

const roads=[...[[0,'Market Street'],[5,'Middle Street'],[10,'Back Street']].map(([z,name])=>({kind:'road',name,points:[[-5,z],[15,z]]})),...[0,5,10].map(x=>({kind:'road',name:'Avenue '+x,points:[[x,-5],[x,15]]}))];
const network=()=>createStreetTraffic({routes:roads,isRoad:()=>true,ground:()=>0});
const build=(withSignals=true)=>{const net=network(),signals=createTrafficSignals({...net}),bus=createSlowBus({network:net,signals:withSignals?signals:null,walkingSpeed:4.6,ground:(x,z)=>x*.01,nightlife:{x:2,z:12,d:2}});return {net,signals,bus};};

test('the bus follows a connected road route behind Nightlife to the middle of a Market Street block',()=>{
    const {bus}=build();assert.equal(bus.route.originStreet,'Back Street');assert.equal(bus.route.destinationStreet,'Market Street');assert.equal(bus.route.points[0].z,10);assert.equal(bus.route.points.at(-1).z,0);
    for(const [i,p] of bus.route.points.slice(1).entries()){const a=bus.route.points[i];assert.ok(Math.abs(a.x-p.x)<1e-8||Math.abs(a.z-p.z)<1e-8,'no diagonal pedestrian shortcut');}
    assert.equal(bus.bus.sight.description,"the world's slowest bus");assert.equal(bus.bus.sight.description,SLOW_BUS_DESCRIPTION);
});
test('the moving bus travels at half walking speed and dwells at both termini',()=>{
    const {bus}=build(false);assert.equal(bus.bus.speed,2.3);bus.update(SLOW_BUS_DWELL);assert.equal(bus.bus.travel,0);bus.update(1);assert.ok(Math.abs(bus.bus.travel-2.3)<1e-8);
    let firstArrival=null;for(let i=0;i<3000;i++){const before={x:bus.bus.x,z:bus.bus.z,travel:bus.bus.travel};bus.update(.05);assert.ok(Math.hypot(bus.bus.x-before.x,bus.bus.z-before.z)<=.115+1e-7);assert.ok(bus.bus.travel-before.travel<=.115+1e-7);if(bus.bus.arrivals&&!firstArrival){firstArrival={x:bus.bus.x,z:bus.bus.z};const travel=bus.bus.travel;bus.update(5);assert.equal(bus.bus.travel,travel);assert.equal(bus.bus.destination,'Nightlife');}}
    assert.ok(firstArrival);assert.ok(bus.bus.arrivals>=3);assert.equal(bus.bus.base,bus.bus.x*.01+.045);
});
test('every true crossing has signal heads; phases stay fixed for exactly ten seconds',()=>{
    const {signals}=build();assert.equal(signals.junctions.length,9);assert.deepEqual(signals.missing,[]);assert.equal(TRAFFIC_LIGHT_SECONDS,10);
    for(const j of signals.junctions){assert.equal(j.fixtures.length,j.approaches.length);const p=signals.phase(j.id,0);for(const t of [.01,2,9,9.999])assert.equal(signals.phase(j.id,t),p);assert.notEqual(signals.phase(j.id,10),p);assert.equal(signals.phase(j.id,20),p);
        for(const a of j.approaches){const from={x:j.x+a.x,z:j.z+a.z};assert.equal(signals.green(j.id,from,0),a.phase===p);assert.equal(signals.green(j.id,from,10),a.phase!==p);}
    }
    const hung=createTrafficSignals({...network(),canPlace:()=>false});assert.ok(hung.fixtures.every(f=>f.overhead));assert.deepEqual(hung.missing,[],'narrow corners use overhead heads instead of losing signals');
});
test('vehicles wait before red lights, resume on the exact phase change, and clear the whole intersection',()=>{
    const {net,signals}=build(),j=signals.junctions[0],a=j.approaches.find(a=>signals.green(j.id,net.nodes[a.next],10)),from=a.next,length=Math.hypot(net.nodes[from].x-j.x,net.nodes[from].z-j.z),v={from,to:j.id,distance:length-1.25,speed:1,travel:0},next=v=>{v.from=j.id;v.to=from;};
    assert.equal(signals.green(j.id,net.nodes[from],9.8),false);advanceSignalledVehicle(v,.4,9.8,{nodes:net.nodes,signals,next});assert.ok(Math.abs(v.travel-.2)<1e-7);assert.ok(Math.abs(v.redWait-.2)<1e-7);assert.equal(v.crossingCleared,true);
    const waiting={from,to:j.id,distance:0,speed:2.3,travel:0};advanceSignalledVehicle(waiting,30,0,{nodes:net.nodes,signals:{has:()=>true,green:()=>false,wait:()=>10},next});assert.ok(Math.abs(waiting.distance-(length-1.25))<1e-8);assert.ok(waiting.redWait>20);
});
test('signal waits and complete bus journeys are independent of frame rate',()=>{
    const run=step=>{const {bus}=build();for(let t=0;t<240-1e-8;t+=step)bus.update(Math.min(step,240-t));const b=bus.bus;return {leg:b.tourIndex,distance:b.distance,travel:b.travel,redWait:b.redWait,arrivals:b.arrivals};};
    const small=run(.025);for(const step of [.2,1,17]){const big=run(step);assert.equal(big.leg,small.leg);assert.equal(big.arrivals,small.arrivals);for(const k of ['distance','travel','redWait'])assert.ok(Math.abs(big[k]-small[k])<1e-6,k+' must not change with frame rate');}assert.ok(small.redWait>0);assert.ok(small.arrivals>=2);
    const {net,signals}=build();net.setSignals(signals);net.update(240);assert.ok(net.cars.some(c=>c.redWait>0),'Waymos obey the same signals');
});
test('bus and traffic signal geometry stays finite and uses bounded shared mesh batches',()=>{
    const {bus,signals}=build(),mesh=new Mesh(),signs=new Map(BUS_SIGNS.map(s=>[s,[[0,0],[1,0],[1,1],[0,1]]]));drawSlowBus(mesh,bus.bus,0,signs);drawTrafficSignalPosts(mesh,signals,()=>0);const first=mesh.data.length;drawTrafficSignalLights(mesh,signals,0,{x:5,z:5});const light=new Mesh();drawTrafficSignalLights(light,signals,10,{x:5,z:5});assert.ok(mesh.data.every(Number.isFinite));assert.ok(mesh.data.length/33<12000);assert.notDeepEqual(mesh.data.slice(first),light.data);
});
