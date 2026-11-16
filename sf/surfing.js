import {pose} from './geometry.js';
import {drawCharacter} from './characters.js';
import {westernCoastX} from './coastline.js';

export const PACIFICA_SURF_SPOT=Object.freeze({z:121.5,launchDistance:1.6,north:108,south:143});
export const SURF_TRICKS=Object.freeze([{id:'air-360',label:'Air 360',key:'1',duration:1.05,points:120},{id:'kickflip',label:'Kickflip',key:'2',duration:1.1,points:150},{id:'backflip',label:'Backflip',key:'3',duration:1.2,points:180}].map(Object.freeze));
export function sampleSurfWave(seconds,index,z=PACIFICA_SURF_SPOT.z){
    const offshore=1.4+((index*2.4-seconds*.22)%9.6+9.6)%9.6,fade=Math.max(0,Math.min(1,(offshore-1.4)/.55,(11-offshore)/.6));
    return {x:westernCoastX(z)-offshore,z,offshore,height:.4*fade};
}
/** Riding a wave follows the authored coastline, with the same water segment
 * rule used for paddling. Tricks never alter collision or teleport the rider. */
export function createSurfing({water=(x,z)=>x<westernCoastX(z),segment=(a,b)=>water(a.x,a.z)&&water(b.x,b.z)}={}){
    const state={active:false,phase:'paddling',ride:null,trick:null,position:null,angle:Math.PI/2,score:0,landed:0,settle:0};
    function stop(){state.active=false;state.phase='paddling';state.ride=null;state.trick=null;state.position=null;state.settle=0;}
    function start(position){stop();state.active=true;state.position={...position};state.score=0;state.landed=0;}
    function nearby(position,seconds){
        if(!state.active||position.z<PACIFICA_SURF_SPOT.north||position.z>PACIFICA_SURF_SPOT.south||!water(position.x,position.z))return null;
        return Array.from({length:4},(_,i)=>sampleSurfWave(seconds,i,position.z)).filter(w=>w.height>.08&&Math.abs(w.x-position.x)<1.7).sort((a,b)=>Math.abs(a.x-position.x)-Math.abs(b.x-position.x))[0]||null;
    }
    function catchWave(position,seconds){
        if(state.ride||state.settle>0)return false;const wave=nearby(position,seconds);if(!wave)return false;
        state.position={...position};state.phase='riding';state.angle=Math.PI/2;state.ride={elapsed:0,duration:6.4,startZ:position.z,offshore:wave.offshore,fromOffshore:westernCoastX(position.z)-position.x,direction:1};return true;
    }
    function cancelRide(){if(state.ride)state.settle=.4;state.ride=null;state.trick=null;state.phase='paddling';}
    function steer(x,z){if(!state.ride||!Number.isFinite(x)||!Number.isFinite(z))return false;if(Math.abs(z-state.position.z)>.5)state.ride.direction=z>state.position.z?1:-1;return true;}
    function trick(id){const t=SURF_TRICKS.find(t=>t.id===id),r=state.ride;if(!t||!r||state.trick||r.elapsed<.4||r.duration-r.elapsed<t.duration+.1)return false;state.trick={...t,elapsed:0};return true;}
    function update(dt){
        const events=[],r=state.ride;if(!Number.isFinite(dt)||dt<=0)return events;if(!r){state.settle=Math.max(0,state.settle-dt);return events;}
        // Small steps preserve the same shoreline collision at any frame rate.
        let remaining=Math.min(dt,30);
        while(remaining>1e-8&&state.ride){
            const step=Math.min(.05,remaining);remaining-=step;r.elapsed=Math.min(r.duration,r.elapsed+step);
            const z=state.position.z+r.direction*3.6*step,b=Math.min(1,r.elapsed/.4),blend=b*b*(3-2*b),offshore=r.fromOffshore*(1-blend)+(r.offshore-r.elapsed*.22)*blend,next={x:westernCoastX(z)-offshore,z};
            if(!water(next.x,next.z)||!segment(state.position,next)||offshore<1.2){cancelRide();events.push({type:'finish'});break;}
            const heading=Math.atan2(next.z-state.position.z,next.x-state.position.x);state.position=next;
            state.angle+=Math.max(-step*4,Math.min(step*4,Math.atan2(Math.sin(heading-state.angle),Math.cos(heading-state.angle))));
            if(state.trick){state.trick.elapsed=Math.min(state.trick.duration,state.trick.elapsed+step);if(state.trick.elapsed>=state.trick.duration-1e-8){const t=state.trick;state.score+=t.points;state.landed++;state.trick=null;events.push({type:'trick',label:t.label,points:t.points});}}
            if(r.elapsed>=r.duration-1e-8){cancelRide();events.push({type:'finish'});}
        }
        return events;
    }
    const poseAt=()=>{const r=state.ride,t=state.trick,p=t?t.elapsed/t.duration:0,stand=r?Math.min(1,r.elapsed/.4):state.settle/.4;return {stand,height:(r?.16*stand+.18*Math.sin(Math.PI*r.elapsed/r.duration):.16*stand)+(t?Math.sin(Math.PI*p)*1.55:0),yaw:t?.id==='air-360'?Math.PI*2*p:0,roll:t?.id==='kickflip'?Math.PI*2*p:0,pitch:t?.id==='backflip'?-Math.PI*2*p:0,trickProgress:p};};
    return {state,start,stop,nearby,catchWave,cancelRide,steer,trick,update,get pose(){return poseAt();}};
}

export function drawSurfboard(m,color='#6c9da7'){
    const rim=(i,y,scale=1)=>{const a=i*Math.PI/16;return [Math.cos(a)*(Math.cos(a)>0?1.05:.94)*scale,y,Math.sin(a)*.25*scale];};
    for(let i=0;i<32;i++){
        m.quad(rim(i+1,.035),rim(i,.035),rim(i,.105,.96),rim(i+1,.105,.96),color);m.tri([0,.105,0],rim(i+1,.105,.96),rim(i,.105,.96),'#e6dfc7');
        m.tri([0,.035,0],rim(i,.035),rim(i+1,.035),color);
    }
    m.box(-.6,.108,-.15,.66,.009,.3,color,'roof');m.box(-.48,.118,-.012,1.2,.008,.024,color);
    for(const z of [-.12,0,.12])m.tri([-.73,.035,z],[-.87,-.12,z],[-.49,.035,z],'#445e62');
}
export function drawSurfRack(m,{x,z,base}){
    pose(m,x,base,z,0,()=>{
        for(const zz of [-.8,.8]){m.rod([.14,0,zz],[.14,1.8,zz],.035,'#876f52',10);m.rod([-.2,.14,zz],[.32,.14,zz],.028,'#876f52',8);}
        m.rod([.14,1.1,-.85],[.14,1.1,.85],.035,'#876f52',10);
        for(const [i,color] of ['#d99469','#6ca8af','#d0b963'].entries()){
            const start=m.data.length;drawSurfboard(m,color);for(let k=start;k<m.data.length;k+=11){const xx=m.data[k],yy=m.data[k+1],nx=m.data[k+3],ny=m.data[k+4];m.data[k]=-.03-yy;m.data[k+1]=1.1+xx;m.data[k+2]+=(i-1)*.58;m.data[k+3]=-ny;m.data[k+4]=nx;}
        }
    });
}
export function drawWaveSurfer(m,x,z,base,angle,time,surfPose,{appearance={},moving=false,reduced=false}={}){
    pose(m,x,base,z,angle+surfPose.yaw,()=>{
        const start=m.data.length;drawSurfboard(m,'#6da6ad');
        if(surfPose.roll){const c=Math.cos(surfPose.roll),s=Math.sin(surfPose.roll);for(let i=start;i<m.data.length;i+=11){const y=m.data[i+1]-.075,z=m.data[i+2],ny=m.data[i+4],nz=m.data[i+5];m.data[i+1]=.075+y*c-z*s;m.data[i+2]=y*s+z*c;m.data[i+4]=ny*c-nz*s;m.data[i+5]=ny*s+nz*c;}}
        const rider=m.data.length,blend=surfPose.stand;drawCharacter(m,0,0,0,0,0,false,appearance.skin||'#b78e6c',appearance.shirt||'#4e7079',{...appearance,mode:blend?'surfboard':'paddle',time:reduced?0:time*.001,backpack:false,cap:false,motion:0,action:surfPose.roll?'skate-trick':null,actionT:surfPose.trickProgress});
        const a=-(1-blend)*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
        for(let i=rider;i<m.data.length;i+=11){const x=m.data[i],y=m.data[i+1]-.85,nx=m.data[i+3],ny=m.data[i+4];m.data[i]=x*c-y*s;m.data[i+1]=x*s+y*c+.85-.6*(1-blend)+.1*blend;m.data[i+3]=nx*c-ny*s;m.data[i+4]=nx*s+ny*c;}
        if(surfPose.pitch){const c=Math.cos(surfPose.pitch),s=Math.sin(surfPose.pitch);for(let i=start;i<m.data.length;i+=11){const x=m.data[i],y=m.data[i+1]-.75,nx=m.data[i+3],ny=m.data[i+4];m.data[i]=x*c-y*s;m.data[i+1]=x*s+y*c+.75;m.data[i+3]=nx*c-ny*s;m.data[i+4]=nx*s+ny*c;}}
        if(moving&&!surfPose.pitch)for(const side of [-1,1])m.rod([-1.1,.02,side*.2],[-1.6,.015,side*.32],.013,'#c9e0d8',4);
    });
}
export function drawPacificaWaves(m,time,viewer){
    if(viewer.z<80||viewer.z>170||viewer.x>40)return;
    // These crests are gameplay targets, so they follow the simulation clock
    // even when decorative character motion is reduced.
    const seconds=time*.001,slices=Math.ceil((PACIFICA_SURF_SPOT.south-PACIFICA_SURF_SPOT.north)/.7);
    // Both sides of a slice use the same endpoint profile as their neighbors.
    // Taper the width as well as the height so the ends dissolve into the sea.
    const endpoint=(wave,z)=>{const w=sampleSurfWave(seconds,wave,z),t=Math.max(0,Math.min(1,(z-PACIFICA_SURF_SPOT.north)/3,(PACIFICA_SURF_SPOT.south-z)/3)),fade=t*t*(3-2*t);return {...w,fade,y:.025+(.035+w.height)*fade};};
    for(let wave=0;wave<4;wave++)for(let i=0;i<slices;i++){
        const z=PACIFICA_SURF_SPOT.north+i*.7,zz=Math.min(PACIFICA_SURF_SPOT.south,PACIFICA_SURF_SPOT.north+(i+1)*.7),a=endpoint(wave,z),b=endpoint(wave,zz);
        if(Math.hypot(a.x-viewer.x,z-viewer.z)>36||a.height<.02)continue;
        m.quad([a.x-.8*a.fade,.025,z],[b.x-.8*b.fade,.025,zz],[b.x,b.y,zz],[a.x,a.y,z],'#7daeb0',{water:.25});
        m.quad([a.x,a.y,z],[b.x,b.y,zz],[b.x+.4*b.fade,.025,zz],[a.x+.4*a.fade,.025,z],'#94c0bb',{water:.25});
        m.quad([a.x-.035*a.fade,a.y+.01*a.fade,z],[b.x-.035*b.fade,b.y+.01*b.fade,zz],[b.x+.045*b.fade,b.y+.01*b.fade,zz],[a.x+.045*a.fade,a.y+.01*a.fade,z],'#d1e6dd');
    }
}
