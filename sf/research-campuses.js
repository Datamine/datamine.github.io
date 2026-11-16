import {detachInstituteMesh} from './institute-interiors.js';
import {drawResearchInstitute,drawResearchCourtDetails} from './research-architecture.js';
import {RESEARCH_CAMPUSES} from './research-layout.js';
import {RESEARCHERS} from './research-dialogue.js';
import {CHARACTER_CLIPS} from './characters.js';

const researchSignLines=[['CALIFORNIA INSTITUTE','FOR CONSCIOUSNESS','RESEARCH'],['CONSCIOUSNESS RESEARCH','FIELD STATION','CALIFORNIA']];
export const RESEARCH_SIGNS=Object.freeze(researchSignLines.map(lines=>lines.join('\n')));

/** Two authored campuses share their footprints with the navigation mask.
 * Signs belong to the façades; NPCs are animated by the normal actor renderer. */
export function drawResearchCampuses(m,signs,{separateInteriors=false}={}){
    return RESEARCH_CAMPUSES.map((c,index)=>{
        const start=m.data.length,stone=index?'#bbc6c5':'#d8cdb6',trim=index?'#64848e':'#8d8975';
        m.box(c.west,c.base-.035,c.north,c.east-c.west,.04,c.south-c.north,index?'#a7b4b1':'#c0baaa','stone');
        // Paving seams, inlaid centerlines, and a planted edge give the courts
        // detail without loading an additional texture atlas.
        for(let x=c.west+.55;x<c.east;x+=.8)m.box(x,c.base+.006,172.4,.014,.004,2.65,'#d2d4c6');
        for(const x of [c.west+.18,c.east-.42]){
            m.box(x,c.base+.01,168,.24,.2,4.7,trim,'stone');
            for(let z=168.3;z<172.5;z+=.7)m.sphere(x+.12,c.base+.36,z,.2,.22,.22,index?'#709f83':'#8caa72',10,4);
        }
        const definition=drawResearchInstitute(m,signs,c,index,RESEARCH_SIGNS[index]),interior=separateInteriors?detachInstituteMesh(m,definition):null;
        drawResearchCourtDetails(m,signs,c,index);
        if(!index){
            m.cylinder(c.x,c.base,173.3,.72,.22,'#9ca898',32);m.cylinder(c.x,c.base+.22,173.3,.62,.035,'#8ec1c1',32,.62,{water:0});
            m.cylinder(c.x,c.base+.24,173.3,.09,.44,'#c2c9b3',16);m.sphere(c.x,c.base+.71,173.3,.19,.12,.19,'#d6d4b8',16,8);
        }else{
            m.box(c.x-.65,c.base,172.77,1.3,.16,1.06,'#818b91','stone');
            // An empty center, framed in brass: a physical sculpture with an
            // actual hole through it, not a black rectangle painted on a box.
            for(const x of [-.48,.35])m.box(c.x+x,c.base+.16,173.18,.13,1.25,.22,'#c0a469',{metal:.4});
            m.box(c.x-.48,c.base+1.28,173.18,.96,.13,.22,'#c0a469',{metal:.4});
        }
        for(const x of [c.x-.3,c.x+.25])m.box(x,c.base,174.35,.06,.53,.3,'#6b7c79',{metal:.2});
        m.box(c.x-.43,c.base+.51,174.22,.86,.06,.52,'#a18569','wood');
        m.box(c.x-.43,c.base+.57,174.19,.86,.52,.06,'#a18569','wood');
        const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
        for(let i=start;i<m.data.length;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.data[i+k]);hi[k]=Math.max(hi[k],m.data[i+k]);}
        if(interior)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],interior.lo[k]);hi[k]=Math.max(hi[k],interior.hi[k]);}
        return {enterableInstitute:true,interior,inside:{x:c.x-.5,y:c.z+.15},id:c.id,kind:'research-institute',label:c.label,base:c.base,entry:{...c.entry},description:index?'The field station of the California Institute for Consciousness Research. Star charts cover the glass roof; its brass instruments are calibrated to a different consensus reality.':'The California Institute for Consciousness Research. Celestial tiles and a copper observatory promise a rigorous measurement of the ineffable. Professor Meridian still needs a research assistant with a prehensile tail.',start,count:m.data.length-start,lo,hi};
    });
}

export function createResearcherNPCs(){
    return RESEARCHERS.map((person,index)=>{
        const c=RESEARCH_CAMPUSES.find(c=>c.id===person.campus),side=person.x<c.x?-1:1;
        // One researcher uses the indoor aisle; the others stroll around the
        // courtyard furnishings. Both routes use the shared collision plan.
        const indoors=RESEARCHERS.find(p=>p.campus===person.campus)===person;
        const points=indoors?[[c.x-.6,c.z+.6],[c.x+.6,c.z+.6],[c.x+.6,c.z-.8],[c.x-.6,c.z-.8]]:person.seated?
            [[c.x-1.4,174.6],[c.x-2.8,174.6],[c.x-2.8,175.03],[c.x+2.8,175.03],[c.x+2.8,174.6],[c.x+1.4,174.6],[c.x+1.4,175.03],[c.x-1.4,175.03]]:
            [[person.x,person.z],[c.x+side*1.4,173.2],[c.x+side*1.4,174.55],[c.x+side*3.1,174.55],[c.x+side*3.1,172.8],[person.x,172.8]];
        return {...person,kind:'researcher',researcher:true,seated:false,x:points[0][0],z:points[0][1],base:c.base+.025,height:1.85,angle:Math.PI/2,hold:0,waiting:false,points,routeIndex:1,pause:.5+index*.55,speed:.56+(index%3)*.09,phase:index*.9,motion:0,moving:false,stops:0,
            get approach(){return {x:this.x-.5,y:this.z+.65-.5};}};
    });
}

/** Distance-driven walking with staggered thinking breaks. No per-frame
 * pathfinding: the courtyard loops are checked against the tile graph in tests. */
export function moveResearcherNPCs(people,dt,{paused=false,lookAt=null}={}){
    if(dt<=0)return;
    for(const npc of people){
        if(!npc.researcher)continue;
        let remaining=dt,distance=0,facing=npc.angle;
        const held=npc.hold>0||npc.waiting;
        if(npc.hold>0&&!paused)npc.hold=Math.max(0,npc.hold-dt);
        if(!paused&&!held){
            while(remaining>1e-8){
                if(npc.pause>0){const spent=Math.min(remaining,npc.pause);npc.pause-=spent;remaining-=spent;continue;}
                const [x,z]=npc.points[npc.routeIndex],dx=x-npc.x,dz=z-npc.z,d=Math.hypot(dx,dz),step=Math.min(d,npc.speed*remaining);
                if(d>1e-8){npc.x+=dx/d*step;npc.z+=dz/d*step;facing=Math.atan2(dz,dx);distance+=step;remaining-=step/npc.speed;}
                if(d-step<1e-8){npc.routeIndex=(npc.routeIndex+1)%npc.points.length;npc.stops++;npc.pause=1.1+((npc.stops*7+npc.id.length)%9)*.32;}
            }
        }
        npc.moving=distance>1e-8;npc.phase+=distance*Math.PI*2/CHARACTER_CLIPS.walk.stride;
        npc.motion+=(Number(npc.moving)-npc.motion)*(1-Math.exp(-dt*12));
        if(held&&lookAt)facing=Math.atan2(lookAt.z-npc.z,lookAt.x-npc.x);
        npc.angle+=Math.max(-dt*3,Math.min(dt*3,Math.atan2(Math.sin(facing-npc.angle),Math.cos(facing-npc.angle))));
    }
}
