import {rand,pose} from './geometry.js';
import {drawWalkingDog,drawBabyStroller} from './companions.js';
import {CHARACTER_CLIPS} from './characters.js';

export const NOE_VALLEY_BOUNDS=Object.freeze({west:49,east:64,north:68,south:84});

export function routePhase(time,length,speed,seed=0,pause=1.5){
    const travel=length/speed,cycle=travel*2+pause*2,t=(time+seed*cycle)%cycle;
    if(t<travel)return {fraction:t/travel,direction:1,moving:true};
    if(t<travel+pause)return {fraction:1,direction:1,moving:false};
    if(t<travel*2+pause)return {fraction:1-(t-travel-pause)/travel,direction:-1,moving:true};
    return {fraction:0,direction:-1,moving:false};
}
const pointOn=(points,f)=>{const at=Math.min(points.length-1.000001,Math.max(0,f)*(points.length-1)),i=Math.floor(at),t=at-i,a=points[i],b=points[i+1];return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,angle:Math.atan2(b[1]-a[1],b[0]-a[0])};};

/** Tangent-facing flight over the bay. Motion remains gentle when reduced
 * motion is requested; position still advances instead of freezing in midair. */
export function seagullFlight(time,index,scale=1.5,reduced=false){
    const seconds=time*.001,rate=(.2+index*.014)*(reduced?.45:1),a=seconds*rate+index*.89;
    const rx=5.5+index*.45,rz=2.1+index*.2,center=index<4?[57.5,16]:[29,8.4];
    return {x:center[0]*scale+Math.cos(a)*rx,z:center[1]*scale+Math.sin(a)*rz,y:4.2+(index%3)*.55+Math.sin(a*2+index)*.2,
        angle:Math.atan2(Math.cos(a)*rz,-Math.sin(a)*rx),bank:Math.sin(a)*.035,flap:reduced?.018:Math.sin(seconds*5.5+index*1.7)*.16};
}

export function drawSeagull(m,bird){
    pose(m,bird.x,bird.y,bird.z,bird.angle,()=>{
        m.sphere(0,0,0,.13,.045,.045,'#d6ddd4',8,4);m.sphere(.1,.025,0,.055,.05,.045,'#e2e6d8',8,4);
        m.tri([.145,.025,-.018],[.145,.025,.018],[.2,.018,0],'#bfa569');
        for(const side of [-1,1]){const lift=bird.flap+side*bird.bank;m.tri([.07,0,side*.025],[-.04,lift,side*.29],[-.075,-.01,side*.08],'#dce2d7');m.tri([-.04,lift,side*.29],[-.15,lift-.035,side*.46],[-.075,-.01,side*.08],'#899a96');}
    });
}

/** Short, checked pavement routes prevent background people walking through
 * buildings. Routes and appearances are prepared once, never pathfound per frame. */
export function createCityLife({routes,surfaceType,lamps,terrainHeight,groundHeight=terrainHeight,scale,human,bicycle,maxWalkers=26,maxRiders=4,waterTraffic=true,prefix='citizen',regional=false,walkerQuotas=[],strollers=false,walkable=()=>true}){
    const candidates=[],gulls=[];
    for(const [index,r] of routes.entries()){
        const [a,b]=r.points,len=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/len,uz=(b[1]-a[1])/len;
        for(const side of (strollers?[1]:[-1,1])){
            const offset=strollers?0:r.halfWidth+.125;let points=[];
            const finish=()=>{if(strollers)points=points.slice(5,-5);if(points.length>=11)candidates.push({points,length:(points.length-1)*.2,seed:rand(index,side,14),rider:false,street:r.name});points=[];};
            for(let t=.5;t<len-.5;t+=.2){const x=a[0]+ux*t-uz*side*offset,z=a[1]+uz*t+ux*side*offset,type=surfaceType(x,z),fits=!strollers||[-.3,0,.3].every(v=>walkable(x-uz*v,z+ux*v));if((type==='sidewalk'||strollers&&type==='road')&&fits&&!lamps.some(p=>Math.hypot(p.x-x,p.z-z)<(strollers?.4:.25)))points.push([x,z]);else finish();}finish();
        }
        if(r.kind==='path'&&len>4){let points=[];for(let t=.5;t<len-.5;t+=.2){const x=a[0]+ux*t,z=a[1]+uz*t,type=surfaceType(x,z);if(type==='path'||type==='sidewalk')points.push([x,z]);}if(points.length>14)candidates.push({points,length:(points.length-1)*.2,seed:rand(index,0,41),rider:true});}
    }
    const walkers=candidates.filter(p=>!p.rider),riders=candidates.filter(p=>p.rider),people=[];
    const chosen=new Set();
    const select=(pool,count)=>{count=Math.min(count,pool.length,maxWalkers-chosen.size);for(let i=0;i<count;i++)chosen.add(pool[Math.floor(i*pool.length/count)]);};
    for(const quota of walkerQuotas)select(walkers.filter(p=>!chosen.has(p)&&quota.contains(...p.points[Math.floor(p.points.length/2)])),quota.count);
    select(walkers.filter(p=>!chosen.has(p)),maxWalkers-chosen.size);people.push(...chosen);
    for(let i=0;i<Math.min(maxRiders,riders.length);i++)people.push(riders[Math.floor(i*riders.length/Math.min(maxRiders,riders.length))]);
    people.forEach((p,i)=>Object.assign(p,{child:!strollers&&!p.rider&&i%11===3,dogWalker:!strollers&&!p.rider&&i%9===4,stroller:strollers&&!p.rider,id:prefix+'-'+i,label:!strollers&&!p.rider&&i%11===3?'Child':i%2?'Woman':'Man',regional:typeof regional==='function'?regional(p):regional,elapsed:0,hold:0,phase:p.seed*Math.PI*2,motion:0}));
    function update(dt){
        for(const p of people){
            const held=p.hold>0;if(held)p.hold=Math.max(0,p.hold-dt);else p.elapsed+=dt;
            const speed=p.rider?1.8:.75+p.seed*.25,state=routePhase(p.elapsed,p.length,speed,p.seed),at=pointOn(p.points,state.fraction),moving=state.moving&&!held;
            p.x=at.x;p.z=at.z;
            p.motion+=(Number(moving)-p.motion)*(1-Math.exp(-dt*12));
            if(moving)p.phase+=speed*dt*(p.rider?1/.31:Math.PI*2/CHARACTER_CLIPS.walk.stride);
            let facing=at.angle+(state.moving?(state.direction<0?Math.PI:0):(state.fraction>.5?Math.PI:0));
            if(held&&p.lookAt&&!p.stroller)facing=Math.atan2(p.lookAt.z-at.z,p.lookAt.x-at.x);
            if(p.angle===undefined)p.angle=facing;
            else p.angle+=Math.max(-dt*4,Math.min(dt*4,Math.atan2(Math.sin(facing-p.angle),Math.cos(facing-p.angle))));
        }
    }
    const colors=['#647a7b','#8e6b59','#686e53','#506d86','#a1846e','#75727e','#8e8060'],skins=['#bd9673','#9e7053','#d0b293','#7d573f','#c49e7e'];
    function ferry(m,x,z,y,angle){
        pose(m,x,y,z,angle,()=>{
            m.box(-.8,.02,-.25,1.6,.17,.5,'#d6dfd9');m.tri([.8,.02,-.25],[.8,.02,.25],[1.04,.08,0],'#cbd8d3');
            m.box(-.82,.03,-.26,1.62,.045,.52,'#375e6a');m.box(-.65,.19,-.21,1.22,.32,.42,'#c4d0ca');
            for(let i=0;i<6;i++)for(const side of [-1,1])m.box(-.55+i*.18,.27,side*.218,.13,.16,.016,'#487585');
            m.box(-.69,.51,-.24,1.31,.06,.48,'#d7e0d3');m.box(-.4,.57,-.16,.45,.13,.32,'#9bb1ae');
            m.rod([-.02,.58,0],[-.02,.96,0],.014,'#b4bfae',6);
            for(const side of [-1,1])for(let j=0;j<3;j++)m.rod([-.87-j*.45,.025,side*(.19+j*.16)],[-1.15-j*.45,.025,side*(.23+j*.16)],.017,'#9ac0ba',4);
        });
    }
    function draw(m,time,viewer,reduced,addTarget=()=>{}){
        const seconds=reduced?12:time*.001;
        for(const [i,p] of people.entries()){
            const state=routePhase(reduced?12:p.elapsed,p.length,p.rider?1.8:.75+p.seed*.25,p.seed),at=pointOn(p.points,state.fraction);
            p.x=at.x;p.z=at.z;
            if(Math.hypot(at.x-viewer[0],at.z-viewer[1])>26)continue;
            const angle=reduced?at.angle+(state.direction<0?Math.PI:0):p.angle??at.angle,base=(p.stroller?groundHeight:terrainHeight)(at.x,at.z)+.075,phase=reduced?0:p.phase,start=m.data.length;
            const appearance={pants:i%2?'#475259':'#5a574d',hair:['#3c352f','#5d4e3c','#907657'][i%3],female:p.label==='Woman',cap:i%7===0,longHair:p.label==='Woman'&&i%3!==0,backpack:i%4===0,coat:i%3===0,height:p.stroller?1:p.child?.65+p.seed*.05:.92+p.seed*.16,carryingFish:p.dogWalker,pushingStroller:p.stroller,mode:p.rider?'cycle':'move',motion:reduced?0:p.motion,time:reduced?0:seconds+p.seed*13,ground:p.rider?null:groundHeight};
            if(!reduced&&p.gesture&&time<p.gesture.started+p.gesture.duration){appearance.action=p.gesture.name;appearance.actionT=(time-p.gesture.started)/p.gesture.duration;}
            p.base=base+(p.rider?.3:0);p.height=(p.rider?1.48:1.83)*appearance.height+.1;
            human(m,at.x,at.z,base+(p.rider?.3:0),angle,phase,p.rider,skins[i%skins.length],colors[i%colors.length],appearance);
            if(p.rider)bicycle(m,at.x,at.z,base,angle,phase);
            addTarget(start,p);
            if(p.stroller){
                const baby=p.infant||(p.infant={id:p.id+'-baby',label:'Baby',baby:true,child:true,parent:p,height:.9,hold:0});
                const strollerStart=m.data.length,at=drawBabyStroller(m,{...p,angle,strollerColor:['#648f91','#98798e','#85936a'][i%3],blanketColor:['#dbb3a8','#c5cfb1','#c2c4dc'][i%3],babySkin:skins[(i+2)%skins.length]},reduced?0:time,groundHeight);
                Object.assign(baby,at);addTarget(strollerStart,baby);
            }
            if(p.dogWalker){
                const behind=pointOn(p.points,Math.max(0,Math.min(1,state.fraction-state.direction*.65/p.length)));
                const dog=p.petDog||(p.petDog={id:p.id+'-dog',label:'Dog',dog:true,regional:p.regional,description:'A very good dog taking a human out for some much-needed exercise.',height:.75,hold:0});
                Object.assign(dog,{x:behind.x,z:behind.z,angle:angle,base:groundHeight(behind.x,behind.z),moving:state.moving&&!p.hold,phase:phase*1.5,color:i%2?'#bca37d':'#7d6857'});
                const dogStart=m.data.length;drawWalkingDog(m,dog,time,groundHeight,{x:p.x,z:p.z,base,angle});addTarget(dogStart,dog);
            }
        }
        if(!waterTraffic)return;
        for(let boat=0;boat<2;boat++){
            const f=routePhase(seconds,23,.48+boat*.11,boat*.46,7).fraction,points=boat?[[58.6,21],[61,16],[55,8],[45,5]]:[[58.2,20],[61,14],[54,6],[35,5]],p=pointOn(points,f),x=p.x*scale,z=p.z*scale;
            if(Math.hypot(x-viewer[0],z-viewer[1])<65)ferry(m,x,z,.08+Math.sin(seconds*.7+boat)*.016,p.angle);
        }
        gulls.length=0;
        for(let i=0;i<7;i++){
            const bird=seagullFlight(time,i,scale,reduced);gulls.push(bird);
            if(Math.hypot(bird.x-viewer[0],bird.z-viewer[1])>55)continue;
            drawSeagull(m,bird);
        }
    }
    return {draw,people,gulls,update};
}

export function drawStreetcar(m,x,base,z,angle){
    pose(m,x,base,z,angle,()=>{
        m.box(-.82,.12,-.33,1.64,.23,.66,'#9e5741');m.box(-.74,.35,-.32,1.48,.54,.64,'#c7b88c');
        for(const u of [-.82,.74])m.box(u,.28,-.31,.08,.44,.62,'#9b5742');
        m.box(-.87,.89,-.38,1.74,.09,.76,'#536e60');
        for(let i=0;i<6;i++)for(const side of [-1,1]){m.box(-.64+i*.23,.43,side*.326,.16,.32,.015,'#537d84');m.box(-.68+i*.23,.38,side*.34,.025,.43,.025,'#d8ccaa');}
        for(const u of [-.55,.55])for(const side of [-1,1])m.sphere(u,.12,side*.29,.12,.12,.045,'#3d4c4b',12,6);
        for(const u of [-.87,.85])m.sphere(u,.39,0,.023,.065,.065,'#efd9a2',12,6,{emissive:.65});
        m.rod([-.28,.98,0],[.28,1.17,0],.017,'#71867a',6);m.rod([.28,1.17,0],[.55,1.4,0],.012,'#71867a',6);
    });
}


/** Clip actor routes at a region boundary without inventing a separate road. */
export function clipLifeRoutes(routes,minZ=-Infinity,maxZ=Infinity){
    return routes.flatMap(r=>r.points.slice(1).flatMap((b,i)=>{
        const a=r.points[i],dz=b[1]-a[1];let start=0,end=1;
        if(!dz){if(a[1]<minZ||a[1]>maxZ)return [];}
        else{const t=(minZ-a[1])/dz,u=(maxZ-a[1])/dz;start=Math.max(0,Math.min(t,u));end=Math.min(1,Math.max(t,u));}
        if(start>=end)return [];const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+dz*t];
        return [{...r,points:[at(start),at(end)]}];
    }));
}
