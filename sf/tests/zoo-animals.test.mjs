import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from '../geometry.js';
import {ZOO_ENCLOSURES,drawZooEnclosures,drawZooAnimals} from '../zoo-animals.js';

test('the giraffe enclosure sits entirely south of the penguin pen with a gap between fences',()=>{
    const giraffe=ZOO_ENCLOSURES.find(p=>p.species==='giraffe'),penguin=ZOO_ENCLOSURES.find(p=>p.species==='penguin');
    assert.equal(giraffe.x,penguin.x);assert.ok(giraffe.z-giraffe.d/2>penguin.z+penguin.d/2+.2);
    assert.ok(giraffe.z+giraffe.d/2+.06<96,'the whole habitat fits on the city terrain');
});

test('additional animals stay inside their authored enclosures throughout their loops',()=>{
    for(const pen of ZOO_ENCLOSURES){
        for(let i=0;i<12;i++){
            const mesh=new Mesh();drawZooAnimals(mesh,i*3000,()=>2,{near:(x,z)=>x===pen.x&&z===pen.z});
            assert.ok(mesh.data.length>0);assert.ok(mesh.data.every(Number.isFinite));
            for(let k=0;k<mesh.data.length;k+=11){
                assert.ok(Math.abs(mesh.data[k]-pen.x)<pen.w/2-.05,pen.label+' crosses its fence');
                assert.ok(Math.abs(mesh.data[k+2]-pen.z)<pen.d/2-.05,pen.label+' crosses its fence');
                assert.ok(mesh.data[k+1]>=2,'animals must not sink into their habitat');
            }
        }
    }
});

test('zoo habitats have finite bounded meshes, individual examine text, and reduced motion',()=>{
    const mesh=new Mesh(),sites=drawZooEnclosures(mesh,()=>2);
    assert.equal(sites.length,4);assert.ok(mesh.data.every(Number.isFinite));
    assert.equal(new Set(sites.map(s=>s.description)).size,4);
    const a=new Mesh(),b=new Mesh(),moving=new Mesh();
    drawZooAnimals(a,0,()=>2,{reduced:true});drawZooAnimals(b,8000,()=>2,{reduced:true});drawZooAnimals(moving,8000,()=>2);
    assert.deepEqual(a.data,b.data);assert.notDeepEqual(a.data,moving.data);
    assert.ok(a.data.length/33<23000,'the new animals must have a modest draw cost');
});
