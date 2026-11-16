import {drawCharacter} from './characters.js';
import {estatePoint} from './estate-design.js';

export function createEstateResidents(houses){
    return houses.filter(h=>h.pool).map((h,i)=>{
        const pool=h.pool,[x,z]=pool.center,edge=estatePoint(h.plot,pool.x+pool.w/2,h.d/2+.38);
        return {id:'estate-swimmer-'+i,label:i%2?'Woman':'Man',estateResident:true,regional:true,female:!!(i%2),x,z,origin:[x,z],base:pool.base-1.13,height:1.85,angle:h.rotation+Math.PI/2,pool,seed:i*1.73,approach:{x:edge[0]-.5,y:edge[1]-.5},skin:['#ad805e','#79543d','#c6a284'][i%3],shirt:['#b88173','#5d91a0','#7d9161'][i%3],description:['A resident doing very small laps in a very expensive pool. Calls this a liquidity event.','Has mastered the difficult art of scheduling absolutely nothing before lunch.','A dedicated student of water temperature and cantilevered architecture.'][i%3],poolTalk:['The architect called it a reflecting pool. I am reflecting on not going to work.','They asked if I wanted a home office. I asked for another sun lounger.','The pool is heated. My financial adviser says that is technically a burn rate.'][i%3]};
    });
}

/** Reuses the cached human rig and the existing dynamic batch. Only nearby
 * pools animate; immersion and the shallow-water depth buffer hide the legs. */
export function drawEstateResidents(m,residents,time,viewer,reduced=false,addTarget=()=>{}){
    for(const npc of residents){
        if(Math.hypot(npc.origin[0]-viewer[0],npc.origin[1]-viewer[1])>26)continue;
        const t=reduced?0:time*.001+npc.seed;
        npc.x=npc.origin[0]+Math.cos(t*.31)*.10;npc.z=npc.origin[1]+Math.sin(t*.31)*.12;
        const start=m.data.length;
        drawCharacter(m,npc.x,npc.z,npc.base+Math.sin(t*1.8)*.018,npc.angle,0,false,npc.skin,npc.shirt,{mode:'swim',female:npc.female,longHair:npc.female,backpack:false,pants:npc.shirt,time:t});
        addTarget(start,npc);
        // Fine concentric ripples, kept outside the human hit box.
        for(const radius of [.29,.43])for(let i=0;i<24;i++){
            const a=i*Math.PI/12,b=(i+1)*Math.PI/12,r=radius+.012*Math.sin(t*2);
            m.quad([npc.x+Math.cos(a)*r,npc.pool.base+.012,npc.z+Math.sin(a)*r],[npc.x+Math.cos(a)*(r+.009),npc.pool.base+.012,npc.z+Math.sin(a)*(r+.009)],[npc.x+Math.cos(b)*(r+.009),npc.pool.base+.012,npc.z+Math.sin(b)*(r+.009)],[npc.x+Math.cos(b)*r,npc.pool.base+.012,npc.z+Math.sin(b)*r],'#abd4ca');
        }
    }
}
