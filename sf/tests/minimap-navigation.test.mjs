import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestMinimapPoint} from '../minimap-navigation.js';

test('an eligible exact click is preserved rather than being rounded to a tile',()=>{
    const target={x:3.123,y:4.567};
    assert.deepEqual(nearestMinimapPoint({x:0,y:0},target,{eligible:()=>true,reachable:()=>true}),target);
});

test('blocked, distant, and disconnected clicks choose the Euclidean nearest reachable tile',()=>{
    const points=[{x:0,y:0},{x:1,y:2},{x:2,y:2},{x:7,y:1},{x:8,y:4}],eligible=p=>points.some(q=>q.x===p.x&&q.y===p.y),reachable=p=>p.x!==7;
    for(const x of [-20,-.3,.5,1.4,4,6.9,8,20])for(const y of [-10,.5,2.4,4,15]){
        const request={x,y},result=nearestMinimapPoint(points[0],request,{eligible,reachable,step:1,offset:0});
        const d=p=>(p.x-x)**2+(p.y-y)**2,minimum=Math.min(...points.filter(reachable).map(d));
        assert.ok(result);assert.ok(reachable(result));assert.equal(d(result),minimum,'the search must not stop at the first square-ring candidate');
    }
});

test('quarter-tile search matches an exhaustive independent nearest-point oracle',()=>{
    const points=[];for(let y=-3;y<3;y+=.25)for(let x=-3;x<3;x+=.25)if(Math.sin(x*7+y*13)>.3)points.push({x,y});
    const keys=new Set(points.map(p=>p.x+','+p.y)),eligible=p=>keys.has(p.x+','+p.y);
    for(let i=0;i<100;i++){
        const requested={x:Math.sin(i)*8,y:Math.cos(i*1.7)*8},result=nearestMinimapPoint(points[0],requested,{eligible,reachable:()=>true,offset:0});
        const d=p=>(p.x-requested.x)**2+(p.y-requested.y)**2;
        assert.ok(Math.abs(d(result)-Math.min(...points.map(d)))<1e-9);
    }
});

test('invalid coordinates and unavailable movement return no destination',()=>{
    assert.equal(nearestMinimapPoint({x:0,y:0},{x:NaN,y:0},{eligible:()=>true,reachable:()=>true}),null);
    assert.equal(nearestMinimapPoint({x:0,y:0},{x:1,y:1},{eligible:()=>false,reachable:()=>false,maxRadius:2}),null);
});
