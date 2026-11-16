import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,dot,sub} from '../geometry.js';
import {createHousing} from '../housing.js';
import {tilePolygonOverlap} from '../tiles.js';

function footingFixture(kind,angle,slope=0){
    const x=kind==='urban'?70:50,z=kind==='urban'?45:30;
    const mesh=new Mesh(),height=(u,v)=>1+(u-x)*slope+(v-z)*slope*.3;
    const housing=createHousing({terrainHeight:height,naturalHeight:height,cutHousePlot:()=>{},getSceneMesh:()=>mesh,registerObject:(_m,_start,object)=>object,rectangle:()=>[],sashWindow:()=>{}});
    const object=kind==='parkside'?housing.makeParksideTownhome(x,z,1.5,.75,angle,.6):kind==='shop'?housing.makeCurbShop(x,z,1.2,1.8,angle,.8):housing.makeTownhomeRow(x,z,kind==='urban'?3.4:1.45,2.7,2,.8,angle);
    assert.equal(object.arch,kind==='urban'?'urbanBlock':kind==='shop'?'shopfront':'townhomes');
    const triangles=[];
    for(let i=0;i<mesh.data.length;i+=33){
        const points=[0,11,22].map(j=>mesh.data.slice(i+j,i+j+3)),normal=mesh.data.slice(i+3,i+6);
        if(Math.min(...points.map(p=>p[1]))>object.base+.7)continue;
        const axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),project=p=>p.filter((_,k)=>k!==axis);
        triangles.push({points,normal,polygon:points.map(project),signature:mesh.data.slice(i+6,i+11).map(v=>v.toFixed(6)).join(',')});
    }
    return {mesh,triangles};
}

test('foundation and wall materials meet without overlapping coplanar faces',()=>{
    for(const kind of ['townhome','urban','shop','parkside'])for(const angle of [0,Math.PI/4,Math.PI/2])for(const slope of [0,.45,-.45]){
        const {mesh,triangles}=footingFixture(kind,angle,slope);assert.ok(mesh.data.every(Number.isFinite));
        for(let i=0;i<triangles.length;i++)for(let j=i+1;j<triangles.length;j++){
            // Opposing faces at joined solids (a step meeting a wall) are valid.
            // Two outward faces with different appearances compete for pixels.
            const a=triangles[i],b=triangles[j];if(a.signature===b.signature||dot(a.normal,b.normal)<.999999)continue;
            if(Math.abs(dot(a.normal,sub(a.points[0],b.points[0])))>1e-7)continue;
            const overlap=tilePolygonOverlap(a.polygon,b.polygon);
            assert.ok(overlap<1e-7,`${kind}, rotation ${angle}, slope ${slope}: competing foundation/wall textures over ${overlap.toFixed(6)} square units`);
        }
    }
});
