/** Percentage, not frame count: one point wears off every three active seconds. */
export function createInebriation(saved=0,onChange=()=>{}){
    const state={percent:Number.isFinite(saved)?Math.max(0,Math.min(100,saved)):0};let stored=Math.floor(state.percent);
    function set(value){state.percent=Math.max(0,Math.min(100,value));stored=Math.floor(state.percent);onChange(state.percent);}
    return {state,set,drink(economy){
        if(state.percent>=100)return {ok:false,message:'The bartender suggests a glass of water. You are already 100% inebriated.'};
        const result=economy.trade('beer');if(!result.ok)return result;set(Math.min(100,state.percent+10));return {ok:true,message:'A cold beer, one coin. You are '+Math.round(state.percent)+'% inebriated.'};
    },update(dt){if(!Number.isFinite(dt)||dt<=0)return;state.percent=Math.max(0,state.percent-dt/3);if(Math.floor(state.percent)!==stored){stored=Math.floor(state.percent);onChange(state.percent);}},get intensity(){return state.percent/100;}};
}

export function swayCharacter(m,start,x,base,z,time,intensity){
    const a=Math.sin(time*.0015)*.11*intensity,b=Math.cos(time*.0011)*.065*intensity;
    for(let i=start;i<m.data.length;i+=11){const h=m.data[i+1]-base;
        m.data[i]+=a*h;m.data[i+2]+=b*h;
        // The inverse transpose keeps lighting attached to the swaying body.
        const nx=m.data[i+3],ny=m.data[i+4]-a*nx-b*m.data[i+5],nz=m.data[i+5],len=Math.hypot(nx,ny,nz)||1;
        m.data[i+3]=nx/len;m.data[i+4]=ny/len;m.data[i+5]=nz/len;
    }
}
