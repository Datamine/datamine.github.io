const captureSmooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const CAPTURE_DURATION=2;

/** Keep the encounter at its original location until the collapse finishes. */
export function createCaptureAnimation(){
    const state={active:false,elapsed:0,kind:null,base:0};let finish=null;
    return {state,start(kind,base,onComplete){
        if(state.active)return false;
        Object.assign(state,{active:true,elapsed:0,kind,base});finish=onComplete;return true;
    },update(dt){
        if(!state.active)return;
        state.elapsed=Math.min(CAPTURE_DURATION,state.elapsed+Math.max(0,dt));
        if(state.elapsed>=CAPTURE_DURATION){state.active=false;const done=finish;finish=null;done?.();}
    },cancel(){state.active=false;state.elapsed=0;finish=null;},get pose(){return {hands:captureSmooth(state.elapsed/.5),fall:captureSmooth((state.elapsed-.65)/.85)};}};
}

/** Rotate the already skinned body forward, leaving the camera and tile fixed. */
export function collapseCharacterMesh(m,start,x,base,z,heading,fall){
    const a=fall*Math.PI/2,c=Math.cos(a),s=Math.sin(a),fx=Math.cos(heading),fz=Math.sin(heading);
    for(let i=start;i<m.data.length;i+=11){
        const dx=m.data[i]-x,dz=m.data[i+2]-z,u=dx*fx+dz*fz,h=m.data[i+1]-base,forward=u*c+h*s;
        m.data[i]=x+dx+fx*(forward-u);m.data[i+2]=z+dz+fz*(forward-u);m.data[i+1]=base+h*c-u*s+.25*fall;
        const nu=m.data[i+3]*fx+m.data[i+5]*fz,ny=m.data[i+4],turned=nu*c+ny*s;
        m.data[i+3]+=fx*(turned-nu);m.data[i+5]+=fz*(turned-nu);m.data[i+4]=ny*c-nu*s;
    }
}
