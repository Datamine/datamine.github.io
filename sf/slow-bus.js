import {NIGHTLIFE} from './nightlife.js';
import {advanceSignalledVehicle} from './traffic-signals.js';

export const SLOW_BUS_DWELL=6,BUS_SIGNAL_STOP_SECONDS=2;
export const SLOW_BUS_DESCRIPTION="the world's slowest bus";
const busDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const busEdgePoint=(edge,nodes,p)=>{const a=nodes[edge.from],b=nodes[edge.to],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(length*length)));return {x:a.x+dx*t,z:a.z+dz*t,distance:busDistance({x:a.x+dx*t,z:a.z+dz*t},p)};};

/** Plan one contiguous service on the road graph, including stops partway
 * along real road edges. No pedestrian shortcut or straight-line teleport. */
export function planNightlifeBus(network,nightlife=NIGHTLIFE){
    const {nodes,edges}=network,rear={x:nightlife.x,z:nightlife.z-nightlife.d/2-.8};
    const candidates=edges.map(edge=>({edge,point:busEdgePoint(edge,nodes,rear)})).filter(c=>c.point.z<nightlife.z-nightlife.d/2).sort((a,b)=>a.point.distance-b.point.distance);
    if(!candidates.length)throw new Error('Nightlife bus needs a street behind the club');
    for(const candidate of candidates.slice(0,5)){
        const start=candidate.point,dist=new Float64Array(nodes.length);dist.fill(Infinity);const previous=new Int32Array(nodes.length);previous.fill(-1);const visited=new Uint8Array(nodes.length);
        for(const id of [candidate.edge.from,candidate.edge.to])dist[id]=busDistance(start,nodes[id]);
        for(let count=0;count<nodes.length;count++){
            let id=-1,best=Infinity;for(let i=0;i<nodes.length;i++)if(!visited[i]&&dist[i]<best){best=dist[i];id=i;}if(id<0)break;visited[id]=1;
            for(const next of nodes[id].neighbors){const d=best+busDistance(nodes[id],nodes[next]);if(d<dist[next]-1e-8){dist[next]=d;previous[next]=id;}}
        }
        let goal=null,cost=Infinity;
        for(const edge of edges.filter(e=>e.street==='Market Street'&&e.length>3.5)){
            const a=nodes[edge.from],b=nodes[edge.to],point={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
            for(const id of [edge.from,edge.to])if(dist[id]+busDistance(nodes[id],point)<cost){cost=dist[id]+busDistance(nodes[id],point);goal={id,point};}
        }
        if(!goal||!Number.isFinite(cost))continue;
        const path=[];for(let id=goal.id;id>=0;id=previous[id])path.push(id);path.reverse();
        const startNode=[candidate.edge.from,candidate.edge.to].find(id=>busDistance(start,nodes[id])<1e-6);
        const points=[{...start,node:startNode??null},...path.map(id=>({x:nodes[id].x,z:nodes[id].z,node:id})),{...goal.point,node:null}].filter((p,i,list)=>!i||busDistance(p,list[i-1])>1e-6);
        return {points,length:cost,originStreet:candidate.edge.street,originDistance:candidate.point.distance,destinationStreet:'Market Street'};
    }
    throw new Error('Nightlife and Market Street need a connected bus route');
}

export function createSlowBus({network,signals,walkingSpeed,ground,nightlife=NIGHTLIFE,route=planNightlifeBus(network,nightlife)}){
    const nodes=[...network.nodes],ids=route.points.map(p=>{if(p.node!==null)return p.node;const id=nodes.length;nodes.push({x:p.x,z:p.z});return id;}),outbound=[...ids],tour=[...ids,...ids.slice(0,-1).reverse()],endLeg=ids.length-2;
    const bus={id:'nightlife-market-bus',from:tour[0],to:tour[1],tourIndex:0,distance:0,travel:0,speed:walkingSpeed*.5,angle:Math.atan2(nodes[tour[1]].z-nodes[tour[0]].z,nodes[tour[1]].x-nodes[tour[0]].x),x:nodes[tour[0]].x,z:nodes[tour[0]].z,dwell:SLOW_BUS_DWELL,redWait:0,signalStops:0,arrivals:0,destination:'Market Street',sight:{id:'nightlife-market-bus',kind:'bus',label:'Bus',description:SLOW_BUS_DESCRIPTION}};
    const state={clock:0};
    function next(v){const last=v.tourIndex;if(last===endLeg||last===tour.length-2){v.dwell=SLOW_BUS_DWELL;v.arrivals++;v.destination=last===endLeg?'Nightlife':'Market Street';}v.tourIndex=(v.tourIndex+1)%(tour.length-1);v.from=tour[v.tourIndex];v.to=tour[v.tourIndex+1];}
    function update(dt){if(!Number.isFinite(dt)||dt<0)return;advanceSignalledVehicle(bus,dt,state.clock,{nodes,signals,next,stopDistance:1.75,signalStopSeconds:BUS_SIGNAL_STOP_SECONDS});state.clock+=dt;const a=nodes[bus.from],b=nodes[bus.to],length=busDistance(a,b),t=length?bus.distance/length:0;bus.x=a.x+(b.x-a.x)*t;bus.z=a.z+(b.z-a.z)*t;const angle=Math.atan2(b.z-a.z,b.x-a.x);bus.angle+=Math.max(-dt*2.5,Math.min(dt*2.5,Math.atan2(Math.sin(angle-bus.angle),Math.cos(angle-bus.angle))));bus.base=ground(bus.x,bus.z)+.045;}
    update(0);return {bus,state,route,signals,nodes,outbound,update};
}
