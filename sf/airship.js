import {Mesh,pose} from './geometry.js';
import {WORLD_SIZE,STREET_LAYOUT_SIZE} from './geography.js';
import {TILE_CONFIG,TILE_TYPES,buildSurfaceTile,clipTilePolygon} from './tiles.js';
import {SOUTHERN_STREETS,SOUTHERN_TRAILS,southernTrailDistance} from './southern-layout.js';

export const AIRSHIP_TERMINAL=Object.freeze({x:81.2,z:110,base:1.15,boarding:{x:83.7,y:109.5}});
export const AIRPORT_RUNWAY=Object.freeze({x:85.8,z:118.5,width:3.6,depth:31});
export const AIRPORT_SPACEPORT=Object.freeze({x:104,z:122,base:AIRSHIP_TERMINAL.base,entry:{x:103.5,y:118.7}});
export const SPACEPORT_PIER=Object.freeze({west:94.4,east:100.5,north:119,south:121.2,pad:{west:99.5,east:108,north:117,south:126}});
export const STARTUP_HQ=Object.freeze({x:70.5*WORLD_SIZE/STREET_LAYOUT_SIZE,z:134.5});
// Continue Third Street straight south, past the airport to the startup house.
// Rendering, city reservations, walking, and cartography share this centerline.
const thirdStreet=70.5*WORLD_SIZE/STREET_LAYOUT_SIZE;
export const SECOND_STREET_X=64.5*WORLD_SIZE/STREET_LAYOUT_SIZE;
export const SOUTHERN_ROADS=Object.freeze([
    {name:'Third Street south',points:[[thirdStreet,77.5*WORLD_SIZE/STREET_LAYOUT_SIZE],[thirdStreet,132.5]]},
    {name:'Second Street south',points:[[SECOND_STREET_X,77.5*WORLD_SIZE/STREET_LAYOUT_SIZE],[SECOND_STREET_X,132.5]]},
    {name:'Terminal cross street',points:[[SECOND_STREET_X,112.1],[thirdStreet,112.1]]},
    {name:'Terminal driveway',points:[[thirdStreet,109.5],[84.5,109.5]]},
    {name:'Headquarters cross street',points:[[SECOND_STREET_X-11,129.8],[thirdStreet,129.8]]},
    ...SOUTHERN_STREETS
].map(r=>Object.freeze({...r,points:Object.freeze(r.points.map(Object.freeze))})));
export const AIRSHIP_ACCESS=Object.freeze({halfWidth:.5,points:Object.freeze([
    [thirdStreet,77.5*WORLD_SIZE/STREET_LAYOUT_SIZE],[thirdStreet,132.5]
].map(Object.freeze))});
export function airportRoadDistance(x,z){
    let distance=Infinity;
    for(const {points} of SOUTHERN_ROADS){
    for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
        distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));
    }}return distance-AIRSHIP_ACCESS.halfWidth;
}
export function airportGate(worldSize=WORLD_SIZE){
    return {x:thirdStreet-.5,y:worldSize-1.5};
}
export function onAirportApron(x,z){
    const p=SPACEPORT_PIER,q=p.pad;
    return x>=80&&x<=94.8&&z>=103.2&&z<=117.5||x>=82.4&&x<=94.8&&z>=117.5&&z<=150.5||x>=p.west&&x<=p.east&&z>=p.north&&z<=p.south||x>=q.west&&x<=q.east&&z>=q.north&&z<=q.south;
}
export function airportSurfaceTypeAt(x,z){const road=airportRoadDistance(x,z),path=southernTrailDistance(x,z);return road<0?'road':path<0?'path':Math.min(road,path)<TILE_CONFIG.curbWidth?'sidewalk':'grass';}
/** The extension uses the city's exact quarter-tile material partitioner. */
export function airportRoadTiles(worldSize=WORLD_SIZE){
    const step=1/TILE_CONFIG.resolution,tiles=[],end=AIRSHIP_ACCESS.points.at(-1)[1];
    for(let z=worldSize;z<end;z+=step)for(let x=42;x<85.5;x+=step){
        const values=[[x,z],[x+step,z],[x+step,z+step],[x,z+step]].map(p=>[airportRoadDistance(...p),southernTrailDistance(...p)]);
        const tile=buildSurfaceTile('grass',values);
        if(tile.areas.road||tile.areas.path||tile.areas.sidewalk)tiles.push({x,z,step,tile});
    }return tiles;
}

/** Ground access and reversible flight are separate from the city tile grid.
 * The short southern extension joins a real, reachable city navigation node. */
export function createAirship({worldSize=96,groundHeight=()=>-.65}={}){
    const site=AIRSHIP_TERMINAL,state={active:false,phase:'ground',position:null,heading:0,speed:0,target:null},home={x:site.boarding.x,y:site.base+.03,z:site.boarding.y};
    let gate=airportGate(worldSize),cruiseHeight=28,entry=null;
    const inRect=(x,z,a,b,c,d)=>x>=a&&x<=c&&z>=b&&z<=d;
    const airportObstacles=[[85.6,103.3,91,108.5],[84.7,111.7,90.2,117],[90.2,124,94.2,129.3]];
    const gates=()=>[gate,{x:SECOND_STREET_X-.5,y:gate.y}];
    function contains(x,z){
        const pier=SPACEPORT_PIER,pad=pier.pad;
        return (z>=worldSize-2.5&&z<133&&airportRoadDistance(x,z)<=TILE_CONFIG.curbWidth-.08||southernTrailDistance(x,z)<=-.04||inRect(x,z,80,103.2,94.6,117.5)||inRect(x,z,82.4,117.5,94.6,150.3)||inRect(x,z,SECOND_STREET_X-2.5,128.7,SECOND_STREET_X+2.5,133)||inRect(x,z,pier.west,pier.north,pier.east,pier.south)||inRect(x,z,pad.west,pad.north,pad.east,pad.south))&&!airportObstacles.some(p=>inRect(x,z,...p))&&Math.hypot(x-AIRPORT_SPACEPORT.x,z-AIRPORT_SPACEPORT.z)>.9;
    }
    function segment(a,b){
        const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.12));
        for(let i=0;i<=count;i++)if(!contains(a.x+(b.x-a.x)*i/count+.5,a.y+(b.y-a.y)*i/count+.5))return false;
        return true;
    }
    function localPath(from,to){
        if(segment(from,to))return Math.hypot(from.x-to.x,from.y-to.y)<1e-6?[]:[{...to}];
        const bends=[...new Map([...SOUTHERN_ROADS,...SOUTHERN_TRAILS].flatMap(r=>r.points).map(([x,y])=>[x+','+y,{x:x-.5,y:y-.5}])).values()].filter(p=>contains(p.x+.5,p.y+.5));
        const nodes=[from,to,...gates(),...bends,{x:thirdStreet-.5,y:105},{x:thirdStreet-.5,y:116.5},{x:93.8,y:119.6},{x:100,y:119.6},{x:103.5,y:118.7},{x:106.5,y:118},{x:106.5,y:124.5},{x:100.2,y:124.5},...airportObstacles.flatMap(([a,b,c,d])=>[[a-.15,b-.15],[c+.15,b-.15],[c+.15,d+.15],[a-.15,d+.15]].map(([x,y])=>({x:x-.5,y:y-.5})).filter(p=>contains(p.x+.5,p.y+.5)))];
        const cost=nodes.map(()=>Infinity),parent=nodes.map(()=>-1),visited=new Set();cost[0]=0;
        for(let count=0;count<nodes.length;count++){
            let next=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(next<0||cost[i]<cost[next]))next=i;
            if(next<0||!Number.isFinite(cost[next]))return null;
            if(next===1){const result=[];for(let i=1;i!==0;i=parent[i])result.push({...nodes[i]});return result.reverse();}
            visited.add(next);
            for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&segment(nodes[next],nodes[i])){const value=cost[next]+Math.hypot(nodes[next].x-nodes[i].x,nodes[next].y-nodes[i].y);if(value<cost[i]){cost[i]=value;parent[i]=next;}}
        }return null;
    }
    function path(from,to,cityPath){
        const a=contains(from.x+.5,from.y+.5),b=contains(to.x+.5,to.y+.5);
        if(a&&b)return localPath(from,to);
        if(!a&&!b)return cityPath(to,from);
        let best=null,bestLength=Infinity;
        for(const entry of gates()){
            const approach=b?cityPath(entry,from):localPath(from,entry),tail=b?localPath(entry,to):cityPath(to,entry);if(!approach||!tail)continue;
            const route=[...approach,...tail];let length=0,previous=from;for(const point of route){length+=Math.hypot(point.x-previous.x,point.y-previous.y);previous=point;}
            if(length<bestLength){best=route;bestLength=length;}
        }return best;
    }
    function board(from){
        if(state.active)return false;
        entry={x:from.x,y:from.y};Object.assign(home,{x:from.x+.5,y:site.base+.03,z:from.y+.5});
        Object.assign(state,{active:true,phase:'ascending',position:{...home},heading:-Math.PI/2,speed:0,target:null});return true;
    }
    function flyTo(x,z){
        if(!state.active||!Number.isFinite(x)||!Number.isFinite(z))return false;
        state.target={x,z};if(state.phase==='descending')state.phase='ascending';else if(state.phase!=='ascending')state.phase='flying';return true;
    }
    function returnHome(){
        if(!state.active)return false;
        state.phase=Math.hypot(state.position.x-home.x,state.position.z-home.z)<.03?'descending':'returning';state.target={x:home.x,z:home.z};return true;
    }
    function cancel(){
        const back=state.active?entry:null;
        Object.assign(state,{active:false,phase:'ground',position:null,speed:0,target:null});entry=null;return back;
    }
    function stop(){
        if(!state.active||state.phase==='descending')return false;
        if(state.phase==='returning')state.phase='flying';state.target=null;state.speed=0;return true;
    }
    function update(dt){
        if(!state.active)return null;const p=state.position;
        if(state.phase==='ascending'){
            p.y=Math.min(cruiseHeight,p.y+Math.min(3,Math.max(.7,(cruiseHeight-p.y)*.7))*dt);
            if(p.y>=cruiseHeight-1e-6){p.y=cruiseHeight;state.phase='flying';return 'cruising';}
            return null;
        }
        if(state.phase==='descending'){
            const turn=Math.atan2(Math.sin(-Math.PI/2-state.heading),Math.cos(-Math.PI/2-state.heading));state.heading+=Math.max(-dt*.9,Math.min(dt*.9,turn));
            p.y=Math.max(home.y,p.y-Math.min(3,Math.max(.7,(p.y-home.y)*.7))*dt);
            if(p.y<=home.y+1e-6){cancel();return 'landed';}return null;
        }
        if(!state.target){state.speed=Math.max(0,state.speed-dt*3);return null;}
        const dx=state.target.x-p.x,dz=state.target.z-p.z,d=Math.hypot(dx,dz),desired=Math.min(8,Math.sqrt(d*5));
        const ahead=Math.min(24,d),required=Math.max(cruiseHeight,groundHeight(p.x,p.z)+8,groundHeight(p.x+dx/(d||1)*ahead,p.z+dz/(d||1)*ahead)+8);
        p.y+=Math.max(-4*dt,Math.min(4*dt,required-p.y));
        const safeSpeed=p.y<required-.5?0:desired;
        state.speed+=Math.max(-3*dt,Math.min(3*dt,safeSpeed-state.speed));const step=Math.min(d,(p.y<required-.5?0:Math.max(.03,state.speed))*dt);
        if(d>1e-6){p.x+=dx/d*step;p.z+=dz/d*step;const angle=Math.atan2(dz,dx),turn=Math.atan2(Math.sin(angle-state.heading),Math.cos(angle-state.heading));state.heading+=Math.max(-dt*.9,Math.min(dt*.9,turn));}
        if(d-step<1e-6){p.x=state.target.x;p.z=state.target.z;state.speed=0;if(Math.abs(p.y-required)>.1)return null;state.target=null;if(state.phase==='returning')state.phase='descending';return 'arrived';}
        return null;
    }
    return {state,home,get gate(){return gate;},get gates(){return gates();},get cruiseHeight(){return cruiseHeight;},setGate:p=>{gate={...p};},setCruiseHeight:y=>{cruiseHeight=Math.max(20,y);},contains,segment,path,board,flyTo,returnHome,cancel,stop,update};
}

function airshipMesh(){
    const m=new Mesh(),center=-1.2;
    m.sphere(center,4.15,0,4.8,1.38,1.35,'#c9c5ad',32,16,{envelope:true});
    // Fabric seams and colored longitudinal bands follow the actual envelope.
    for(let seam=0;seam<12;seam++){
        const a=seam*Math.PI/6;let last=null;
        for(let j=1;j<32;j++){
            const t=j*Math.PI/32,p=[center+Math.cos(t)*4.81,4.15+Math.sin(t)*Math.cos(a)*1.392,Math.sin(t)*Math.sin(a)*1.362];
            if(last)m.rod(last,p,.008,seam%3?'#b1b3a0':'#6e8d89',4);last=p;
        }
    }
    for(const side of [-1,1]){
        m.tri([-4.4,4.15,side*.4],[-5.3,4.15,side*2],[-6.2,4.15,side*.1],'#758f8b',{metal:.12});
        m.tri([-4.4,4.25,0],[-5.35,6.1,0],[-6.1,4.2,0],'#78958b',{metal:.12});
        m.rod([-3.2,3.05,side*.9],[-2.7,1.05,side*.55],.018,'#84988a',6);
        m.rod([.8,3.05,side*.9],[.3,.95,side*.55],.018,'#84988a',6);
        m.sphere(-1.7,.55,side*.8,.48,.2,.2,'#738b83',16,8,{metal:.12});
        m.rod([-1.7,.55,side*.93],[-1.7,.55,side*1.35],.025,'#8fa39a',8);
    }
    m.box(-3.1,-.1,-.63,3.8,.15,1.26,'#b3ab8c','wood');m.box(-2.95,.05,-.62,3.5,.46,1.24,'#6f8e88',{metal:.12});
    for(const side of [-1,1]){
        m.box(-2.8,.51,side*.62,2.6,.43,.025,'#789a9d','glass');
        for(let i=0;i<6;i++)m.rod([-2.84+i*.52,.48,side*.64],[-2.84+i*.52,1.01,side*.64],.016,'#c8c8af',6);
        m.rod([-2.9,.98,side*.64],[-.1,.98,side*.64],.019,'#c8c8af',6);
        for(const x of [-.55,.3])m.rod([x,.05,side*.54],[x,.6,side*.54],.014,'#b7bfa9',6);
        m.rod([-.55,.6,side*.54],[.55,.6,side*.54],.014,'#b7bfa9',6);
    }
    m.box(-2.9,1,-.67,1.8,.05,1.34,'#b7bea9',{metal:.12});
    return m;
}
let cachedAirship=null;
export function drawAirship(m,position,angle,time,reduced=false){
    cachedAirship??=airshipMesh();
    pose(m,position.x,position.y,position.z,angle,()=>{
        const data=cachedAirship.data;for(let i=0;i<data.length;i++)m.data.push(data[i]);
        for(const side of [-1,1])for(let blade=0;blade<3;blade++){
            const a=(reduced?0:time*.013)+blade*Math.PI*2/3;
            m.rod([-1.7+Math.cos(a)*.36,.55+Math.sin(a)*.36,side*1.36],[-1.7-Math.cos(a)*.36,.55-Math.sin(a)*.36,side*1.36],.026,'#506660',6);
        }
    });
}

function privateJet(m,x,z,angle){
    pose(m,x,1.55,z,angle,()=>{
        m.sphere(0,.55,0,2.35,.31,.32,'#e0e2d6',24,12,{metal:.12});
        for(const side of [-1,1]){
            m.tri([.4,.48,side*.1],[-1.2,.42,side*2.5],[-1.45,.45,side*.1],'#d1d9cf',{metal:.12});
            m.tri([-1.5,.65,side*.08],[-2.1,.8,side*1],[-2.25,.68,side*.05],'#8ba19b',{metal:.12});
            m.sphere(-1.4,.61,side*.43,.49,.17,.17,'#bac8c1',16,8,{metal:.12});
            for(let i=0;i<7;i++)m.sphere(-1.05+i*.36,.64,side*.304,.07,.085,.012,'#557880',12,6,'glass');
            m.rod([-.8,.2,side*.4],[-.8,-.34,side*.4],.025,'#6b7b74',6);m.sphere(-.8,-.32,side*.43,.13,.13,.055,'#384441',12,6);
        }
        m.tri([-1.3,.72,0],[-2.3,1.8,0],[-2.27,.66,0],'#6f908b',{metal:.12});
        m.rod([1.5,.25,0],[1.5,-.34,0],.022,'#6b7b74',6);m.sphere(1.5,-.31,0,.11,.11,.055,'#384441',12,6);
    });
}

export function drawAirportRoad(m,worldSize=WORLD_SIZE,groundHeight=()=>AIRSHIP_TERMINAL.base){
    const end=AIRSHIP_ACCESS.points.at(-1)[1],base=AIRSHIP_TERMINAL.base;
    for(const {x,z,step,tile} of airportRoadTiles(worldSize)){
        const patches=tile.patches||[{type:tile.type,polygon:[[0,0],[1,0],[1,1],[0,1]]}];
        for(const patch of patches){
            if(!['road','path','sidewalk'].includes(patch.type))continue;
            const polygon=clipTilePolygon(patch.polygon,1,(end-z)/step,true),material=TILE_TYPES[patch.type];
            const points=polygon.map(p=>{const xx=x+p[0]*step,zz=z+p[1]*step;return [xx,groundHeight(xx,zz)+material.height,zz];});
            for(let i=1;i<points.length-1;i++)m.tri(points[0],points[i+1],points[i],material.color,material.texture);
            if(patch.type==='sidewalk')for(let i=0;i<polygon.length;i++){
                const a=polygon[i],b=polygon[(i+1)%polygon.length],inner=Math.abs(a[2])<1e-7&&Math.abs(b[2])<1e-7||Math.abs(a[3])<1e-7&&Math.abs(b[3])<1e-7,outer=Math.abs(a[4]-TILE_CONFIG.curbWidth)<1e-7&&Math.abs(b[4]-TILE_CONFIG.curbWidth)<1e-7;
                if(!inner&&!outer)continue;
                const bottom=inner?TILE_TYPES.road.height:0,p=points[i],q=points[(i+1)%points.length];
                m.quad([p[0],groundHeight(p[0],p[2])+bottom,p[2]],[q[0],groundHeight(q[0],q[2])+bottom,q[2]],q,p,'#aaa58f');
            }
        }
    }
}

export function drawAirshipTerminal(m,groundHeight=()=>AIRSHIP_TERMINAL.base){
    const s=AIRSHIP_TERMINAL;
    drawAirportRoad(m,WORLD_SIZE,groundHeight);
    const runway=AIRPORT_RUNWAY;
    // One continuous reclaimed apron; no L-shaped water cutout between jets
    // and the southbound runway. The threshold sits directly below the jets.
    m.box(82.4,-.15,103.2,12.4,s.base+.15,47.3,'#a3aaa0','concrete');
    m.box(82.4,s.base+.001,103.2,12.4,.006,47.3,'#949a8e','concrete');
    const pier=SPACEPORT_PIER,pad=pier.pad;
    for(const [x,z,w,d] of [[pier.west,pier.north,pier.east-pier.west,pier.south-pier.north],[pad.west,pad.north,pad.east-pad.west,pad.south-pad.north]]){
        m.box(x,-.3,z,w,s.base+.3,d,'#8e9e9c','concrete');m.box(x,s.base+.002,z,w,.006,d,'#b2b8ab','concrete');
        for(const xx of [x+.3,x+w-.3])for(let zz=z+.3;zz<z+d;zz+=2)m.cylinder(xx,-.7,zz,.12,1.1,'#536e70',12,.14,'concrete');
    }
    for(const zz of [pier.north,pier.south]){m.rod([pier.west,s.base+.55,zz],[pad.west,s.base+.55,zz],.025,'#b9c9c2',8);for(let xx=pier.west;xx<pad.west;xx+=1.2)m.rod([xx,s.base,zz],[xx,s.base+.6,zz],.02,'#829d99',8);}
    for(const zz of [pad.north,pad.south])m.rod([pad.west,s.base+.5,zz],[pad.east,s.base+.5,zz],.025,'#c4d0c7',8);
    m.rod([pad.east,s.base+.5,pad.north],[pad.east,s.base+.5,pad.south],.025,'#c4d0c7',8);
    m.box(runway.x,s.base+.055,runway.z,runway.width,.018,runway.depth,'#717d79','asphalt');
    for(let z=runway.z+1;z<runway.z+runway.depth;z+=2)m.box(runway.x+runway.width/2-.06,s.base+.075,z,.12,.005,.9,'#dedbcc');
    for(const z of [runway.z+.4,runway.z+runway.depth-1.3])for(let j=0;j<5;j++)m.box(runway.x+.3+j*.6,s.base+.075,z,.2,.005,.8,'#dedbcc');
    const start=m.data.length;
    pose(m,15.2,0,0,0,()=>{
    m.box(60.5,s.base,105,4.1,1.3,6,'#c4c3af','stucco');
    m.box(60.4,s.base+1.3,104.9,4.3,.17,6.2,'#7e9389','roof');
    m.box(64.61,s.base+.3,105.3,.035,.78,5.4,'#779a9d','glass');
    for(let z=105.25;z<111;z+=.6)m.box(64.65,s.base+.25,z,.055,.9,.035,'#c5cfbc');
    m.box(64.3,s.base+1.15,106.7,1.5,.09,2.3,'#c6c9b4',{metal:.12});
    for(const z of [106.8,108.8])m.rod([65.6,s.base,z],[65.6,s.base+1.2,z],.035,'#81998c',10);
    });
    const end=m.data.length;
    // The hangar stands east of the runway, with its doors facing the strip.
    m.box(90.2,s.base,124,4,2.1,5.3,'#a1aca0',{metal:.12});
    for(let j=0;j<20;j++)m.box(90.175,s.base+.08,124.1+j*.26,.025,1.78,.035,'#788c81');
    m.box(90.1,s.base+2.1,123.9,4.2,.12,5.5,'#889b8d','roof');
    pose(m,15.2,0,0,0,()=>{
    privateJet(m,72.3,114.3,-Math.PI/2);privateJet(m,73.1,105.9,-Math.PI/2);
    for(const z of [105.3,116.8])for(const x of [66.3,77.8]){
        m.cylinder(x,s.base,z,.035,1.65,'#7b9182',10);m.sphere(x,s.base+1.67,z,.075,.09,.075,'#c4d5bf',12,8,{emissive:.25});
    }
    // Boarding ring and short mooring post identify the rental stand visually.
    for(let i=0;i<32;i++){
        const a=i*Math.PI/16,b=(i+1)*Math.PI/16;m.rod([69+Math.cos(a)*1.1,s.base+.058,110+Math.sin(a)*1.1],[69+Math.cos(b)*1.1,s.base+.058,110+Math.sin(b)*1.1],.022,'#cfbd83',4);
    }
    m.cylinder(67,s.base,110,.09,.7,'#8ba193',16);m.sphere(67,s.base+.73,110,.14,.14,.14,'#b3bfac',16,8,{metal:.12});
    });
    return {start,end,lo:[75.6,s.base,104.9],hi:[81,s.base+1.5,111.1]};
}
