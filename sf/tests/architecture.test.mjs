import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,dot,sub} from '../geometry.js';
import {windowLayout,drawFacadeWindow} from '../windows.js';
import {CITY_HALL,drawCityHall} from '../city-hall.js';
import {drawBrickOfficeTower} from '../offices.js';
import {tilePolygonOverlap} from '../tiles.js';

test('window bars terminate at frames or complete mullions, with no stray bars inside panes',()=>{
    for(const style of ['sash','office','industrial','storefront'])for(const [w,h] of [[.22,.45],[.42,.72],[.7,1.12]]){
        const {divisions}=windowLayout(w,h,style),vertical=divisions.filter(p=>p.h===h),horizontal=divisions.filter(p=>p.h!==h);
        assert.equal(vertical.length,style==='industrial'?2:1);
        const ends=[0,w,...vertical.flatMap(p=>[p.x,p.x+p.w])];
        for(const p of horizontal)for(const end of [p.x,p.x+p.w])assert.ok(ends.some(x=>Math.abs(end-x)<1e-8));
        assert.ok(Math.abs(horizontal.reduce((sum,p)=>sum+p.w,0)+vertical.reduce((sum,p)=>sum+p.w,0)-w)<1e-8,'the cross rail must span the entire opening');
    }
});

test('framed windows face outward and have no competing coplanar trim or glazing',()=>{
    for(const style of ['sash','office','industrial'])for(const isX of [false,true])for(const far of [false,true]){
        const m=new Mesh();drawFacadeWindow(m,{isX,far,plane:0,along:0,y:0,w:.42,h:.72,style});
        assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<100);
        const triangles=[];
        for(let i=0;i<m.data.length;i+=33){
            const points=[0,11,22].map(j=>m.data.slice(i+j,i+j+3)),normal=m.data.slice(i+3,i+6),axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
            if(m.data[i+9]===-1.05){assert.equal(normal[isX?0:2],far?-1:1);assert.ok(points.every(p=>Math.abs(p[isX?0:2]-(far?-.013:.013))<1e-8));}
            triangles.push({points,normal,polygon:points.map(p=>p.filter((_,k)=>k!==axis)),appearance:m.data.slice(i+6,i+11).join(',')});
        }
        for(let i=0;i<triangles.length;i++)for(let j=i+1;j<triangles.length;j++){
            const a=triangles[i],b=triangles[j];if(a.appearance===b.appearance||dot(a.normal,b.normal)<.999999||Math.abs(dot(a.normal,sub(a.points[0],b.points[0])))>1e-7)continue;
            assert.ok(tilePolygonOverlap(a.polygon,b.polygon)<1e-7,'trim, reveals, and bars must meet without texture overlap');
        }
    }
});

test('City Hall detail fits its reserved block and stays within a modest static mesh budget',()=>{
    const m=new Mesh();drawCityHall(m,0,0,0);assert.ok(m.data.every(Number.isFinite));
    assert.ok(m.data.length/33>3000&&m.data.length/33<13000);
    for(let i=0;i<m.data.length;i+=11){assert.ok(Math.abs(m.data[i])<=CITY_HALL.width/2+1e-8);assert.ok(Math.abs(m.data[i+2])<=CITY_HALL.depth/2+1e-8);assert.ok(m.data[i+1]>=0&&m.data[i+1]<=CITY_HALL.height+1e-8);}
});

test('brick office towers have ambient framed glazing on all four elevations',()=>{
    const m=new Mesh();drawBrickOfficeTower(m,0,0,0);assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<9000);
    const sides=new Set();
    for(let i=0;i<m.data.length;i+=33)if(m.data[i+9]===-1.05){const n=m.data.slice(i+3,i+6);sides.add(n.map(v=>Math.round(v)).join(','));}
    assert.equal(sides.size,4);
    for(let i=0;i<m.data.length;i+=11){assert.ok(Math.abs(m.data[i])<.875);assert.ok(Math.abs(m.data[i+2])<.875);assert.ok(m.data[i+1]>=0&&m.data[i+1]<5.9);}
});
