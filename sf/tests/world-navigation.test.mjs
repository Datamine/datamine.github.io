import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldModel} from '../world.js';
import {auditWorldNavigation} from '../navigation-audit.js';
import {buildTileNavigation,navigationObstacles} from '../navigation.js';

// One real production layout per process. No browser, WebGL, image loading,
// snapshots, substitute cityPath, or simulated walking is involved.
const world=createWorldModel();

test('every intended destination and shop interior has valid routes in both directions',()=>{
    const report=auditWorldNavigation(world);assert.equal(report.ok,true,report.errors.join('\n'));
    assert.ok(report.destinations>=77);assert.ok(report.routes.length>=158);assert.ok(report.graph.nodes>50000);
    assert.deepEqual(report.observations.sort(),['prometheus','rail-pit']);
    for(const id of ['zoo -> Tahoe spaceport','Tahoe spaceport -> zoo','airport spaceport -> UCSF','UCSF -> airport spaceport'])assert.ok(report.routes.some(r=>r.id===id));
    for(const p of world.places)assert.ok(report.routes.some(r=>r.id==='spawn -> '+p.id+':inside'));
});

test('the runtime navigation mask matches the final tile data and all placed collision footprints',()=>{
    const rebuilt=buildTileNavigation(world.tiles,{obstacles:navigationObstacles(world.objects)}),differences=[];
    for(let id=0;id<rebuilt.mask.length;id++)if(rebuilt.mask[id]!==world.navigation.mask[id]){
        if(differences.length<20){const p=rebuilt.pointAt(id);differences.push({at:p,final:rebuilt.describe(p.x,p.y),runtime:world.navigation.describe(p.x,p.y)});}
    }
    assert.deepEqual(differences,[],'Navigation was built before a later collision or material change');
});

test('sealing an actual shop doorway makes its interior deterministically unreachable',()=>{
    const p=world.places.find(p=>p.id==='links'),cx=p.x+p.w/2,cz=p.y+p.d/2,a=p.rotation||0;
    const rotate=([x,z])=>[cx+(x-cx)*Math.cos(a)-(z-cz)*Math.sin(a),cz+(x-cx)*Math.sin(a)+(z-cz)*Math.cos(a)];
    const door={id:'test-sealed-mazarine-door',polygon:[[p.localDoor,p.y+p.d-.1],[p.localDoor+1,p.y+p.d-.1],[p.localDoor+1,p.y+p.d+.1],[p.localDoor,p.y+p.d+.1]].map(rotate)};
    assert.ok(world.navigation.connected(world.spawn,p.inside));
    const sealed=buildTileNavigation(world.tiles,{obstacles:[...navigationObstacles(world.objects),door]});
    assert.equal(sealed.connected(world.spawn,p.inside),false);assert.equal(sealed.path(world.spawn,p.inside),null);assert.equal(sealed.stats.expanded,0);
});

test('petting selects a reachable standing spot when approached from different neighborhoods',()=>{
    for(const p of world.places){
        const target=world.approaches.bunny(p.entry);assert.ok(target,'No petting approach from '+p.id);assert.ok(world.navigation.connected(p.entry,target));
        const b=world.bunny.state,d=Math.hypot(target.x+.5-b.x,target.y+.5-b.z);assert.ok(d>.6&&d<.85);
    }
});
