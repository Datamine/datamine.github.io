import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,rayTriangle} from '../geometry.js';
import {TAHOE,TAHOE_BOUNDS,TAHOE_SKI_HUT,tahoeVillagePavingAt,REGIONAL_KM_PER_TILE,createTahoe,nearTahoe,tahoeHeight,regionalGroundHeight,raycastTahoe,drawTahoeTerrain,drawTahoeStructures,fitTahoeCamera} from '../tahoe.js';
import {createEconomy} from '../economy.js';
import {createAirship,SECOND_STREET_X,AIRSHIP_TERMINAL,AIRPORT_RUNWAY,drawAirshipTerminal} from '../airship.js';
import {TAX_HQ,SF_SPACEPORT,RAIL_PIT,taxDialogue} from '../southern-district.js';
import {drawCharacter} from '../characters.js';

test('Tahoe is a geographic-scale flight northeast of SF, with an exceptionally tall summit',()=>{
    const km=Math.hypot(TAHOE.base.x-48,TAHOE.base.z-48)*REGIONAL_KM_PER_TILE;
    assert.ok(km>230&&km<280);assert.ok(TAHOE.base.x>1500&&TAHOE.base.z< -1000);
    assert.ok(tahoeHeight(TAHOE.peak.x,TAHOE.peak.z)>235);assert.ok(tahoeHeight(TAHOE.peak.x,TAHOE.peak.z)-tahoeHeight(TAHOE.base.x,TAHOE.base.z)>220);
});

test('Tahoe ray picking and feet share the actual rendered terrain triangles',()=>{
    for(const point of [TAHOE.base,TAHOE.peak,{x:TAHOE.peak.x+27.3,z:TAHOE.peak.z+8.7}]){
        const h=tahoeHeight(point.x,point.z),hit=raycastTahoe({origin:[point.x,h+40,point.z],dir:[0,-1,0]});assert.ok(hit);assert.ok(Math.abs(hit.point[1]-h)<1e-7);
    }
    const m=new Mesh();drawTahoeTerrain(m);assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.length/33<250000,'the finer regional terrain must remain bounded independently of the flight distance');
    // Read the actual mesh's interpolated snow mask, including the low valley
    // where the natural elevation-based snow line no longer provides cover.
    const b=TAHOE_BOUNDS,s=b.step,t=createTahoe(),cells=new Map();
    // Index the actual terrain triangles, including clipped paving boundaries;
    // no fixed vertex count or mesh ordering is part of the surface contract.
    for(let i=0;i<m.data.length;i+=33){if(Math.abs(m.data[i+9]+.75)>.01&&m.data[i+9]!==-4)continue;const x=(m.data[i]+m.data[i+11]+m.data[i+22])/3,z=(m.data[i+2]+m.data[i+13]+m.data[i+24])/3,key=Math.floor((x-b.west)/s)+','+Math.floor((z-b.north)/s);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);}
    const groomAt=(x,z)=>{
        const key=Math.floor((x-b.west)/s)+','+Math.floor((z-b.north)/s);
        for(const start of cells.get(key)||[]){const v=[0,11,22].map(i=>[m.data[start+i],m.data[start+i+2]]),a=v[0],c=v[1],d=v[2],den=(c[1]-d[1])*(a[0]-d[0])+(d[0]-c[0])*(a[1]-d[1]);if(Math.abs(den)<1e-9)continue;
            const u=((c[1]-d[1])*(x-d[0])+(d[0]-c[0])*(z-d[1]))/den,w=((d[1]-a[1])*(x-d[0])+(a[0]-d[0])*(z-d[1]))/den,weights=[u,w,1-u-w];
            if(weights.every(w=>w>=-1e-6))return m.data[start+9]===-4?1:weights.reduce((sum,w,i)=>sum+w*m.data[start+i*11+10],0);
        }throw Error('Missing surface triangle at '+x+','+z);
    };
    for(let i=0;i<=400;i++)for(const offset of [-1.4,0,1.4]){
        const p=t.courseAt(t.courseLength*i/400);
        assert.ok(groomAt(p.x-Math.sin(p.angle)*offset,p.z+Math.cos(p.angle)*offset)>.99,'snow must cover the entire skiable run through its valley finish');
    }
    for(let i=0;i<32;i++){
        const a=i*Math.PI/16;
        const x=TAHOE.base.x+3*Math.cos(a),z=TAHOE.base.z+3*Math.sin(a);if(!tahoeVillagePavingAt(x,z))assert.ok(groomAt(x,z)>.99,'snow must surround the gondola boarding platform outside the paved village paths');
    }
});

test('regional controls and minimap cover the summit and the entire ski course',()=>{
    const t=createTahoe();assert.equal(nearTahoe(48,48),false);
    for(let f=0;f<=1;f+=.01){const p=t.courseAt(t.courseLength*f);assert.ok(nearTahoe(p.x,p.z));assert.equal(regionalGroundHeight(p.x,p.z),tahoeHeight(p.x,p.z));}
    assert.ok(nearTahoe(TAHOE.peak.x,TAHOE.peak.z));
});

test('the gondola ascends and descends continuously to walkable stations',()=>{
    const t=createTahoe();assert.ok(t.gondola(true));let previous={...t.state.position},summit=false;
    for(let i=0;i<1800;i++){const event=t.update(1/60),p=t.state.position;assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)<.35);previous={...p};if(event==='summit'){summit=true;break;}}
    assert.ok(summit);assert.equal(t.state.mode,'ground');assert.ok(t.walkable(t.state.position.x,t.state.position.z));
    assert.ok(t.gondola(false));for(let i=0;i<1800&&t.state.mode!=='ground';i++)t.update(1/60);assert.ok(Math.hypot(t.state.position.x-TAHOE.base.x,t.state.position.z-TAHOE.base.z)<1e-7);
});

test('the ski hut, including its roof and racks, clears the station and the entire gondola sweep',()=>{
    const t=createTahoe(),mesh=new Mesh(),sites=drawTahoeStructures(mesh,t,new Map()),hut=sites.find(s=>s.id==='ski-rental'),station=sites.find(s=>s.id==='gondola-summit');
    assert.ok(hut.hi[0]<station.lo[0]-.5,'the hut belongs beside the station with a visible gap');assert.ok(mesh.data.every(Number.isFinite));
    const a=Math.atan2(TAHOE.peak.z-TAHOE.base.z,TAHOE.peak.x-TAHOE.base.x),hx=Math.abs(Math.cos(a))*.85+Math.abs(Math.sin(a))*.62,hz=Math.abs(Math.sin(a))*.85+Math.abs(Math.cos(a))*.62;
    // Each cable span is linear. Its endpoint bounds plus the rotated cabin
    // extents enclose the entire continuous sweep, including between frames.
    for(let i=1;i<t.cablePath.length;i++){
        const a=t.cablePath[i-1],b=t.cablePath[i],separate=Math.max(a.x,b.x)+hx<hut.lo[0]-.3||Math.min(a.x,b.x)-hx>hut.hi[0]+.3||Math.max(a.z,b.z)+hz<hut.lo[2]-.3||Math.min(a.z,b.z)-hz>hut.hi[2]+.3;
        assert.ok(separate,'gondola intersects the ski hut on cable span '+i);
    }
});

test('the moved rental entrance is reachable from the gondola while the hut walls remain solid',()=>{
    const t=createTahoe(),hut=TAHOE_SKI_HUT;assert.equal(t.walkable(hut.x,hut.z),false);assert.ok(t.walkable(hut.entry.x+.5,hut.entry.y+.5));
    for(const [from,to] of [[t.summitEntry,hut.entry],[hut.entry,t.summitEntry]]){
        const route=t.path(from,to);assert.ok(route?.length);let previous=from;for(const p of route){assert.ok(t.segment(previous,p));previous=p;}assert.deepEqual(previous,to);
    }
    for(let i=0;i<=300;i++)for(const offset of [-1.4,0,1.4]){const p=t.courseAt(t.courseLength*i/300);assert.ok(t.walkable(p.x-Math.sin(p.angle)*offset,p.z+Math.cos(p.angle)*offset),'the hut must stay clear of the ski course');}
});

test('ski rental gates a complete descent with four ramps, steerable jumps, and flips',()=>{
    const t=createTahoe();assert.equal(t.startSki(),false);t.state.rented=true;assert.ok(t.startSki());assert.equal(t.flip(),false);let flips=0,finish=false;
    for(let i=0;i<6000;i++){
        if(t.state.airTime>0&&!t.state.flipping&&t.flip())flips++;
        t.steerTo(t.state.position.x+20,t.state.position.z+20);const event=t.update(1/60),p=t.state.position;
        assert.ok(p.y>=tahoeHeight(p.x,p.z)+.09);assert.ok(Math.abs(t.state.offset)<=1.401);assert.ok(Object.values(p).every(Number.isFinite));
        assert.ok(t.walkable(p.x,p.z),'the rendered ski course and local navigation must agree');
        if(event==='finish'){finish=true;break;}
    }
    assert.ok(finish);assert.equal(t.state.ramps.size,4);assert.equal(flips,4);assert.equal(t.state.flips,4);assert.ok(Math.hypot(t.state.position.x-TAHOE.base.x,t.state.position.z-TAHOE.base.z)<1.5);
});

test('the alpine camera clears steep slopes and preserves a centered, consistently sized avatar',()=>{
    const t=createTahoe();
    for(let f=0;f<=1;f+=.05){const p=t.courseAt(t.courseLength*f),target=[p.x,tahoeHeight(p.x,p.z)+.9,p.z];
        for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const back=[Math.sin(yaw)*Math.cos(.65),Math.sin(.65),Math.cos(yaw)*Math.cos(.65)],fit=fitTahoeCamera(target,back,35);
            for(let i=1;i<=20;i++){const a=i/20,x=target[0]+(fit.eye[0]-target[0])*a,z=target[2]+(fit.eye[2]-target[2])*a,y=target[1]+(fit.eye[1]-target[1])*a;assert.ok(y>=tahoeHeight(x,z)+.549);}
            const d=Math.hypot(...fit.eye.map((v,i)=>v-target[i]));assert.ok(Math.abs(fit.focalScale*d-35)<1e-7);
        }
    }
});

test('one-coin travel and skis cannot overdraw the purse, while taxes take every coin',()=>{
    const e=createEconomy({coins:3,equity:1,grain:2,fuelCans:0,fish:0});assert.ok(e.trade('rocket').ok);assert.ok(e.trade('skis').ok);assert.ok(e.trade('rocket').ok);assert.equal(e.state.coins,0);assert.equal(e.trade('skis').ok,false);
    e.state.coins=37;const tax=taxDialogue(e),paid=tax.choices[0].accept();assert.ok(paid.ok);assert.deepEqual(e.state,{coins:0,equity:1,grain:2,fuelCans:0,fish:0});assert.match(paid.message,/37 coins/);
    const questions=tax.choices[1].next.choices;assert.equal(questions.length,2);assert.match(questions[0].label,/Where is my money going/);assert.ok(questions.every(q=>q.receipt.includes('California high-speed rail')));
});

test('Second Street and the cross streets connect the tax and spaceport forecourts to the city',()=>{
    const a=createAirship(),city={x:60,y:80};
    for(const destination of [TAX_HQ.entry,SF_SPACEPORT.entry]){
        const path=a.path(city,destination,to=>[{...to}]);assert.ok(path?.length);assert.deepEqual(path.at(-1),destination);let previous=path[0];for(const p of path.slice(1)){assert.ok(a.segment(previous,p));previous=p;}
    }
    assert.equal(TAX_HQ.x,SECOND_STREET_X-10);assert.ok(SF_SPACEPORT.x>100,'the spaceport is on the airport pier in the bay');assert.ok(RAIL_PIT.north>TAX_HQ.z);
});

test('the airport apron is continuous below the airplanes through the southbound runway',()=>{
    const m=new Mesh();drawAirshipTerminal(m);
    for(const [x,z] of [[88,118],[92.5,123],[93,140],[AIRPORT_RUNWAY.x+1,148]]){
        const ray={origin:[x,8,z],dir:[0,-1,0]};let hit=false;
        for(let i=0;i<m.data.length;i+=33){const d=rayTriangle(ray,...[0,11,22].map(j=>m.data.slice(i+j,i+j+3)));if(d!==null&&8-d>1.1){hit=true;break;}}
        assert.ok(hit,'the reclaimed apron must cover '+x+','+z);
    }
});

test('gilded tax authorities wear three-dimensional top hats',()=>{
    const m=new Mesh();drawCharacter(m,0,0,0,0,0,false,'#ba9776','#d4b85d',{topHat:true,gilded:true,coat:true,pants:'#c7a752',backpack:false});
    let top=0,metal=0;for(let i=0;i<m.data.length;i+=11){top=Math.max(top,m.data[i+1]);if(m.data[i+9]===-1.4)metal++;}assert.ok(top>2);assert.ok(metal>200);assert.ok(m.data.every(Number.isFinite));
});

test('an airship can reach Tahoe continuously while clearing the Sierra terrain',()=>{
    const a=createAirship({groundHeight:regionalGroundHeight});a.board(AIRSHIP_TERMINAL.boarding);for(let i=0;i<3000&&a.state.phase!=='flying';i++)a.update(1/30);assert.equal(a.state.phase,'flying');
    a.flyTo(TAHOE.base.x,TAHOE.base.z);let arrived=false;
    for(let i=0;i<30000;i++){const event=a.update(1/30),p=a.state.position;assert.ok(p.y>=regionalGroundHeight(p.x,p.z)+4);if(event==='arrived'){arrived=true;break;}}
    assert.ok(arrived);assert.ok(Math.hypot(a.state.position.x-TAHOE.base.x,a.state.position.z-TAHOE.base.z)<1e-7);
});
