import {isGlassVertex,meshGlassTriangles} from '../glazing.js';
import {rayTriangle} from '../geometry.js';
import {instituteWindowOpenings} from '../institute-interiors.js';
import {TWITTER_HQ,SALES_CONFERENCE,BOTTLE_STREAM,inStreamCulvert} from '../social-layout.js';
import {streamSample} from '../bottle-post.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldModel} from '../world.js';
import {buildingNPCService} from '../building-interactions.js';
import {BILLBOARD_ART} from '../billboards.js';
import {auditWorldNavigation} from '../navigation-audit.js';
import {buildTileNavigation,navigationObstacles,auditNavigationGrid} from '../navigation.js';
import {marinElevation} from '../geography.js';
import {marketSide} from '../downtown.js';
import {forwardRollTarget,FORWARD_ROLL_DURATION,FORWARD_ROLL_SPEED} from '../forward-roll.js';
import {PENINSULA_STREETS,PACIFICA_PARK} from '../southern-expansion.js';
import {createPoliceChase} from '../encounters.js';
import {airportSurfaceTypeAt} from '../airship.js';
import {NOE_VALLEY_BOUNDS} from '../life.js';
import {tilePolygonOverlap} from '../tiles.js';
import {SQUARE_DIGSITE} from '../square-construction-layout.js';
import {inTimesSquare} from '../southern-layout.js';
import {SF_FITNESS} from '../fitness-layout.js';
import {SF_ZOO} from '../zoo.js';
import {JURASSIC,COW_PEN,inJurassicGrounds,inCowPen} from '../jurassic-layout.js';
import {NIGHTLIFE} from '../nightlife.js';
import {GPU_FACTORY,inGPUFactoryGrounds} from '../gpu-layout.js';

// One real production layout per process. No browser, WebGL, image loading,
// snapshots, substitute cityPath, or simulated walking is involved.
const world=createWorldModel({retainInteriors:true});

test('sand collection, the GPU Factory and its buyer connect through real city and South Bay paths',()=>{
    const sand=world.sandSite,factory=world.sights.find(s=>s.id==='gpu-factory'),buyer=world.merchants.find(n=>n.kind==='gpu-buyer');assert.ok(sand&&factory&&buyer);assert.equal(world.navigation.describe(sand.entry.x,sand.entry.y).type,'sand');assert.ok(buyer.roam);
    const counter=world.approaches.merchant(buyer);for(const [from,to] of [[world.spawn,sand.entry],[sand.entry,counter],[counter,sand.entry],[factory.entry,counter]]){const path=world.pathTo(to.x,to.y,from);assert.ok(path);let previous=from;for(const point of path){assert.ok(world.canTravel(previous.x,previous.y,point.x,point.y));previous=point;}assert.deepEqual(previous,to);}
    assert.equal(world.clearAt(GPU_FACTORY.x-.5,GPU_FACTORY.z-.5),false,'the factory building is solid');for(const tree of world.southernNeighborhood.trees)assert.equal(inGPUFactoryGrounds(tree.x,tree.z,.9),false,'the buyer and factory sign remain clear of trees');
});

test('the slow bus connects the street behind Nightlife to Market and every road crossing has visible signals',()=>{
    const b=world.slowBus;assert.equal(b.route.originStreet,'Alemany Boulevard');assert.equal(b.route.destinationStreet,'Market Street');assert.ok(b.route.points[0].z<NIGHTLIFE.z-NIGHTLIFE.d/2);assert.ok(Math.abs(b.route.points[0].x-NIGHTLIFE.x)<.1);assert.equal(b.bus.speed,4.6/2);assert.equal(b.bus.sight.description,"the world's slowest bus");
    for(let i=1;i<b.route.points.length;i++){const a=b.route.points[i-1],p=b.route.points[i],steps=Math.ceil(Math.hypot(p.x-a.x,p.z-a.z)/.1);for(let n=0;n<=steps;n++){const x=a.x+(p.x-a.x)*n/steps,z=a.z+(p.z-a.z)*n/steps;assert.equal(world.groundSurfaceAt(x,z),'road');assert.ok(world.landClearAt(x-.5,z-.5));}}
    assert.ok(b.signals.junctions.length>150);assert.deepEqual(b.signals.missing,[]);
    for(const j of b.signals.junctions){assert.equal(j.fixtures.length,j.approaches.length);for(const f of j.fixtures){const p=b.signals.fixtures[f];assert.ok(Number.isFinite(p.base));if(!p.overhead)assert.ok(world.landClearAt(p.x-.5,p.z-.5),'a signal pole must fit on clear ground');}}
    for(const p of b.route.points)if(p.node!==null&&world.streetTraffic.nodes[p.node].neighbors.length>=3)assert.ok(b.signals.has(p.node),'every junction along the bus route is signalled');
});

test('Jurassic Biosciences, its escape route, the cow pen and Ahab use the real connected world graph',()=>{
    const goals=[JURASSIC.exit,...world.expeditions.cows].map(p=>({x:p.x-.5,y:p.z-.5}));
    goals.push(...world.merchants.filter(n=>n.expeditionRole).map(n=>world.approaches.merchant(n)),COW_PEN.entry);
    for(const goal of goals){assert.ok(world.clearAt(goal.x,goal.y));const route=world.pathTo(goal.x,goal.y,world.spawn);assert.ok(route);let previous=world.spawn;for(const next of route){assert.ok(world.canTravel(previous.x,previous.y,next.x,next.y));previous=next;}assert.deepEqual(previous,goal);}
    for(const tree of world.southernNeighborhood.trees){assert.equal(inJurassicGrounds(tree.x,tree.z,.8),false);assert.equal(inCowPen(tree.x,tree.z,.8),false);}
    assert.ok(world.merchants.find(n=>n.expeditionRole==='scientist').roam);
    assert.ok(world.quests.entries().some(q=>q.id==='jurassic-recovery'));
});

test('SF Fitness is east of the zoo with reachable entrance, exercises and no stale Pacifica gym',()=>{
    const g=world.sights.find(s=>s.id==='sf-fitness');assert.equal(g.label,'SF Fitness');assert.ok(SF_FITNESS.x>SF_ZOO.x+SF_ZOO.w/2);assert.ok(Math.abs(SF_FITNESS.z-SF_ZOO.z)<5);assert.equal(world.sights.some(s=>s.id==='pacifica-gym'),false);
    for(const point of [g.entry,g.inside,SF_FITNESS.entry])for(const [from,to] of [[world.spawn,point],[point,world.spawn]]){const path=world.pathTo(to.x,to.y,from);assert.ok(path?.length);let previous=from;for(const p of path){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}assert.deepEqual(previous,to);}
    assert.ok(Math.abs(world.characterGround(SF_FITNESS.x,SF_FITNESS.z)-SF_FITNESS.base-.065)<1e-7);
});
test('Pacifica surfboards have a connected beach launch and open-water access without changing Crissy windsurfing',()=>{
    const s=world.pacificaSurfSite;assert.equal(s.kind,'surfing');assert.ok(world.landClearAt(s.entry.x,s.entry.y));assert.ok(world.surf.water(s.launch.x+.5,s.launch.y+.5));
    for(const [from,to] of [[world.spawn,s.entry],[s.entry,world.spawn]]){const path=world.pathTo(to.x,to.y,from);assert.ok(path);let previous=from;for(const p of path){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}assert.deepEqual(previous,to);}
    const coast={x:s.launch.x-20,y:s.launch.y+10};assert.ok(world.surf.path(s.launch,coast));assert.equal(world.surf.state.mode,'windsurf');assert.ok(world.sights.find(s=>s.id==='windsurf'));
});

test('larger production buildings use a varied palette and all eight detailed roof designs',()=>{
    const roofs=world.objects.filter(o=>o.roofDetails);assert.ok(roofs.length>=25);
    assert.equal(new Set(roofs.map(o=>o.roofDetails.style)).size,8);assert.ok(new Set(roofs.map(o=>o.roofDetails.color)).size>25);
    for(const o of roofs){assert.ok(o.roofDetails.height<1.2);assert.ok(o.lo.every(Number.isFinite)&&o.hi.every(Number.isFinite));assert.ok(o.hi[1]>o.base);}
});

test('Vic patrols outside the square at a reachable digsite and the old excavator space is open',()=>{
    const vic=world.merchants.find(n=>n.id==='square-foreman'),works=world.sights.find(s=>s.id==='times-square-works'),square=world.sights.find(s=>s.id==='times-square');
    assert.ok(vic.roam);assert.ok(works.object.navigationPolygons.length>8);assert.equal(inTimesSquare(vic.x,vic.z),false);assert.ok(vic.x>=SQUARE_DIGSITE.west&&vic.x<=SQUARE_DIGSITE.east);
    for(const p of vic.roam.points){assert.ok(world.clearAt(p.x,p.y));assert.equal(inTimesSquare(p.x+.5,p.y+.5),false,'Vic must not wander back into the plaza');}
    const approach=world.approaches.merchant(vic);
    for(const [from,to] of [[world.spawn,approach],[approach,world.spawn],[square.entry,works.entry],[works.entry,square.entry]]){
        const path=world.pathTo(to.x,to.y,from);assert.ok(path?.length);let previous=from;for(const p of path){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}assert.deepEqual(previous,to);
    }
    assert.ok(world.clearAt(60.3,149.7),'the former plaza excavator must leave usable walking space');
    assert.ok(world.clearAt(56,156),'the construction gate must not block Hillside Lane');
});

test('airport AI billboards face traffic on both sides and housing leaves their reserved plots clear',()=>{
    const ads=world.airportAds;assert.equal(ads.length,6);
    for(const side of ['east','west'])assert.equal(ads.filter(p=>p.side===side).length,3);
    for(const ad of ads){
        assert.equal(ad.angle,0);assert.ok(ad.street.startsWith('Third Street'));assert.equal(ad.x>ad.roadX,ad.side==='east');
        for(const house of world.objects.filter(o=>['townhomes','shopfront'].includes(o.arch)))assert.ok(tilePolygonOverlap(ad.clearing,house.footprint)<1e-7,'a house obscures '+ad.id);
        for(const [x,z] of ad.polygon){assert.notEqual(world.groundSurfaceAt(x,z),'road');assert.notEqual(world.groundSurfaceAt(x,z),'sea');}
        assert.ok(world.landClearAt(ad.roadX-.5,ad.z-.5),'a billboard must not obstruct the airport road');
    }
});

test('Waymo patrols cover the connected city from the western coast through the southern neighborhoods',()=>{
    const t=world.streetTraffic,main=t.components[0],points=main.nodes.map(id=>t.nodes[id]);
    assert.ok(Math.min(...points.map(p=>p.x))<15,'Great Highway must be in the patrol network');
    assert.ok(Math.min(...points.map(p=>p.z))<17,'the northern waterfront must be covered');
    assert.ok(Math.max(...points.map(p=>p.x))>80,'the eastern streets must be covered');
    assert.ok(Math.max(...points.map(p=>p.z))>170,'the southern districts must not stop at the old boundary');
    for(const district of [{x:20,z:40},{x:65,z:30},{x:57,z:72},{x:72,z:100},{x:55,z:150}])assert.ok(points.some(p=>Math.hypot(p.x-district.x,p.z-district.z)<15),'district is missing from traffic coverage: '+JSON.stringify(district));
    assert.ok(t.cars.every(c=>c.circuit===main));
    assert.ok(t.cars.some(c=>c.x<25)&&t.cars.some(c=>c.z<35)&&t.cars.some(c=>c.z>125),'the initial fleet must already be spread across the city');
    const directed=new Set();for(let i=1;i<main.tour.length;i++){const from=main.tour[i-1],to=main.tour[i];assert.ok(t.nodes[from].neighbors.includes(to));directed.add(from+':'+to);}
    assert.equal(directed.size,main.edges.length*2,'every road must appear in both patrol directions');
    for(const car of t.cars){assert.equal(car.sight.kind,'waymo');assert.ok(car.sight.description);}
});

test('Noe Valley has three stroller families on connected dry routes within the neighborhood',()=>{
    const families=world.noeValleyLife.people,b=NOE_VALLEY_BOUNDS;assert.equal(families.length,3);
    for(const p of families){
        assert.ok(p.stroller&&!p.child&&!p.rider&&!p.dogWalker);assert.ok(p.points.length>=11);
        for(const [i,[x,z]] of p.points.entries()){
            assert.ok(x>=b.west-1e-7&&x<=b.east+1e-7&&z>=b.north-1e-7&&z<=b.south+1e-7);assert.ok(world.landClearAt(x-.5,z-.5));
            if(i){const a=p.points[i-1];assert.ok(world.canTravel(a[0]-.5,a[1]-.5,x-.5,z-.5),'a stroller route crosses an obstacle');}
        }
    }
});

test('all three institute interiors and their resident researchers connect to the production world graph',()=>{
    assert.equal(world.instituteRooms.filter(r=>![TWITTER_HQ.id,SALES_CONFERENCE.id].includes(r.id)).length,3);
    for(const room of world.instituteRooms){
        assert.ok(room.sight.enterableInstitute);assert.ok(world.clearAt(room.inside.x,room.inside.y));
        assert.equal(world.instituteRoomAt(room.inside.x+.5,room.inside.y+.5),room);
        assert.ok(Math.abs(world.characterGround(room.inside.x+.5,room.inside.y+.5)-room.base-.015)<1e-7);
        for(const [from,to] of [[world.spawn,room.inside],[room.inside,room.entry],[room.entry,room.inside],[room.inside,world.spawn]]){
            const route=world.pathTo(to.x,to.y,from);assert.ok(route?.length,room.id+' has no indoor route');let previous=from;
            for(const next of route){assert.ok(world.canTravel(previous.x,previous.y,next.x,next.y),room.id+' crosses a wall');previous=next;}assert.deepEqual(previous,to);
        }
    }
    for(const id of ['ada-meridian','elias-index','esoteric-professor']){
        const npc=world.merchants.find(n=>n.id===id);assert.ok(npc);assert.ok(world.instituteRoomAt(npc.x,npc.z));
        assert.ok(world.pathTo(world.approaches.merchant(npc).x,world.approaches.merchant(npc).y,world.spawn));
    }
});

test('the roaming aliens, summit attendant, pub and talking parrots retain connected interaction routes',()=>{
    const aliens=world.merchants.filter(n=>n.alienId);assert.equal(aliens.length,6);
    for(const npc of aliens){assert.ok(npc.roam);assert.ok(npc.roam.points.length>2);for(const p of npc.roam.points)assert.ok(world.clearAt(p.x,p.y));}
    const lift=world.merchants.find(n=>n.kind==='lift');assert.ok(lift?.roam);
    const bartender=world.merchants.find(n=>n.kind==='bartender');assert.ok(bartender);
    for(const target of [world.approaches.merchant(lift),world.approaches.merchant(bartender),...world.parrots.map(n=>n.approach)])for(const [from,to] of [[world.spawn,target],[target,world.spawn]]){
        const path=world.pathTo(to.x,to.y,from);assert.ok(path?.length);let previous=from;for(const p of path){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}assert.deepEqual(previous,to);
    }
    assert.ok(world.objects.filter(o=>o.arch==='mansion').length>=12);
    assert.ok(world.objects.filter(o=>o.arch==='shipyard').length>=2);
});

test('the fishing spot faces open water and connects to the roaming Cotogna chef in both directions',()=>{
    const spot=world.fishingSite,chef=world.merchants.find(n=>n.id==='cotogna-chef'),restaurant=world.sights.find(s=>s.id==='cotogna');
    assert.equal(spot.kind,'fishing');assert.ok(world.clearAt(spot.entry.x,spot.entry.y));assert.equal(world.landClearAt(spot.water.x-.5,spot.water.z-.5),false);
    assert.ok(chef.roam);assert.ok(Math.hypot(chef.x-.5-restaurant.entry.x,chef.z-.5-restaurant.entry.y)<4);
    const approach=world.approaches.merchant(chef);
    for(const [from,to] of [[world.spawn,spot.entry],[spot.entry,approach],[approach,spot.entry]]){
        const path=world.pathTo(to.x,to.y,from);assert.ok(path?.length);let previous=from;
        for(const next of path){assert.ok(world.canTravel(previous.x,previous.y,next.x,next.y));previous=next;}
        assert.ok(Math.hypot(previous.x-to.x,previous.y-to.y)<1e-7);
    }
});

test('the Ferrari can leave the Bay Bridge, drive through SF, park, and return to the dealership',()=>{
    const car=world.ferrari,saved={...car.state,localPath:[...car.state.localPath]},dealer=car.sample(car.dealer);
    const finish=()=>{for(let frame=0;frame<5000;frame++){
        const previous=car.position,event=car.update(.025),at=car.position;
        assert.ok(Math.hypot(at.x-previous.x,at.z-previous.z)<=4.6*20*.025+1e-7,'fast driving must respect the frame travel budget');
        assert.ok(world.landClearAt(at.x-.5,at.z-.5),'the car must remain on connected dry ground');
        if(event==='arrived')return;if(event==='empty')assert.fail('a city trip should fit in the tank');
    }assert.fail('Ferrari never arrived');};
    try{
        car.mount();assert.ok(car.driveTo(world.spawn.x+.5,world.spawn.y+.5));finish();
        assert.ok(Math.hypot(car.position.x-world.spawn.x-.5,car.position.z-world.spawn.y-.5)<1e-7);
        car.park();assert.equal(car.state.riding,false);assert.ok(car.state.localPosition,'parking in SF must retain the city position');
        car.mount();assert.ok(car.driveTo(dealer.x,dealer.z));finish();
        assert.equal(car.state.localPosition,null);assert.ok(Math.abs(car.state.distance-car.dealer)<1e-7);
    }finally{Object.assign(car.state,saved);}
});

test('the monkey escape has reachable motorcycle parking, a connected keeper post and a ride to the professor',()=>{
    const pen=world.sights.find(s=>s.id==='zoo-monkeys'),m=world.motorcycle,keeper=world.monkeyKeeper,professor=world.merchants.find(n=>n.id==='ada-meridian');
    assert.ok(Math.hypot(m.home.x-pen.entry.x,m.home.y-pen.entry.y)<3,'the motorcycle must be conveniently parked by the monkey habitat');
    assert.ok(Math.hypot(keeper.home.x-pen.entry.x,keeper.home.y-pen.entry.y)>3,'the player needs time to reach a pre-rented motorcycle');
    for(const [from,to] of [[pen.entry,m.home],[keeper.home,pen.entry],[m.home,professor.approach],[professor.approach,m.home]]){
        const path=world.pathTo(to.x,to.y,from);assert.ok(path);let previous=from;for(const next of path){assert.ok(world.canTravel(previous.x,previous.y,next.x,next.y));previous=next;}assert.ok(Math.hypot(previous.x-to.x,previous.y-to.y)<1e-7);
    }
    assert.ok(world.clearAt(m.home.x,m.home.y));assert.ok(world.clearAt(keeper.home.x,keeper.home.y));
});

test('They Live characters stand on connected ground and the Berkeley courtyard matches walking and picking',()=>{
    const npcs=world.merchants.filter(n=>n.alienId||['clerk','armorer','esoteric'].includes(n.questRole));
    assert.equal(npcs.filter(n=>n.alienId).length,6);
    for(const npc of npcs){
        assert.ok(world.clearAt(npc.x-.5,npc.z-.5),npc.id+' stands in an obstacle');
        const to=world.approaches.merchant(npc);assert.ok(Math.hypot(to.x+.5-npc.x,to.y+.5-npc.z)<1.8);
        assert.ok(world.pathTo(to.x,to.y,world.spawn));assert.ok(world.pathTo(world.spawn.x,world.spawn.y,to));
    }
    const c=world.esotericCampus;
    for(const [u,v] of [[0,.3],[0,1.9],[-2,2.6],[2,2.6]]){
        const p=c.point(u,v),target={x:p.x-.5,y:p.z-.5},hit=c.raycast({origin:[p.x,20,p.z],dir:[0,-1,0]});assert.ok(hit);
        assert.ok(Math.abs(hit.point[1]-world.characterGround(p.x,p.z))<1e-7);
        for(const [a,b] of [[world.spawn,target],[target,world.spawn]]){const path=world.pathTo(b.x,b.y,a);assert.ok(path);let previous=a;for(const next of path){assert.ok(world.canTravel(previous.x,previous.y,next.x,next.y));previous=next;}assert.deepEqual(previous,b);}
    }
    const unreachable=c.point(10,2.65);assert.equal(world.clearAt(unreachable.x-.5,unreachable.z-.5),false,'the campus must not make surrounding ground walkable');
});

test('the square is inhabited and the skateboarding dog now patrols next to Dolores Park',()=>{
    assert.ok(world.squareLife.people.length>=4);
    for(const p of world.squareLife.people)for(const [x,z] of p.points)assert.ok(world.clearAt(x-.5,z-.5),'square pedestrian crosses a prop');
    const dog=world.skateDog.state,park=world.sights.find(s=>s.id==='dolores'),hall=world.sights.find(s=>s.id==='cityhall');
    assert.ok(Math.hypot(dog.x-park.entry.x-.5,dog.z-park.entry.y-.5)<5);
    assert.ok(Math.hypot(dog.x-hall.entry.x,dog.z-hall.entry.y)>15);
});

test('every southern street block is lit and lamp bases clear roads, crossings, and doors',()=>{
    const plan=world.southernNeighborhood.lightPlan;assert.ok(plan.blocks.length>=75);assert.deepEqual(plan.unlit,[]);
    assert.equal(plan.lamps,world.southernNeighborhood.lamps);
    for(const block of plan.blocks){
        assert.ok(block.fixtures.length>0,block.street+' has no lamp');
        assert.equal(block.targetFixtures,Math.ceil(block.length/12));assert.ok(block.fixtures.length<=block.targetFixtures,'a block exceeds its lighting budget');
        for(const id of block.fixtures)assert.ok(plan.lamps[id].block===block.id||plan.lamps[id].blocks?.includes(block.id));
        for(const p of [block.a,block.b])assert.ok(block.fixtures.some(id=>Math.hypot(plan.lamps[id].x-p[0],plan.lamps[id].z-p[1])<=plan.maxSpacing/2+1.25),'a block end is too far from its assigned lamps');
    }
    assert.ok(plan.lamps.length<250,'the southern grid should not return to its previous 416 fixtures');
    for(const [i,a] of plan.lamps.entries())for(const b of plan.lamps.slice(i+1))assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=plan.minSeparation-1e-8,'two posts are too close together');
    for(const lamp of plan.lamps){
        for(const [dx,dz] of [[0,0],[.085,0],[-.085,0],[0,.085],[0,-.085]])assert.equal(world.groundSurfaceAt(lamp.x+dx,lamp.z+dz),'sidewalk');
        for(const door of plan.avoid)assert.ok(Math.hypot(lamp.x-door.x,lamp.z-door.z)>=plan.doorClearance-1e-8,'a lamp obscures an entrance');
    }
    const styles=new Set(plan.lamps.map(l=>l.style));assert.equal(styles.size,5,'southern fixtures must have genuinely varied silhouettes');
    for(const style of styles)assert.ok(plan.lamps.filter(l=>l.style===style).length>=plan.lamps.length*.05,'variation should extend throughout the southern grid');
});

test('central SF has curb lighting across the whole west-east band without a fixture cap',()=>{
    const plan=world.cityLightPlan;assert.ok(plan.lamps.length>200);assert.deepEqual(plan.unlit,[]);
    assert.equal(world.objects.filter(o=>o.lamp).length,plan.lamps.length);
    for(const block of plan.blocks){
        assert.ok(block.fixtures.length,block.street+' has an unlit block');
        for(const p of [block.a,block.b])assert.ok(plan.lamps.some(l=>Math.hypot(l.x-p[0],l.z-p[1])<5.3),block.street+' has an unlit block end');
    }
    const middle=plan.lamps.filter(l=>l.z>=38&&l.z<70);
    assert.ok(middle.filter(l=>l.x<40).length>=25,'the western middle streets need fixtures');
    assert.ok(middle.filter(l=>l.x>=55).length>=25,'the eastern middle streets need fixtures');
    for(const street of ['Geary Boulevard','Fulton Street','Fell Street','Oak Street','Haight Street','Lincoln Way','Irving Street','Noriega Street','Sixteenth Street','Twentieth Street'])assert.ok(plan.lamps.some(l=>l.street===street),'missing lighting on '+street);
    for(const l of plan.lamps){
        for(const d of plan.avoid)assert.ok(Math.hypot(l.x-d.x,l.z-d.z)>=(d.clearance??plan.doorClearance)-1e-8,'a fixture obscures a doorway');
        if(l.kind==='road')for(const [dx,dz] of [[0,0],[.085,0],[-.085,0],[0,.085],[0,-.085]])assert.equal(world.groundSurfaceAt(l.x+dx,l.z+dz),'sidewalk');
    }
});

test('southern NPC interactions can summon officers on the regional grid and lead to capture',()=>{
    const player={...PACIFICA_PARK.entry,angle:0};let caught=0;
    const chase=createPoliceChase({player,nearest:world.airship.nearest,routeTo:(x,y,from)=>world.pathTo(x,y,from),canCapture:(o,p)=>world.canTravel(o.x,o.y,p.x,p.y),onArrest:()=>caught++});
    chase.start();assert.equal(chase.state.officers.length,3);
    for(const officer of chase.state.officers)assert.ok(world.clearAt(officer.x,officer.y));
    for(let i=0;i<600&&!caught;i++)chase.update(1/60,4.6);
    assert.equal(caught,1);assert.equal(chase.state.jailed,true);
});

test('the populated southern grid and public park are reachable, and pedestrians stay on open pavement',()=>{
    assert.ok(world.southernNeighborhood.houses.reduce((n,h)=>n+(h.homes||0),0)>=60);
    const park=world.sights.find(s=>s.id===PACIFICA_PARK.id);assert.ok(park);
    for(const to of [park.entry,...PENINSULA_STREETS.flatMap(r=>[r.points[0],r.points.at(-1)]).map(([x,z])=>({x:x-.5,y:z-.5}))]){
        for(const [from,target] of [[world.spawn,to],[to,world.spawn]]){
            const route=world.pathTo(target.x,target.y,from);assert.ok(route);let previous=from;
            for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}
        }
    }
    assert.ok(world.southernLife.people.length>=18);
    for(const p of world.southernLife.people)for(const [x,z] of p.points)assert.ok(world.clearAt(x-.5,z-.5),'a pedestrian route crosses an obstacle');
    const residents=world.merchants.filter(n=>n.id.startsWith('commons-'));assert.equal(residents.length,2);
    for(const npc of residents){const to=world.approaches.merchant(npc);assert.ok(world.clearAt(to.x,to.y));assert.ok(world.pathTo(to.x,to.y,world.spawn));}
});

test('zoo animal habitats stay clear of Lake Merced and retain reachable viewing spots',()=>{
    for(const site of world.sights.filter(s=>s.kind==='animals')){
        const o=site.object;
        for(let z=o.y;z<=o.y+o.d;z+=.1)for(let x=o.x;x<=o.x+o.w;x+=.1){
            if(z>=96){assert.ok(world.southernTerrain.contains(x,z));continue;}
            const region=world.tiles.waterTiles.regionAt(x,z);assert.ok(!['water','sea'].includes(region.type),site.id+' intersects '+region.type+' at '+x+','+z);
        }
        assert.ok(world.clearAt(site.entry.x,site.entry.y));
        assert.ok(world.pathTo(site.entry.x,site.entry.y,world.spawn));
        assert.ok(world.pathTo(world.spawn.x,world.spawn.y,site.entry));
    }
});

test('Fulton Street has a continuous level road cross-section through all junctions and landmark frontages',()=>{
    const street=world.tiles.routes.find(r=>r.name==='Fulton Street'),[a,b]=street.points;
    let low=Infinity,high=-Infinity,previous=null;
    for(let x=a[0]+.5;x<b[0]-.5;x+=.125){
        const center=world.terrainHeight(x,a[1]);low=Math.min(low,center);high=Math.max(high,center);
        for(const offset of [-.7,-.5,-.25,.25,.5,.7])assert.ok(Math.abs(world.terrainHeight(x,a[1]+offset)-center)<1e-8,'curb or road buckles near '+x+','+(a[1]+offset));
        if(previous!==null)assert.ok(Math.abs(center-previous)<.075,'the street must climb smoothly');previous=center;
    }
    assert.ok(high-low>1,'keep the park’s eastward hill grade');
});

test('a driver stranded away from a pump can walk to the gas station and back to the parked Ferrari',()=>{
    const station=world.highwaySites.find(s=>s.id==='fuel-outbound'),p=world.ferrari.sample(station.distance-25),parked={x:p.x-.5,y:p.z-.5};
    for(const [from,to] of [[parked,station.entry],[station.entry,parked]]){
        const route=world.pathTo(to.x,to.y,from);assert.ok(route?.length);
        let previous=from;for(const point of route){assert.ok(world.canTravel(previous.x,previous.y,point.x,point.y));previous=point;}
        assert.deepEqual(previous,to);
    }
});

test('both South Bay institutes and every researcher conversation connect to the city in both directions',()=>{
    const campuses=world.sights.filter(s=>s.kind==='research-institute'),npcs=world.merchants.filter(n=>n.researcher);
    assert.equal(campuses.length,2);assert.equal(npcs.length,6);
    for(const target of [...campuses.map(c=>c.entry),...npcs.map(n=>world.approaches.merchant(n))]){
        assert.ok(world.clearAt(target.x,target.y));
        for(const [from,to] of [[world.spawn,target],[target,world.spawn]]){
            const route=world.pathTo(to.x,to.y,from);assert.ok(route?.length);
            let previous=from;for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}
            assert.deepEqual(previous,to);
        }
        assert.ok(Math.abs(world.characterGround(target.x+.5,target.y+.5)-1.6)<.1,'campus paving and standing height agree');
    }
    for(const npc of npcs)for(const [i,[x,z]] of npc.points.entries()){
        const next=npc.points[(i+1)%npc.points.length];
        assert.ok(world.canTravel(x-.5,z-.5,next[0]-.5,next[1]-.5),npc.id+' stroll crosses a map obstacle');
        const length=Math.hypot(next[0]-x,next[1]-z);
        for(let step=0;step<=Math.ceil(length/.1);step++){
            const f=step/Math.ceil(length/.1),at={...npc,x:x+(next[0]-x)*f,z:z+(next[1]-z)*f};
            // The live approach getter is checked at every sampled location,
            // including the narrow strip in front of the courtyard bench.
            const target={x:at.x-.5,y:at.z+.15};
            assert.ok(world.clearAt(at.x-.5,at.z-.5),npc.id+' is not on walkable ground');
            assert.ok(world.clearAt(target.x,target.y),npc.id+' has an unreachable moving conversation approach');
        }
    }
});

test('every intended destination and shop interior has valid routes in both directions',()=>{
    const report=auditWorldNavigation(world);assert.equal(report.ok,true,report.errors.join('\n'));
    assert.ok(report.destinations>=77);assert.ok(report.routes.length>=158);assert.ok(report.graph.nodes>40000);
    assert.deepEqual(report.observations.sort(),['bottle-post-machine','prometheus','rail-pit']);
    for(const id of ['zoo -> Tahoe spaceport','Tahoe spaceport -> zoo','airport spaceport -> UCSF','UCSF -> airport spaceport'])assert.ok(report.routes.some(r=>r.id===id));
    for(const p of world.places)assert.ok(report.routes.some(r=>r.id==='spawn -> '+p.id+':inside'));
});

test('the Golden Gate connects the city and Marin using the visible deck in both directions',()=>{
    const bridge=world.goldenGate,marin=bridge.gate('marin');
    assert.ok(marin.y<0,'the crossing must reach the actual Marin shore');
    for(const [from,to] of [[world.spawn,marin],[marin,world.spawn],[marin,world.tahoe.spaceport.entry],[world.tahoe.spaceport.entry,marin]]){
        const route=world.pathTo(to.x,to.y,from);assert.ok(route?.length);
        let previous=from;
        for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}
        assert.deepEqual(previous,to);
    }
    for(const s of bridge.segments)for(const t of [.1,.5,.9]){
        const x=s.a.x+s.dx*t,z=s.a.z+s.dz*t,deck=bridge.at(x,z),hit=bridge.raycast({origin:[x,30,z],dir:[0,-1,0]});
        assert.ok(hit);assert.ok(Math.abs(hit.point[1]-deck.height)<1e-7);
        assert.ok(Math.abs(world.characterGround(x,z)-deck.height-.015)<1e-7);
        if(z<0)assert.ok(deck.height>=marinElevation(x/1.5,z/1.5),'Marin must not bury the approach');
        if(z>10)assert.ok(deck.height>=world.terrainHeight(x,z),'the city must not bury the approach');
        for(const offset of [-.6,.6]){
            const target=bridge.targetAt(x+s.nx*offset,z+s.nz*offset);assert.ok(target);
            assert.ok(world.clearAt(target.x,target.y));
        }
    }
    assert.equal(bridge.contains(28.2+2,8),false,'water next to the bridge stays impassable');
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

test('each SpaceX pad has an attendant with a reachable boarding conversation',()=>{
    const crew=world.merchants.filter(npc=>npc.kind==='crew');assert.equal(crew.length,2);
    assert.deepEqual(crew.map(npc=>npc.siteId).sort(),['sf-spaceport','tahoe-spaceport']);
    for(const npc of crew){
        const entry=world.approaches.merchant(npc);
        assert.ok(world.clearAt(npc.x-.5,npc.z-.5),'attendant must stand on accessible ground');
        assert.ok(Math.hypot(entry.x+.5-npc.x,entry.y+.5-npc.z)<2);
        assert.ok(world.pathTo(entry.x,entry.y,world.spawn));
    }
});

test('Nightlife is reachable inside from the city, and both patrons stand on the walkable dance floor',()=>{
    assert.ok(world.nightclub);assert.equal(world.sights.some(s=>s.id==='peninsula-cafe'),false);
    const patrons=world.restaurantDiners.filter(n=>n.club);assert.equal(patrons.length,2);
    assert.deepEqual(patrons.map(p=>p.label).sort(),['Man','Woman']);
    for(const destination of [world.nightclub.inside,...patrons.map(n=>({x:n.x-.5,y:n.z-.5}))]){
        assert.ok(world.clearAt(destination.x,destination.y));
        const route=world.pathTo(destination.x,destination.y,world.spawn);assert.ok(route?.length);
        let previous=world.spawn;for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}
        assert.ok(world.pathTo(world.spawn.x,world.spawn.y,destination));
        assert.ok(Math.abs(world.characterGround(destination.x+.5,destination.y+.5)-world.nightclub.base)<.05);
    }
});

test('minimap misses snap to reachable city, shoreline, bridge, airport, and Tahoe destinations',()=>{
    const hut=world.sights.find(s=>s.id==='ski-rental'),bridge=world.goldenGate.gate('marin');
    const scenarios=[
        {from:world.spawn,click:{x:-8,y:40}},
        {from:world.spawn,click:{x:82,y:16}},
        {from:world.spawn,click:{x:world.places[0].x, y:world.places[0].y}},
        {from:bridge,click:{x:bridge.x+2,y:bridge.y}},
        {from:{x:83.7,y:109.5},click:{x:88,y:105}},
        {from:world.tahoe.summitEntry,click:{x:hut.object.x+.8,y:hut.object.y+.8}}
    ];
    for(const {from,click} of scenarios){
        const target=world.minimapTarget(click.x,click.y,from);assert.ok(target);
        assert.ok(world.clearAt(target.x,target.y),'adjusted destination must be walkable');
        assert.ok(world.pathTo(target.x,target.y,from),'adjusted destination must be reachable');
        assert.ok(Math.hypot(target.x-click.x,target.y-click.y)<=Math.hypot(from.x-click.x,from.y-click.y)+1e-9);
    }
    const p=world.spawn;assert.deepEqual(world.minimapTarget(p.x,p.y,p),p,'valid clicks must keep their exact position');
    const region=world.navigation.regionAt(p.x,p.y),shore=world.minimapTarget(-8,40,p),expected=world.navigation.nearest(-8,40,Infinity,(x,y)=>world.navigation.regionAt(x,y)===region);
    assert.equal((shore.x+8)**2+(shore.y-40)**2,(expected.x+8)**2+(expected.y-40)**2,'offshore clicks must select the closest reachable shoreline tile');
});

test('trees replace the shallow houses south of Golden Gate Park without obstructing Lincoln Way',()=>{
    const trees=world.objects.filter(o=>o.district==='park-edge-trees'),edge=world.parkSouthEdge;
    assert.ok(trees.length>=14);assert.equal(world.objects.filter(o=>o.district==='parkside').length,0);
    for(const tree of trees){assert.equal(tree.street,'Lincoln Way');assert.equal(tree.preserveGround,true);assert.ok(tree.y>edge.north&&tree.y+tree.d<edge.south);const m=world.tiles,x=tree.x+tree.w/2,z=tree.y+tree.d/2;assert.ok(['grass','sand'].includes(m.tiles[Math.floor(z/m.step)*m.size+Math.floor(x/m.step)].base),'trees inherit the existing grass or coastal sand');}
    assert.equal(world.objects.filter(o=>o.arch&&o.x<edge.east&&o.x+o.w>edge.west&&o.y<edge.south&&o.y+o.d>edge.north).length,0,'no house or garage should return to the grove');
    const street=world.tiles.routes.find(r=>r.name==='Lincoln Way'),[a,b]=street.points;
    for(const offset of [-.58,0]){
        let previous={x:a[0]+.5,y:a[1]+offset-.5};
        for(let x=a[0]+1;x<b[0]-.5;x+=.25){const p={x:x-.5,y:a[1]+offset-.5};assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y),'trees must leave the road and sidewalks open: '+JSON.stringify({previous,p,from:world.navigation.describe(previous.x,previous.y),to:world.navigation.describe(p.x,p.y)}));previous=p;}
    }
});

test('Times Square in the southern hills is connected to the city and carries its examination text',()=>{
    const square=world.sights.find(s=>s.id==='times-square');assert.ok(square);
    assert.equal(square.description,"Hillsborough has been replaced with Times Square. Don't like it? Anything is possible in Loeberland.");
    for(const [from,to] of [[world.spawn,square.entry],[square.entry,world.spawn]]){
        const route=world.pathTo(to.x,to.y,from);assert.ok(route?.length);
        let previous=from;for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}
        assert.deepEqual(previous,to);
    }
});

test('the gym, capital partner, and every highway service have valid production routes',()=>{
    for(const id of ['sf-fitness','sand-hill-capital','in-n-out','ferrari-dealer','fuel-outbound','fuel-return','fuel-tahoe','ferrari-car']){
        const site=world.sights.find(s=>s.id===id);assert.ok(site,id);const route=world.pathTo(site.entry.x,site.entry.y,world.spawn);assert.ok(route?.length,id);
        let previous=world.spawn;for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y),id);previous=p;}
        assert.ok(world.pathTo(world.spawn.x,world.spawn.y,site.entry));
    }
    const partner=world.merchants.find(n=>n.kind==='capital');assert.ok(partner);assert.ok(world.clearAt(partner.x-.5,partner.z-.5));
});

test('open southern grass connects to Times Square while buildings, tree trunks, and water remain solid',()=>{
    const square=world.sights.find(s=>s.id==='times-square');
    const grass=[];for(let z=146;z<176;z+=3)for(let x=16;x<82;x+=3)if(airportSurfaceTypeAt(x,z)==='grass'&&world.clearAt(x-.5,z-.5))grass.push([x,z]);
    assert.ok(grass.length>50);
    for(const [x,z] of grass.filter((_,i)=>i%17===0)){
        assert.equal(airportSurfaceTypeAt(x,z),'grass');assert.ok(world.clearAt(x-.5,z-.5),'open grass is eligible for walking');
        assert.deepEqual(world.minimapTarget(x-.5,z-.5,square.entry),{x:x-.5,y:z-.5},'minimap clicks keep the requested grass destination');
        const route=world.pathTo(x-.5,z-.5,square.entry);assert.ok(route?.length);
        let previous=square.entry;for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}
        assert.deepEqual(previous,{x:x-.5,y:z-.5});
    }
    for(const [x,z] of [[10,155],[85,156],[64.6,135.1],[43.5,134.4],[63,149.4]])assert.equal(world.clearAt(x-.5,z-.5),false,'water and actual buildings block walking');
    for(const tree of world.southernNeighborhood.trees)assert.equal(world.clearAt(tree.x-.5,tree.z-.5),false,'a tree trunk is solid');
    const report=auditNavigationGrid(world.airship.groundNavigation.graph);assert.ok(report.ok,report.errors.join('\n'));
});

test('the Sand Hill partner faces the curb on the south side of the office',()=>{
    const npc=world.merchants.find(n=>n.id==='sand-hill-partner');
    assert.ok(Math.sin(npc.angle)>.99);assert.ok(Math.abs(Math.cos(npc.angle))<.01);
});

test('the southern expansion has varied dense frontages, wooded public land, and reachable quest objectives',()=>{
    const homes=world.southernNeighborhood.houses;
    assert.ok(homes.length>90);assert.ok(homes.reduce((n,h)=>n+(h.homes||0),0)>200);
    assert.ok(new Set(homes.map(h=>h.district)).size>=6,'distinct coastal, Victorian, and mixed-use streets');
    const woods=world.sights.find(s=>s.id==='sand-hill-woods');assert.ok(woods);
    const trees=world.southernNeighborhood.trees.filter(p=>p.x>37.5&&p.x<52&&p.z>129&&p.z<144.4);assert.ok(trees.length>=10,'the park must be wooded');
    const professor=world.merchants.find(n=>n.id==='ada-meridian'),worker=world.merchants.find(n=>n.id==='rail-lunch-worker'),monkeys=world.sights.find(s=>s.id==='zoo-monkeys');
    assert.equal(professor.name,'Professor Ada Meridian');
    assert.ok(world.sights.some(s=>s.label==='California Institute for Consciousness Research'));
    for(const from of [world.spawn,monkeys.entry,professor.approach])for(const to of [monkeys.entry,professor.approach,worker.approach,woods.entry]){
        const route=world.pathTo(to.x,to.y,from);assert.ok(route,'a quest stage must be reachable');let previous=from;
        for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}
    }
});

test('the sunglasses pickup sits on reachable Ocean Beach sand and remains accessible from the southern neighborhoods',()=>{
    const s=world.sunglassesSite;assert.equal(s.kind,'sunglasses');assert.equal(world.navigation.describe(s.entry.x,s.entry.y).type,'sand');
    assert.ok(s.x<15&&s.z>40&&s.z<80,'the pickup is on the Pacific beach');
    const square=world.sights.find(p=>p.id==='times-square');
    for(const from of [world.spawn,square.entry]){
        const route=world.pathTo(s.entry.x,s.entry.y,from);assert.ok(route?.length);let previous=from;
        for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}
    }
    assert.deepEqual(world.minimapTarget(s.entry.x,s.entry.y,world.spawn),s.entry);
});

test('the city edge has multiple paved crossings, lit blocks, and its own pedestrians',()=>{
    assert.ok(world.airship.gates.length>=8);
    for(const gate of world.airship.gates){
        for(const dx of [-.375,0,.375])for(const z of [95.875,96.125])assert.equal(world.groundSurfaceAt(gate.x+.5+dx,z),'road','paving must meet across the region boundary');
        const south={x:gate.x,y:99};
        for(const [from,to] of [[gate,south],[south,gate]]){const route=world.pathTo(to.x,to.y,from);assert.ok(route);let previous=from;for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}}
    }
    const lamps=world.southernNeighborhood.lamps;
    assert.ok(lamps.filter(p=>p.z<96).length>=20);assert.ok(lamps.filter(p=>p.x<21&&p.z>=96).length>=15,'the coastal roads need fixtures too');
    assert.ok(world.southernLife.people.filter(p=>!p.rider&&p.z<96).length>=20);
    assert.ok(world.southernLife.people.filter(p=>!p.rider&&p.z>=96).length>=40);
    assert.ok(world.objects.filter(o=>o.arch==='townhomes'&&o.y>80&&o.y<96).reduce((n,o)=>n+o.homes,0)>=40,'the bottom city blocks need residential detail');
});

test('Telegraph Hill homes stay low and steep foundations get shorter houses',()=>{
    const houses=world.objects.filter(o=>o.arch==='townhomes'),coit=world.sights.find(s=>s.id==='coit').object,cx=coit.x+coit.w/2,cz=coit.y+coit.d/2,near=houses.filter(o=>Math.abs(o.x+o.w/2-cx)<7&&Math.abs(o.y+o.d/2-cz)<5.5);
    assert.ok(near.reduce((n,o)=>n+o.homes,0)>=6);for(const o of near)for(const h of o.houses)assert.ok(h.storeys===1&&h.H<1.9,'a tall house remains beside Coit Tower');
    const steep=houses.flatMap(o=>o.houses).filter(h=>h.foundationExposure>1.45);assert.ok(steep.length>0);
    for(const h of steep)assert.ok(h.storeys===1&&h.H<1.9,'a high foundation must not also support a tall house');
});

test('special-purpose NPCs mill around connected areas of at most three tiles with reachable live approaches',()=>{
    const life=world.specialNPCLife;assert.deepEqual(life.unavailable,[]);assert.ok(life.people.length>=18);
    for(const id of ['founder-merchant','secondary-merchant','sand-hill-partner','square-foreman','city-hall-clerk','industrial-armorer','esoteric-professor','sf-spaceport-attendant','tahoe-spaceport-attendant'])assert.ok(life.people.some(n=>n.id===id),id+' should roam');
    const fields=['x','z','angle','base','hold','waiting','moving','motion','phase'],saved=life.people.map(n=>({npc:n,actor:Object.fromEntries(fields.map(k=>[k,n[k]])),roam:{...n.roam}})),walked=new Set(),paused=new Set();
    try{
        for(const n of life.people){
            const r=n.roam;assert.ok(r.bounds.east-r.bounds.west<=3);assert.ok(r.bounds.south-r.bounds.north<=3);
            let previous=r.points[0];for(const next of r.points.slice(1)){assert.ok(world.canTravel(previous.x,previous.y,next.x,next.y),n.id+' route crosses a solid tile');previous=next;}
        }
        for(let frame=0;frame<1600;frame++){
            life.update(.05);
            for(const n of life.people){
                const r=n.roam,x=n.x-.5,y=n.z-.5;assert.ok(world.landClearAt(x,y),n.id+' walked off connected ground');
                assert.ok(x>=r.bounds.west-1e-8&&x<=r.bounds.east+1e-8&&y>=r.bounds.north-1e-8&&y<=r.bounds.south+1e-8,n.id+' left its home area');
                if(n.moving)walked.add(n.id);else if(r.stops)paused.add(n.id);
                if(frame%40===0){const p=world.approaches.merchant(n);assert.ok(world.clearAt(p.x,p.y));assert.ok(world.canTravel(x,y,p.x,p.y),n.id+' cannot be approached at its live position');assert.ok(Math.hypot(p.x-x,p.y-y)<1.1);}
            }
        }
        assert.equal(walked.size,life.people.length);assert.equal(paused.size,life.people.length);
    }finally{for(const s of saved){Object.assign(s.npc,s.actor);Object.assign(s.npc.roam,s.roam);}}
});


test('Lucinda’s has native connected delivery routes; traffic and airport billboards stay on legal parcels',()=>{
    const deli=world.sights.find(s=>s.id==='lucindas-deli'),painted=world.sights.find(s=>s.id==='painted');
    assert.ok(Math.hypot(deli.entry.x-painted.entry.x,deli.entry.y-painted.entry.y)<6,'the deli belongs to Alamo Square');
    const targets=[world.spawn,painted.entry,world.sights.find(s=>s.id==='airship').entry];
    for(const target of targets){
        const route=world.pathTo(target.x,target.y,deli.entry);assert.ok(route);let previous=deli.entry;
        for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}assert.deepEqual(previous,target);
    }
    const delivery=world.deli;assert.ok(delivery.order(targets[1]).ok);
    for(let i=0;i<2500&&delivery.state.pending;i++){delivery.update(.05,targets[1]);assert.ok(world.landClearAt(delivery.state.position.x,delivery.state.position.y));}
    assert.equal(delivery.state.pending,false);assert.equal(delivery.state.sandwiches,1);
    assert.equal(world.streetTraffic.cars.length,4);const before=world.streetTraffic.cars.map(c=>({...c}));
    for(let i=0;i<600;i++){world.streetTraffic.update(.05);for(const c of world.streetTraffic.cars){assert.ok(world.landClearAt(c.x-.5,c.z-.5));assert.equal(world.groundSurfaceAt(c.x,c.z),'road');}}
    for(const [i,car] of world.streetTraffic.cars.entries()){
        const distance=car.travel-before[i].travel,wait=(car.redWait||0)-(before[i].redWait||0);
        assert.ok(distance>0,'traffic continues after red lights');assert.ok(Math.abs(distance-car.speed*(30-wait))<1e-6,'travel time must account exactly for signal waits');
    }
    assert.equal(world.airportAds.length,6);assert.equal(new Set(world.airportAds.map(a=>a.art)).size,3);
    for(const a of world.airportAds){assert.ok(a.z>=79&&a.z<96);assert.notEqual(world.groundSurfaceAt(a.x,a.z),'road');}
});


test('the SoMa AI Lab has a native entrance, walkable office and recruiter conversation route',()=>{
    const lab=world.places.find(p=>p.id==='ai-lab'),recruiter=world.merchants.find(n=>n.kind==='recruiter');assert.ok(lab?.object&&recruiter);assert.ok(lab.interiorObstacles.length>=3);
    assert.ok(marketSide((lab.x+lab.w/2)/1.5,(lab.y+lab.d/2)/1.5)>0,'the lab is south of Market Street');assert.ok(lab.y/1.5<40);
    for(const [from,to] of [[world.spawn,lab.entry],[lab.entry,lab.inside],[lab.inside,lab.entry],[lab.entry,world.approaches.merchant(recruiter)]]){
        const path=world.pathTo(to.x,to.y,from);assert.ok(path);let previous=from;for(const p of path){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}assert.deepEqual(previous,to);
    }
    const furniture=navigationObstacles(world.objects).filter(o=>o.id.startsWith('ai-lab:furniture-'));assert.equal(furniture.length,5);for(const o of furniture)assert.equal(o.polygon.length,4);
});


test('forward rolls use native traversal across city streets, grass, the shoreline and office interiors',()=>{
    const points=[world.spawn,...['beach','painted','park'].map(id=>world.sights.find(s=>s.id===id).entry),world.places.find(p=>p.id==='ai-lab').inside];let valid=0;
    for(const from of points)for(let i=0;i<16;i++){
        const target=forwardRollTarget(from,i*Math.PI/8,4.6*FORWARD_ROLL_SPEED*FORWARD_ROLL_DURATION,(a,b)=>world.canTravel(a.x,a.y,b.x,b.y));if(!target)continue;valid++;
        assert.ok(world.canTravel(from.x,from.y,target.x,target.y));const distance=Math.hypot(target.x-from.x,target.y-from.y),steps=Math.ceil(distance/.05);
        for(let j=0;j<=steps;j++){const t=j/steps;assert.ok(world.landClearAt(from.x+(target.x-from.x)*t,from.y+(target.y-from.y)*t));}
    }
    assert.ok(valid>=20);
});


test('every conversational building has a real NPC, including reachable rental and pump staff',()=>{
    const buildings=[...world.sights,...world.places].filter(s=>buildingNPCService(s));assert.ok(buildings.length>=18);
    for(const s of buildings){
        const service=buildingNPCService(s),people=world.merchants.filter(n=>n.kind===service||n.questRole===service||service==='researcher'&&n.researcher);
        assert.ok(people.length,s.id+' needs an actual '+service);
        if(['fuel','dealership','spaceport'].includes(s.kind))assert.ok(people.some(n=>n.siteId===s.id),s.id+' needs its own attendant');
    }
    const staff=world.merchants.filter(n=>['fuel-attendant','motorcycle-clerk'].includes(n.kind));assert.equal(staff.length,5);
    for(const n of staff){
        assert.ok(world.landClearAt(n.x-.5,n.z-.5),n.id);const approach=world.approaches.merchant(n);assert.ok(approach,n.id);
        for(const [from,to] of [[world.spawn,approach],[approach,world.spawn]]){
            const path=world.pathTo(to.x,to.y,from);assert.ok(path?.length);let previous=from;for(const p of path){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}assert.deepEqual(previous,to);
        }
    }
});


test('a dry, reachable OBEY billboard stands beside the beach sunglasses without obstructing the pickup',()=>{
    const board=world.beachBillboard,shades=world.sunglassesSite;assert.ok(board);assert.ok(Math.hypot(board.x-shades.x,board.z-shades.z)<6);
    assert.equal(BILLBOARD_ART.find(a=>a.id===board.art).message,'OBEY');assert.equal(board.object.preserveGround,true);assert.ok(board.object.solid);
    for(const p of board.polygon)assert.notEqual(world.groundSurfaceAt(...p),'water');
    assert.equal(world.navigation.describe(shades.entry.x,shades.entry.y).type,'sand');
    for(const [from,to] of [[shades.entry,board.sight.entry],[board.sight.entry,shades.entry]]){
        const path=world.pathTo(to.x,to.y,from);assert.ok(path?.length);let previous=from;for(const p of path){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}assert.deepEqual(previous,to);
    }
});

test('the estate swimmers can be approached from the city without crossing houses or pool water',()=>{
    const residents=world.southernNeighborhood.residents;assert.equal(residents.length,3);
    for(const npc of residents){
        const to=npc.approach;assert.ok(world.clearAt(to.x,to.y),'poolside approach is blocked');
        const path=world.pathTo(to.x,to.y,world.spawn);assert.ok(path?.length,'estate pool has no public approach');
        let previous=world.spawn;for(const p of path){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}
        assert.deepEqual(previous,to);
    }
});

test('the salt conservation courier connects its levees to City Hall through native tile adjacency',()=>{
    const site=world.sights.find(s=>s.id==='salt-flats'),npc=world.merchants.find(n=>n.kind==='salt-activist'),clerk=world.merchants.find(n=>n.id==='city-hall-clerk');
    assert.ok(site&&npc&&clerk);assert.ok(npc.roam?.points.length>=2);
    const source=world.approaches.merchant(npc),destination=world.approaches.merchant(clerk);
    for(const [from,to] of [[source,destination],[destination,source]]){
        const path=world.pathTo(to.x,to.y,from);assert.ok(path?.length,'courier route is disconnected');
        let previous=from;for(const p of path){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}assert.deepEqual(previous,to);
    }
    assert.equal(world.clearAt(77,176.5),false,'salt water must not become walkable land');
    assert.ok(world.saltMail.collect().ok);assert.ok(world.quests.entries().some(q=>q.id==='salt-conservation-mail'&&q.stage==='carrying'));
    assert.ok(world.saltMail.deliver().ok);
});

test('the haberdasher uses a vacant curb-facing plot with reachable staff and a real native route',()=>{
    const site=world.sights.find(s=>s.id==='haberdasher'),npc=world.merchants.find(n=>n.kind==='haberdasher');assert.ok(site&&npc);assert.ok(npc.roam?.points.length>=2);
    for(const to of [site.entry,world.approaches.merchant(npc)]){
        assert.ok(world.clearAt(to.x,to.y));const route=world.pathTo(to.x,to.y,world.spawn);assert.ok(route?.length);
        let previous=world.spawn;for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}assert.deepEqual(previous,to);
    }
    for(const p of npc.roam.points)assert.ok(world.clearAt(p.x,p.y));
});

test('Tim Apple’s courtyard and the robotaxi dealership connect to the city and each other through authored paths',()=>{
    const tim=world.merchants.find(n=>n.kind==='tim-apple'),dealer=world.merchants.find(n=>n.kind==='robotaxi-sales');assert.ok(tim&&dealer);assert.ok(tim.roam?.points.length>=2);assert.ok(dealer.roam?.points.length>=2);
    const apple=world.sights.find(s=>s.id==='tim-apple-campus'),taxi=world.sights.find(s=>s.id==='tesla-robotaxi');
    const targets=[apple.entry,taxi.entry,world.approaches.merchant(tim),world.approaches.merchant(dealer)];
    for(const target of targets)for(const [from,to] of [[world.spawn,target],[target,world.spawn]]){
        const route=world.pathTo(to.x,to.y,from);assert.ok(route?.length);let previous=from;for(const p of route){assert.ok(world.canTravel(previous.x,previous.y,p.x,p.y));previous=p;}assert.deepEqual(previous,to);
    }
    const route=world.pathTo(targets[3].x,targets[3].y,targets[2]);assert.ok(route?.length);
    assert.ok(world.clearAt(42.5,172),'courtyard must be walkable');assert.equal(world.clearAt(45.6,173.3),false,'donut ring wall must be solid');
});


test('Twitter, sales conference, all indoor NPCs and the stream culvert use the real adjacency graph',()=>{
    for(const site of [TWITTER_HQ,SALES_CONFERENCE]){
        const room=world.instituteRooms.find(r=>r.id===site.id);assert.ok(room);
        for(const [from,to] of [[world.spawn,site.inside],[site.inside,site.entry],[site.entry,site.inside],[site.inside,world.spawn]]){
            const route=world.pathTo(to.x,to.y,from);assert.ok(route?.length,site.id+' unreachable');let previous=from;
            for(const next of route){assert.ok(world.canTravel(previous.x,previous.y,next.x,next.y));previous=next;}assert.deepEqual(previous,to);
        }
    }
    const actors=world.merchants.filter(n=>n.socialActor);assert.equal(actors.length,6);
    for(const n of actors){const p=world.approaches.merchant(n);assert.ok(world.landClearAt(p.x,p.y));assert.ok(world.pathTo(p.x,p.y,world.spawn));assert.ok(world.instituteRoomAt(n.x,n.z));}
    const machine=world.sights.find(s=>s.id==='bottle-post-machine');assert.equal(machine.navigationAccess,'observe-only');assert.equal(machine.description,'I never thought about how the technology worked.');assert.ok(machine.object.detailTarget);
    for(const z of [113.75,114.05,114.35])assert.ok(world.landClearAt(14.5-.5,z-.5),'culvert blocks the coastal road');
    for(let i=3;i<90;i++){
        const p=streamSample(i/100);if(inStreamCulvert(p.x,p.z))continue;
        assert.equal(airportSurfaceTypeAt(p.x,p.z),'water');assert.equal(world.landClearAt(p.x-.5,p.z-.5),false,'player walks on runoff');
    }
    const life=world.socialLife;assert.deepEqual(life.unavailable,[]);assert.equal(life.people.length,3);
    const fields=['x','z','base','angle','hold','waiting','moving','motion','phase'],saved=life.people.map(n=>({n,values:Object.fromEntries(fields.map(k=>[k,n[k]])),roam:{...n.roam}}));
    try{for(let frame=0;frame<400;frame++){
        life.update(.05);for(const n of life.people){assert.equal(world.instituteRoomAt(n.x,n.z)?.id,SALES_CONFERENCE.id);assert.ok(world.landClearAt(n.x-.5,n.z-.5));const a=world.approaches.merchant(n);assert.ok(world.landClearAt(a.x,a.y));assert.ok(world.canTravel(n.x-.5,n.z-.5,a.x,a.y));}
    }}finally{for(const s of saved){Object.assign(s.n,s.values);Object.assign(s.n.roam,s.roam);}}
});


test('all enterable storefronts have clear, two-sided windows with no masonry behind their panes',()=>{
    let checked=0;
    for(const p of world.places){
        const o=p.object,a=p.rotation||0,cx=p.x+p.w/2,cz=p.y+p.d/2,rotate=([x,y,z])=>[cx+(x-cx)*Math.cos(a)-(z-cz)*Math.sin(a),y,cz+(x-cx)*Math.sin(a)+(z-cz)*Math.cos(a)];
        for(const wall of o.walls)for(const win of wall.windows){
            assert.ok(win.transparent);const u=win.along+win.w*.23,y=win.y+win.h*.28,out=win.far?-1:1;
            for(const side of [-1,1]){
                const origin=rotate(win.isX?[win.plane+out*.4*side,y,u]:[u,y,win.plane+out*.4*side]),dir=win.isX?[-out*side,0,0]:[0,0,-out*side],direction=[dir[0]*Math.cos(a)-dir[2]*Math.sin(a),0,dir[0]*Math.sin(a)+dir[2]*Math.cos(a)],hits=[];
                for(let v=wall.start;v<wall.start+wall.count;v+=3){const i=v*11,t=rayTriangle({origin,dir:direction},...[0,11,22].map(k=>o.mesh.data.slice(i+k,i+k+3)));if(t!==null&&t<.75)hits.push({glass:isGlassVertex(o.mesh.data,v),t});}
                assert.ok(hits.some(h=>h.glass),p.id+' has no glass');assert.equal(hits.some(h=>!h.glass),false,p.id+' wall '+wall.side+' still covers a window at '+win.along);checked++;
            }
        }
    }assert.ok(checked>150);
});

test('research and social rooms have real glazing and retain solid walls in the navigation graph',()=>{
    for(const room of world.instituteRooms){
        assert.ok(meshGlassTriangles(room.object.mesh.data).length>=6,room.id+' is missing transparent panes');
        for(const section of room.object.sections.filter(s=>s.kind==='wall')){
            const glass=meshGlassTriangles(room.object.mesh.data).filter(t=>t.start>=section.start&&t.start<section.start+section.count);if(room.id==='twitter-hq'||room.id==='sales-conference')continue;
            assert.ok(glass.length>0,room.id+' wall '+section.side+' has no glass');
            const openings=instituteWindowOpenings(room,section.side,room.id==='berkeley-esoteric'?'berkeley':'research');
            for(const win of openings){
                const u=win.x+win.w*.24,v=win.y+win.h*.25,isX=section.side>=2,far=section.side%2===0,plane=isX?(far?-room.w/2:room.w/2):(far?-room.d/2:room.d/2),out=far?-1:1,a=room.rotation||0;
                for(const sign of [-1,1]){
                    const point=isX?[plane+out*.4*sign,v,u]:[u,v,plane+out*.4*sign],dir=isX?[-out*sign,0,0]:[0,0,-out*sign],ray={origin:[room.x+point[0]*Math.cos(a)-point[2]*Math.sin(a),room.base+point[1],room.z+point[0]*Math.sin(a)+point[2]*Math.cos(a)],dir:[dir[0]*Math.cos(a)-dir[2]*Math.sin(a),0,dir[0]*Math.sin(a)+dir[2]*Math.cos(a)]},hits=[];
                    const data=room.object.mesh.data;for(let k=section.start;k<section.start+section.count;k+=3){const at=k*11,t=rayTriangle(ray,...[0,11,22].map(j=>data.slice(at+j,at+j+3)));if(t!==null&&t<.75)hits.push(isGlassVertex(data,k));}
                    assert.ok(hits.includes(true),room.id+' has no glass at the aperture');assert.equal(hits.includes(false),false,room.id+' has masonry behind its window on side '+section.side);
                }
            }
        }
    }
});


test('southern neighborhoods retain distinct house families, native garden collisions and reachable local storefronts',()=>{
    const n=world.southernNeighborhood,styles=new Set(n.houses.map(h=>h.district));
    for(const style of ['coastal','garden','craftsman','deco','mediterranean'])assert.ok(styles.has(style),style+' is absent from the southern houses');
    assert.ok(n.craftSites.length>=15);assert.ok(n.streetGardens.length>=30);assert.ok(world.southernLife.people.length>=90);
    const neighbors=world.merchants.filter(n=>n.neighborhood);assert.ok(neighbors.length>=10);
    for(const s of n.craftSites){assert.ok(world.clearAt(s.entry.x,s.entry.y));assert.ok(world.pathTo(s.entry.x,s.entry.y,world.spawn));for(const polygon of s.navigationPolygons){const x=polygon.reduce((n,p)=>n+p[0]/polygon.length,0),z=polygon.reduce((n,p)=>n+p[1]/polygon.length,0);assert.equal(world.landClearAt(x-.5,z-.5),false,'a new building or garden fixture has no native collision');}}
    for(const npc of neighbors){assert.ok(npc.roam);const p=world.approaches.merchant(npc);assert.ok(world.clearAt(p.x,p.y));assert.ok(world.pathTo(p.x,p.y,world.spawn));assert.ok(npc.neighborLine.length>30);}
    for(const b of n.streetGardens)assert.equal(world.landClearAt(b.x-.5,b.z-.5),false,'a planted bed has no native collision');
});


test('airport field billboards occupy the west green strip with clear roads, homes and sight lines',()=>{
    const ads=world.airportFieldAds;assert.equal(ads.length,3);assert.equal(new Set(ads.map(a=>a.art)).size,3);
    for(const ad of ads){
        assert.ok(ad.z>96&&ad.z<132);assert.ok(ad.x<ad.roadX);assert.equal(ad.angle,0);assert.ok(BILLBOARD_ART.some(a=>a.id===ad.art));
        assert.equal(world.landClearAt(ad.x-.5,ad.z-.5),false,'the billboard needs native collision');assert.ok(world.landClearAt(ad.roadX-.5,ad.z-.5),'billboard blocks the airport road');
        for(const house of world.southernNeighborhood.houses)if(house.footprint)assert.ok(tilePolygonOverlap(ad.clearing,house.footprint)<1e-7,'a billboard overlaps a home');
        for(const t of world.southernNeighborhood.trees)assert.ok(Math.abs(t.x-ad.x)>2.1||Math.abs(t.z-ad.z)>1.5,'tree obscures airport advertising');
    }
});
