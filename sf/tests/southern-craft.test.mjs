import {drawSouthernHouseDetails} from '../southern-house-details.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,rayTriangle} from '../geometry.js';
import {SOUTHERN_CRAFT,craftSiteFits,craftFootprint} from '../southern-craft-layout.js';
import {SOUTHERN_PALETTES} from '../neighborhood-palette.js';
import {SOUTHERN_GREENWAYS,COASTAL_GARDEN_HOMES} from '../southern-greenways.js';
import {drawCraftGround,drawSouthernCraftSite,CRAFT_SHOPS} from '../southern-craft.js';
import {createHousing} from '../housing.js';
import {MATERIAL_IDS} from '../materials.js';

test('curated southern gardens clear every authored home, protected facility, road and public trail',()=>{
    assert.ok(SOUTHERN_CRAFT.length>=8);const placed=[];
    for(const p of SOUTHERN_CRAFT){assert.ok(craftSiteFits(p,placed),p.id);assert.ok(Math.abs(p.rotation/(Math.PI/2)-Math.round(p.rotation/(Math.PI/2)))<1e-8);placed.push(p);}
    assert.equal(COASTAL_GARDEN_HOMES.length,6);assert.equal(SOUTHERN_GREENWAYS.length,2);
});
test('courtyard paving is clipped to the terrain triangles instead of hovering over the hills',()=>{
    // Piecewise planar terrain includes the same cell diagonal as the world.
    const height=(x,z)=>{const i=Math.floor(x*2)/2,j=Math.floor(z*2)/2,u=(x-i)*2,v=(z-j)*2,f=(x,z)=>1+x*.11+z*.07+Math.sin(x*3.7+z*1.2)*.16,a=f(i,j),b=f(i+.5,j),c=f(i+.5,j+.5),d=f(i,j+.5);return u>=v?a+(b-a)*u+(c-b)*v:a+(c-d)*u+(d-a)*v;};
    const polygon=[[.13,.21],[2.37,.21],[2.37,1.66],[.13,1.66]],m=new Mesh();drawCraftGround(m,{height},polygon);
    assert.ok(m.data.every(Number.isFinite));
    for(const [x,z] of [[.32,.43],[.88,.73],[1.63,1.12],[2.13,1.47]]){
        const ray={origin:[x,10,z],dir:[0,-1,0]},hits=[];for(let i=0;i<m.data.length;i+=33){const t=rayTriangle(ray,...[0,11,22].map(k=>m.data.slice(i+k,i+k+3)));if(t!==null)hits.push(t);}assert.ok(hits.length);assert.ok(Math.abs(10-Math.min(...hits)-height(x,z)-.012)<1e-7);
    }
});
test('five southern house families have distinct silhouettes, coordinated colors and finite textured meshes',()=>{
    const roofs=new Set();for(const kind of Object.keys(SOUTHERN_PALETTES)){
        const m=new Mesh(),housing=createHousing({terrainHeight:()=>1.15,naturalHeight:()=>1.15,cutHousePlot:()=>{},getSceneMesh:()=>m,registerObject:(m,s,o)=>o,rectangle:()=>[],sashWindow:()=>{}});
        const o=housing.makeTownhomeRow(10,10,4.8,2.6,2,.43,0,kind);assert.ok(m.data.every(Number.isFinite),kind);assert.ok(m.data.length/33<12000);assert.equal(o.district,kind);assert.ok(o.houses.every(h=>h.storeys===2&&h.H<3.2));o.houses.forEach(h=>roofs.add(h.roof));
    }assert.ok(roofs.size>=3);for(const name of ['limewash','herringbone','fishscale','canvasWeave'])assert.ok(Number.isInteger(MATERIAL_IDS[name]));
});
test('markets, creative workshops and arcades share clear entrances and bounded static geometry',()=>{
    const terrain={height:(x,z)=>1.15+x*.015+z*.008};
    for(const [i,kind] of ['market','studio','arcade','garden'].entries()){
        const p={id:'test-'+kind,x:20,z:115,w:3.3,d:2.7,rotation:i*Math.PI/2,kind,index:i,palette:SOUTHERN_PALETTES.coastal,entry:{x:20,y:118}},m=new Mesh(),s=drawSouthernCraftSite(m,p,terrain,new Map(),CRAFT_SHOPS[i%3]);
        assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<6000);assert.ok(s.navigationPolygons.length>0);assert.ok(s.count>0);assert.deepEqual(s.footprint,craftFootprint(p));assert.ok(s.lo.every(Number.isFinite)&&s.hi.every(Number.isFinite));
    }
});


test('hillside houses shortened to one floor do not retain floating upper-storey shutters',()=>{
    const m=new Mesh(),p={left:0,width:1.4,face:1,floor:2,H:1.65,storeys:1,shape:.4,door:.14,dw:.32,color:'#78aaa4',bx:.98,bw:.65};drawSouthernHouseDetails(m,'coastal',p);
    for(let i=1;i<m.data.length;i+=11)assert.ok(m.data[i]<p.floor+p.H,'decoration floats above the shortened house');
});
