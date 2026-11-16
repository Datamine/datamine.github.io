import {pose} from './geometry.js';
import {WATER_LEVEL} from './water-tiles.js';

export const FISHING_DURATION=3.2;
export function createFishing(economy){
    const state={active:false,elapsed:0,site:null};
    function cancel(){state.active=false;state.elapsed=0;state.site=null;}
    function start(site){
        if(economy.state.fish)return {ok:false,message:'You can only carry one live fish. Sell yours to the chef at Cotogna first.'};
        if(state.active)return {ok:false,message:'Your line is already in the water.'};
        Object.assign(state,{active:true,elapsed:0,site});return {ok:true,message:'You cast your line. Something is nibbling…'};
    }
    function update(dt){
        if(!state.active||!Number.isFinite(dt)||dt<=0)return null;state.elapsed+=dt;if(state.elapsed+1e-9<FISHING_DURATION)return null;
        const result=economy.trade('catch-fish');cancel();return {...result,message:result.ok?'You catch a live fish and slip it into a bucket of water. The chef at Cotogna will buy it for 5 coins.':result.message};
    }
    return {state,start,cancel,update,get progress(){return Math.min(1,state.elapsed/FISHING_DURATION);}};
}

export function drawLiveFish(m,x,y,z,angle=0,time=0,scale=1){
    pose(m,x,y,z,angle,()=>{
        m.sphere(0,0,0,.18*scale,.065*scale,.058*scale,'#8faeab',16,8,{metal:.18});
        m.sphere(.12*scale,.012*scale,0,.065*scale,.054*scale,.055*scale,'#a8c5bd',12,8);
        for(const side of [-1,1])m.sphere(.14*scale,.025*scale,side*.045*scale,.012*scale,.013*scale,.008*scale,'#233e41',8,4);
        const wag=Math.sin(time*8)*.045*scale;
        m.tri([-.14*scale,0,0],[-.29*scale,.085*scale,wag],[-.29*scale,-.075*scale,wag],'#537e80');
        m.tri([-.07*scale,.04*scale,0],[.03*scale,.12*scale,0],[.09*scale,.04*scale,0],'#638a88');
    });
}
export function drawFishBucket(m,x,base,z,angle=0,time=0,occupied=true){
    pose(m,x,base,z,angle,()=>{
        m.cylinder(0,0,0,.14,.28,'#809a9c',20,.18,{metal:.22});m.cylinder(0,.275,0,.185,.025,'#b2c2ba',24,.185,{metal:.3});
        m.cylinder(0,.302,0,.155,.006,'#669da6',24,.155,{water:2});
        for(let i=0;i<16;i++){const at=a=>[Math.cos(a)*.19,.28+Math.sin(a)*.22,0];m.rod(at(i*Math.PI/16),at((i+1)*Math.PI/16),.009,'#c5c9b6',6,{metal:.3});}
        if(occupied)drawLiveFish(m,0,.32,0,Math.sin(time*.8)*.2,time,.55);
    });
}
export function drawFishingSpot(m,site,time,reduced=false){
    const {water,entry}=site,t=reduced?0:time*.001;
    drawFishBucket(m,entry.x+.25,site.base,entry.y+.75,0,t,false);
    m.rod([entry.x+.3,site.base+.06,entry.y+.72],[entry.x+.42,site.base+.78,entry.y+.64],.014,'#9d815d',10);
    for(let ring=0;ring<2;ring++)for(let i=0;i<24;i++){
        const r=.28+ring*.17+Math.sin(t*1.5+ring)*.025,at=a=>[water.x+Math.cos(a)*r,WATER_LEVEL+.018,water.z+Math.sin(a)*r*.55];
        m.rod(at(i*Math.PI/12),at((i+1)*Math.PI/12),.006,'#a3c7bf',4);
    }
    m.sphere(water.x,WATER_LEVEL+.07+Math.sin(t*2)*.018,water.z,.05,.075,.05,'#bf7659',12,8);
    drawLiveFish(m,water.x+Math.sin(t*.8)*.18,WATER_LEVEL+.035,water.z+.13,t*.35,t,.8);
}
export function drawFishingRod(m,player,base,progress){
    const site=player.site,dx=site.water.x-player.x,dz=site.water.z-player.z,angle=Math.atan2(dz,dx),distance=Math.hypot(dx,dz),lift=Math.sin(progress*Math.PI)*.12;
    pose(m,player.x,base,player.z,angle,()=>{
        const tip=[1.05,1.65+lift,0];m.rod([.35,.95,.13],[.7,1.28,.06],.018,'#896c4f',10);m.rod([.7,1.28,.06],tip,.012,'#bda574',8);
        m.sphere(.42,1.02,.14,.045,.045,.025,'#879b99',12,8,{metal:.4});
        m.rod(tip,[distance,WATER_LEVEL-base+.1,0],.003,'#d8dfc6',4);
    });
    if(progress>.67&&progress<.96){const f=(progress-.67)/.29;drawLiveFish(m,site.water.x,WATER_LEVEL+.13+Math.sin(f*Math.PI)*.5,site.water.z,angle,progress*10);}
}
