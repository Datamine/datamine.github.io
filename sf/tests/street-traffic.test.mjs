import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from '../geometry.js';
import {createStreetTraffic} from '../street-traffic.js';

test('patrol circuits cover every directed road edge, including overlapping continuations and cul-de-sacs',()=>{
    const routes=[{name:'Long road',kind:'road',points:[[0,0],[20,0]]},{name:'Continuation',kind:'road',points:[[8,0],[25,0]]},
        {name:'Cross street',kind:'road',points:[[12,-8],[12,8]]},{name:'Side street',kind:'road',points:[[20,0],[20,5]]}];
    const t=createStreetTraffic({routes,isRoad:()=>true,ground:()=>0,count:1});assert.equal(t.components.length,1);
    const c=t.components[0],visited=new Map();
    for(let i=1;i<c.tour.length;i++){const a=c.tour[i-1],b=c.tour[i];assert.ok(t.nodes[a].neighbors.includes(b));const key=a+':'+b;visited.set(key,(visited.get(key)||0)+1);}
    assert.equal(c.tour[0],c.tour.at(-1));assert.equal(c.lengths.length,t.edges.length*2);
    for(const e of t.edges){assert.equal(visited.get(e.from+':'+e.to),1);assert.equal(visited.get(e.to+':'+e.from),1);}
    const destinations=new Set(),car=t.cars[0],seconds=c.length/car.speed;
    for(let elapsed=0;elapsed<seconds+.1;elapsed+=.025){t.update(.025);destinations.add(car.to);}
    assert.equal(destinations.size,t.nodes.length,'a full patrol must visit every junction');assert.ok(car.travel>=c.length);
});

test('cars are distributed over the main network rather than trapped on tiny isolated road fragments',()=>{
    const t=createStreetTraffic({routes:[{kind:'road',points:[[0,0],[100,0]]},{kind:'road',points:[[100,0],[100,100]]},{kind:'road',points:[[4,10],[4,10.5]]}],isRoad:()=>true,ground:()=>0,count:3});
    assert.equal(t.components.length,2);assert.equal(t.cars.length,3);assert.ok(t.cars.every(c=>c.circuit===t.components[0]));
    const separation=t.cars.slice(1).map((c,i)=>Math.hypot(c.x-t.cars[i].x,c.z-t.cars[i].z));assert.ok(separation.every(d=>d>20));
});

test('each visible Waymo registers its actual mesh as an examinable moving sight',()=>{
    const t=createStreetTraffic({routes:[{kind:'road',points:[[0,0],[20,0]]}],isRoad:()=>true,ground:()=>0,count:1}),m=new Mesh(),hits=[];
    t.draw(m,{x:10,z:0},(start,car)=>hits.push({start,end:m.data.length,car}));assert.equal(hits.length,1);assert.equal(hits[0].start,0);assert.equal(hits[0].end,m.data.length);
    const sight=hits[0].car.sight;assert.equal(sight.kind,'waymo');assert.equal(sight.label,'Waymo');assert.match(sight.description,/driverless|autonomous/);assert.ok(sight.description.length>80);
    const id=sight.id;t.update(2);const next=new Mesh();t.draw(next,{x:10,z:0},(_,car)=>assert.equal(car.sight.id,id));assert.notDeepEqual(next.data,m.data);
    let culled=0;t.draw(new Mesh(),{x:1000,z:1000},()=>culled++);assert.equal(culled,0);
});
