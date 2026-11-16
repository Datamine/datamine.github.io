export const TRAFFIC_LIGHT_SECONDS=10;
const signalAngle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.x*b.x+a.z*b.z)));

/** Junctions come from the same split road graph that vehicles drive on.
 * Opposing approaches share a phase; distinct diagonal roads get their own. */
export function createTrafficSignals({nodes,edges,roadWidths=new Map(),canPlace=()=>true,avoid=[]}){
    const junctions=[],byNode=new Map(),fixtures=[],missing=[];
    const widthAt=(id,next)=>{const edge=edges.find(e=>e.from===id&&e.to===next||e.to===id&&e.from===next);return roadWidths.get(edge?.street)||.5;};
    for(const [id,node] of nodes.entries()){
        const approaches=[];
        for(const next of node.neighbors){const n=nodes[next],d=Math.hypot(n.x-node.x,n.z-node.z);if(d<1e-7)continue;const a={x:(n.x-node.x)/d,z:(n.z-node.z)/d,next,width:widthAt(id,next)};if(!approaches.some(b=>signalAngle(a,b)<.12))approaches.push(a);}
        if(approaches.length<3)continue;
        const axes=[];for(const a of approaches){let phase=axes.findIndex(b=>Math.abs(a.x*b.x+a.z*b.z)>Math.cos(.12));if(phase<0){phase=axes.length;axes.push(a);}a.phase=phase;}
        if(axes.length<2)continue;
        const junction={id,x:node.x,z:node.z,axes,approaches,offset:id%axes.length,fixtures:[]};junctions.push(junction);byNode.set(id,junction);
        for(const a of approaches){
            let fixture=null;
            for(const along of [1.05,1.4,1.8,2.2]){
                for(const side of [1,-1]){
                    for(const extra of [.32,.18,.48,.7]){
                        const across=a.width+extra,x=node.x+a.x*along-a.z*side*across,z=node.z+a.z*along+a.x*side*across;
                        if(!canPlace(x,z)||avoid.some(p=>Math.hypot(p.x-x,p.z-z)<(p.clearance??.55))||fixtures.some(p=>Math.hypot(p.x-x,p.z-z)<.24))continue;
                        fixture={x,z,angle:Math.atan2(a.z,a.x),node:id,phase:a.phase};break;
                    }
                    if(fixture)break;
                }
                if(fixture)break;
            }
            // Tight downtown corners use wire-hung heads above the roadway,
            // leaving narrow sidewalks and building entrances unobstructed.
            if(!fixture)fixture={x:node.x+a.x*.65,z:node.z+a.z*.65,angle:Math.atan2(a.z,a.x),node:id,phase:a.phase,overhead:true,width:a.width};
            if(fixture){junction.fixtures.push(fixtures.length);fixtures.push(fixture);}
        }
        if(!junction.fixtures.length)missing.push(id);
    }
    function phase(id,time){const j=byNode.get(id);return j?(Math.floor((Math.max(0,time)+1e-9)/TRAFFIC_LIGHT_SECONDS)+j.offset)%j.axes.length:0;}
    function approachPhase(id,from){const j=byNode.get(id);if(!j)return 0;const dx=from.x-j.x,dz=from.z-j.z,d=Math.hypot(dx,dz)||1;let best=-Infinity,index=0;for(const [i,a] of j.axes.entries()){const dot=Math.abs((dx*a.x+dz*a.z)/d);if(dot>best){best=dot;index=i;}}return index;}
    function green(id,from,time){return !byNode.has(id)||phase(id,time)===approachPhase(id,from);}
    function wait(id,from,time){const j=byNode.get(id);if(!j||green(id,from,time))return 0;const steps=(approachPhase(id,from)-phase(id,time)+j.axes.length)%j.axes.length,within=((time%TRAFFIC_LIGHT_SECONDS)+TRAFFIC_LIGHT_SECONDS)%TRAFFIC_LIGHT_SECONDS;return TRAFFIC_LIGHT_SECONDS-within+(steps-1)*TRAFFIC_LIGHT_SECONDS;}
    return {junctions,fixtures,missing,byNode,phase,green,wait,has:id=>byNode.has(id)};
}

/** Consume time at exact stop lines and signal changes. A green grants the
 * entire crossing, so a phase change cannot strand a vehicle in its center. */
export function advanceSignalledVehicle(vehicle,dt,time,{nodes,signals,next,stopDistance=1.25}){
    if(!Number.isFinite(dt)||dt<=0||vehicle.speed<=0)return;
    let remaining=dt,clock=time,iterations=0;vehicle.waitingForRed=false;
    while(remaining>1e-8&&iterations++<10000){
        if(vehicle.dwell>1e-8){const wait=Math.min(remaining,vehicle.dwell);vehicle.dwell-=wait;remaining-=wait;clock+=wait;continue;}
        const a=nodes[vehicle.from],b=nodes[vehicle.to],length=Math.hypot(b.x-a.x,b.z-a.z);
        if(length<1e-8){next(vehicle);vehicle.crossingCleared=false;continue;}
        const stop=Math.max(0,length-Math.min(stopDistance,length*.45));
        if(signals?.has(vehicle.to)&&!vehicle.crossingCleared&&vehicle.distance>=stop-1e-8){
            if(signals.green(vehicle.to,a,clock)){vehicle.crossingCleared=true;vehicle.waitingForRed=false;}
            else{const wait=Math.min(remaining,Math.max(1e-8,signals.wait(vehicle.to,a,clock)));remaining-=wait;clock+=wait;vehicle.redWait=(vehicle.redWait||0)+wait;vehicle.waitingForRed=true;continue;}
        }
        const target=signals?.has(vehicle.to)&&!vehicle.crossingCleared?stop:length,distance=Math.min(Math.max(0,target-vehicle.distance),remaining*vehicle.speed),used=distance/vehicle.speed;
        vehicle.distance+=distance;vehicle.travel+=distance;remaining-=used;clock+=used;
        if(vehicle.distance>=length-1e-8){next(vehicle);vehicle.distance=0;vehicle.crossingCleared=false;}
        else if(used<1e-10&&vehicle.distance<target-1e-8)break;
    }
}
