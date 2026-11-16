import {pose} from './geometry.js';

export const SUNGLASSES_BEACH_TARGET=Object.freeze({x:8.9,y:42});

/** Ownership is inventory; the wear preference lives with character settings. */
export function createSunglasses(saved={},onChange=()=>{}){
    const state={owned:saved?.owned===true};
    function pickUp(){
        if(state.owned)return {ok:false,message:'You already picked up the sunglasses.'};
        state.owned=true;onChange({...state});
        return {ok:true,message:'You pick up the sunglasses. Open Character (C) to wear them. Some things are easier to see through dark lenses.'};
    }
    return {state,pickUp};
}

/** Select a connected sand cell from the actual tile graph, not screen pixels. */
export function beachSunglassesSite(navigation,{scale=1.5,from}){
    const region=navigation.regionAt(from.x,from.y),entry=navigation.nearest(SUNGLASSES_BEACH_TARGET.x*scale-.5,SUNGLASSES_BEACH_TARGET.y*scale-.5,6,(x,y)=>navigation.regionAt(x,y)===region&&navigation.describe(x,y).type==='sand');
    if(!entry)throw new Error('Sunglasses need a reachable sand tile on Ocean Beach');
    return {id:'beach-sunglasses',kind:'sunglasses',label:'Sunglasses',entry,x:entry.x+.5,z:entry.y+.5,description:'Battered black sunglasses, washed up on Ocean Beach. The advertising industry would prefer that you leave them here.'};
}

/** A pair of folded wayfarers lies directly on the sand. */
export function drawDroppedSunglasses(m,site,base,time=0,{reduced=false}={}){
    pose(m,site.x,base+.045,site.z,.3,()=>{
        for(const side of [-1,1]){
            const cx=side*.17,outline=[[-.13,-.105],[.12,-.105],[.14,.055],[.09,.11],[-.09,.11],[-.14,.055]].map(([x,z])=>[cx+x,.012,z]);
            for(let i=1;i<outline.length-1;i++)m.tri(outline[0],outline[i+1],outline[i],'#2b3e3a',{metal:.18});
            for(let i=0;i<outline.length;i++)m.rod(outline[i],outline[(i+1)%outline.length],.018,'#202725',6);
            m.rod([side*.31,.015,-.07],[side*.25,.055,-.25],.014,'#202725',6);
            m.rod([side*.25,.055,-.25],[side*.04,.055,-.23],.013,'#202725',6);
            m.rod([cx-.065,.018,-.07],[cx-.015,.018,-.07],.006,'#a0bab5',4);
        }
        m.rod([-.045,.025,-.045],[.045,.025,-.045],.014,'#202725',8);
        const glint=reduced?.6:Math.max(0,Math.sin(time*.002))**12;
        if(glint>.1){const x=.23,z=.07,size=.045*glint;
            m.rod([x-size,.065,z],[x+size,.065,z],.006,'#f3e5af',4,{emissive:.75});
            m.rod([x,.065,z-size],[x,.065,z+size],.006,'#f3e5af',4,{emissive:.75});
        }
    });
}
