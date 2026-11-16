import test from 'node:test';
import assert from 'node:assert/strict';
import {createCityLife} from '../life.js';
import {Mesh} from '../geometry.js';

test('off-screen people keep walking while expensive character geometry waits until they become visible',()=>{
    let visible=false,draws=0;
    const life=createCityLife({routes:[{name:'Neighborhood promenade',kind:'road',halfWidth:.5,points:[[0,0],[20,0]]}],surfaceType:()=> 'sidewalk',lamps:[],terrainHeight:()=>1,scale:1,human:()=>draws++,bicycle:()=>{},maxWalkers:1,maxRiders:0,waterTraffic:false,visible:()=>visible});
    life.update(0);const p=life.people[0],before=p.elapsed;life.update(5);const after=p.elapsed;assert.ok(after>before);life.draw(new Mesh(),5000,[p.x,p.z],false);assert.equal(draws,0);
    visible=true;life.draw(new Mesh(),5000,[p.x,p.z],false);assert.equal(draws,1);assert.equal(p.elapsed,after);
});
