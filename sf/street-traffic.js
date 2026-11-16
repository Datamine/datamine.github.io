import {pose} from './geometry.js';

const trafficCross=(a,b)=>a[0]*b[1]-a[1]*b[0];
/** Split authored road centerlines at intersections once, then drive through
 * their adjacency graph. Neither pixels nor pedestrian paths define a road. */
export function createStreetTraffic({routes,isRoad,ground,count=4,spawnPoints=[]}){
    const segments=routes.filter(r=>r.kind==='road').flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,cuts:[0,1],street:r.name||'street'})));
    for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
        const a=segments[i],b=segments[j],u=[a.b[0]-a.a[0],a.b[1]-a.a[1]],v=[b.b[0]-b.a[0],b.b[1]-b.a[1]],w=[b.a[0]-a.a[0],b.a[1]-a.a[1]],cross=trafficCross(u,v);
        if(Math.abs(cross)<1e-8){
            // Overlapping continuations share junctions too, including where
            // the southern roads continue the city tile's clipped centerlines.
            if(Math.abs(trafficCross(w,u))<1e-8){
                const split=(s,points)=>{const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],length=dx*dx+dz*dz;if(length<1e-12)return;for(const p of points){const t=((p[0]-s.a[0])*dx+(p[1]-s.a[1])*dz)/length;if(t>0&&t<1)s.cuts.push(t);}};
                split(a,[b.a,b.b]);split(b,[a.a,a.b]);
            }
            continue;
        }
        const t=trafficCross(w,v)/cross,s=trafficCross(w,u)/cross;
        if(t>=0&&t<=1&&s>=0&&s<=1){a.cuts.push(t);b.cuts.push(s);}
    }
    const nodes=[],ids=new Map(),edges=[];
    const node=p=>{const key=p.map(v=>v.toFixed(4)).join(',');if(!ids.has(key)){ids.set(key,nodes.length);nodes.push({x:p[0],z:p[1],neighbors:[]});}return ids.get(key);};
    for(const s of segments){
        const cuts=[...new Set(s.cuts)].sort((a,b)=>a-b),at=t=>[s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t];
        for(let i=1;i<cuts.length;i++){
            const a=at(cuts[i-1]),b=at(cuts[i]),length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<.1)continue;
            const steps=Math.ceil(length/.2);let safe=true;
            for(let j=0;j<=steps;j++){const t=j/steps;if(!isRoad(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)){safe=false;break;}}
            if(!safe)continue;
            const from=node(a),to=node(b);if(nodes[from].neighbors.includes(to))continue;
            nodes[from].neighbors.push(to);nodes[to].neighbors.push(from);edges.push({from,to,length,street:s.street});
        }
    }
    const assigned=new Set(),components=[];
    for(let start=0;start<nodes.length;start++)if(!assigned.has(start)){
        const ids=[start];assigned.add(start);for(let i=0;i<ids.length;i++)for(const next of nodes[ids[i]].neighbors)if(!assigned.has(next)){assigned.add(next);ids.push(next);}
        const members=new Set(ids),componentEdges=edges.filter(e=>members.has(e.from)),pending=new Map(ids.map(id=>[id,[...nodes[id].neighbors]])),stack=[start],tour=[];
        // An Euler circuit over both directions of every road guarantees that
        // cars eventually visit every junction, rather than repeating a local
        // turn pattern. This is built once, with no per-frame route search.
        while(stack.length){const at=stack.at(-1),next=pending.get(at).pop();if(next===undefined)tour.push(stack.pop());else stack.push(next);}
        tour.reverse();const lengths=tour.slice(1).map((to,i)=>Math.hypot(nodes[to].x-nodes[tour[i]].x,nodes[to].z-nodes[tour[i]].z));
        components.push({nodes:ids,edges:componentEdges,tour,lengths,length:lengths.reduce((a,b)=>a+b,0)});
    }
    components.sort((a,b)=>b.length-a.length);
    const fleetSize=Math.max(0,Math.min(Math.floor(count),edges.length)),districts=components.filter(c=>c.length>=Math.max(5,(components[0]?.length||0)*.1)).slice(0,fleetSize);
    if(!districts.length&&fleetSize)districts.push(components[0]);
    const cars=Array.from({length:fleetSize},(_,i)=>{
        const circuit=districts[i%districts.length];let distance=circuit.length*(i+.2)/fleetSize,tourIndex=0;
        while(distance>=circuit.lengths[tourIndex]){distance-=circuit.lengths[tourIndex];tourIndex++;}
        // Spread the live fleet across neighborhoods immediately, while each
        // car retains the same complete patrol after its chosen starting edge.
        const hint=spawnPoints[i];if(hint){let best=Infinity;for(let j=0;j<circuit.lengths.length;j++){
            const a=nodes[circuit.tour[j]],b=nodes[circuit.tour[j+1]],dx=b.x-a.x,dz=b.z-a.z,length=circuit.lengths[j],t=Math.max(.02,Math.min(.98,((hint.x-a.x)*dx+(hint.z-a.z)*dz)/(length*length))),score=(a.x+dx*t-hint.x)**2+(a.z+dz*t-hint.z)**2;
            if(score<best){best=score;tourIndex=j;distance=length*t;}
        }}
        const from=circuit.tour[tourIndex],to=circuit.tour[tourIndex+1],a=nodes[from],b=nodes[to],id='waymo-'+(i+1);
        return {id,circuit,tourIndex,from,to,distance,turn:0,angle:Math.atan2(b.z-a.z,b.x-a.x),speed:1.7+i*.16,x:a.x,z:a.z,travel:0,sight:{id,kind:'waymo',label:'Waymo',description:'An autonomous white taxi with a spinning rooftop sensor and absolutely no driver to ask for directions. It is patiently touring the whole city, one impeccably calculated turn at a time.'}};
    });
    function update(dt){for(const car of cars){
        let budget=Number.isFinite(dt)?Math.max(0,dt)*car.speed:0;
        while(budget>0){const a=nodes[car.from],b=nodes[car.to],length=Math.hypot(b.x-a.x,b.z-a.z),step=Math.min(budget,length-car.distance);car.distance+=step;car.travel+=step;budget-=step;
            if(car.distance>=length-1e-8){car.tourIndex=(car.tourIndex+1)%car.circuit.lengths.length;car.from=car.circuit.tour[car.tourIndex];car.to=car.circuit.tour[car.tourIndex+1];car.distance=0;car.turn++;}else break;
        }
        const a=nodes[car.from],b=nodes[car.to],length=Math.hypot(b.x-a.x,b.z-a.z),t=car.distance/length,heading=Math.atan2(b.z-a.z,b.x-a.x);
        // Lane offset tapers at intersections to keep every turn on the road.
        let lane=.12*Math.min(1,car.distance/.7,(length-car.distance)/.7);
        if(!isRoad(a.x+(b.x-a.x)*t-Math.sin(heading)*lane,a.z+(b.z-a.z)*t+Math.cos(heading)*lane))lane=0;
        car.x=a.x+(b.x-a.x)*t-Math.sin(heading)*lane;car.z=a.z+(b.z-a.z)*t+Math.cos(heading)*lane;
        car.angle+=Math.max(-dt*3.5,Math.min(dt*3.5,Math.atan2(Math.sin(heading-car.angle),Math.cos(heading-car.angle))));
    }}
    update(0);
    return {nodes,edges,components,cars,update,draw(m,viewer,addTarget=()=>{}){for(const car of cars)if(Math.hypot(car.x-viewer.x,car.z-viewer.z)<32){const start=m.data.length;drawWaymo(m,{...car,y:ground(car.x,car.z)+.045});addTarget(start,car);}}};
}

export function drawWaymo(m,car){
    pose(m,car.x,car.y,car.z,car.angle,()=>{
        m.box(-.58,.14,-.245,1.16,.25,.49,'#e8eeed',{metal:.12});m.box(-.47,.39,-.235,.87,.12,.47,'#f7f6f0');
        m.box(-.34,.48,-.205,.63,.28,.41,'#476b78','glass');m.box(-.3,.75,-.215,.54,.055,.43,'#f4f4ec');
        for(const side of [-1,1]){m.box(-.36,.46,side*.213,.045,.3,.024,'#e4ece9');m.box(.04,.46,side*.213,.035,.3,.024,'#e4ece9');m.box(-.36,.38,side*.249,.65,.07,.008,'#62bdb9');
            // A small W in the turquoise door panel, drawn as geometry.
            for(const [a,b] of [[[-.19,.4],[-.14,.365]],[[-.14,.365],[-.08,.4]],[[-.08,.4],[-.02,.365]],[[-.02,.365],[.03,.4]]])m.rod([a[0],a[1],side*.258],[b[0],b[1],side*.258],.009,'#f7ffff',5);
            for(const x of [-.36,.36]){m.sphere(x,.16,side*.255,.14,.14,.045,'#2f3c43',12,6);m.sphere(x,.16,side*.294,.075,.075,.008,'#b4c7cc',12,6);}
            m.box(.583,.33,side*.15-.055,.012,.065,.11,'#e8f7ee',{emissive:.5});m.box(-.591,.32,side*.17-.04,.012,.055,.08,'#ca6053');
        }
        m.box(-.17,.8,-.13,.25,.035,.26,'#dce7e5');m.cylinder(-.05,.835,0,.09,.11,'#d9e5e4',16,.075);m.cylinder(-.05,.885,0,.093,.025,'#416c7a',16);
        for(const side of [-1,1])m.sphere(.43,.48,side*.25,.055,.065,.045,'#527c86',12,6);
        m.box(.594,.17,-.18,.016,.05,.36,'#69818c');
    });
}
