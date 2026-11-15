import {rgb} from './geometry.js';

// Original meshes and clips. Research notes: sf/README.md. The joint groups,
// indexed bind mesh and reusable poses follow the approach of classic clients;
// no RuneScape models, cache data or animation frames are included.
export const CHARACTER_CLIPS=Object.freeze({
    walk:{stride:.92,stance:.56,lift:.15,hip:.855,arm:.34},
    run:{stride:2,stance:.35,lift:.32,hip:.795,arm:.62},
    cycle:{stride:Math.PI*.62},climb:{stride:.56,stance:.6,lift:.1},sit:{},surf:{},idle:{}
});
export const CHARACTER_BONES=Object.freeze({
    pelvis:0,spine:1,chest:2,head:3,leftArm:4,leftForearm:5,leftHand:6,
    rightArm:7,rightForearm:8,rightHand:9,leftThigh:10,leftShin:11,
    leftFoot:12,rightThigh:13,rightShin:14,rightFoot:15
});
const CHAR_BIND=[
    [0,.88,0],[0,1.06,0],[0,1.27,0],[0,1.45,0],
    [-.245,1.32,0],[-.245,1.01,0],[-.245,.735,0],
    [.245,1.32,0],[.245,1.01,0],[.245,.735,0],
    [-.11,.88,0],[-.11,.47,0],[-.11,.09,0],
    [.11,.88,0],[.11,.47,0],[.11,.09,0]
];
const CHAR_SLOT={skin:0,shirt:1,pants:2,hair:3,shoe:4,trim:5,eye:6,white:7,metal:8,belt:9,bag:10};
const CHAR_TAU=Math.PI*2;
const charClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const charMix=(a,b,t)=>a+(b-a)*t;
const charUnit=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
const charCross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const charSub=(a,b)=>a.map((v,i)=>v-b[i]);
const charDot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const charIdentity=[1,0,0,0,1,0,0,0,1];

function charEuler(x=0,y=0,z=0){
    const a=Math.cos(x),b=Math.sin(x),c=Math.cos(y),d=Math.sin(y),e=Math.cos(z),f=Math.sin(z);
    return [e*c,e*d*b-f*a,e*d*a+f*b,f*c,f*d*b+e*a,f*d*a-e*b,-d,c*b,c*a];
}
function charMultiply(a,b){
    const r=new Array(9);
    for(let y=0;y<3;y++)for(let x=0;x<3;x++)r[y*3+x]=a[y*3]*b[x]+a[y*3+1]*b[x+3]+a[y*3+2]*b[x+6];
    return r;
}
function charRotate(r,p){return [r[0]*p[0]+r[1]*p[1]+r[2]*p[2],r[3]*p[0]+r[4]*p[1]+r[5]*p[2],r[6]*p[0]+r[7]*p[1]+r[8]*p[2]];}
function charFrame(out,id,p,r){
    const k=id*12,b=CHAR_BIND[id];
    for(let row=0;row<3;row++){
        for(let col=0;col<3;col++)out.matrices[k+row*4+col]=r[row*3+col];
        out.matrices[k+row*4+3]=p[row]-r[row*3]*b[0]-r[row*3+1]*b[1]-r[row*3+2]*b[2];
        out.joints[id*3+row]=p[row];
    }
    out.rotations[id]=r;
}
function charJoint(out,id){return Array.from(out.joints.subarray(id*3,id*3+3));}
function charChild(out,id,parent,rotation){
    const r=out.rotations[parent],offset=charRotate(r,charSub(CHAR_BIND[id],CHAR_BIND[parent])),p=charJoint(out,parent).map((v,i)=>v+offset[i]);
    charFrame(out,id,p,charMultiply(r,rotation));
}
function charSegment(out,id,start,end){
    const y=charUnit(charSub(start,end)),ref=Math.abs(y[2])>.95?[0,1,0]:[0,0,1],x=charUnit(charCross(y,ref)),z=charCross(x,y);
    charFrame(out,id,start,[x[0],y[0],z[0],x[1],y[1],z[1],x[2],y[2],z[2]]);
}
function charIK(start,target,a,b,pole){
    const v=charSub(target,start),length=Math.hypot(...v),d=charClamp(length,Math.abs(a-b)+.0001,a+b-.0001),axis=charUnit(v);
    let across=charSub(pole,axis.map(n=>n*charDot(pole,axis)));
    if(Math.hypot(...across)<.0001)across=charCross(axis,[1,0,0]);
    across=charUnit(across);
    const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
    return {knee:start.map((n,i)=>n+axis[i]*along+across[i]*height),end:start.map((n,i)=>n+axis[i]*d)};
}
function charHermite(a,b,da,db,t){
    const t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*a+(t3-2*t2+t)*da+(-2*t3+3*t2)*b+(t3-t2)*db;
}
function charStep(f,stride,stance,lift){
    const reach=stride*stance/2;
    if(f<stance)return {z:reach-stride*f,y:.1,pitch:charMix(-.12,.18,f/stance),contact:true};
    const t=(f-stance)/(1-stance),travel=stride*(1-stance);
    const turn=.3/stance*(1-stance);
    return {z:charHermite(-reach,reach,-travel,-travel,t),y:.1+Math.sin(Math.PI*t)**2*lift,pitch:charHermite(.18,-.12,turn,turn,t)+.22*Math.sin(Math.PI*t)**2,contact:false};
}
export function createCharacterPose(){return {matrices:new Float32Array(16*12),joints:new Float32Array(16*3),rotations:new Array(16),feet:[]};}

/** Feet are pose targets. Two-bone IK preserves limb lengths and planted
 * contacts, including on slopes, instead of stretching cylinders between tips. */
export function sampleCharacterPose(mode='idle',phase=0,options={},out=createCharacterPose()){
    const motion=charClamp(options.motion??(mode==='move'||mode==='climb'?1:0),0,1),run=charClamp(options.run??0,0,1),time=options.time||0;
    const cycle=((phase/CHAR_TAU)%1+1)%1,walk=CHARACTER_CLIPS.walk,jog=CHARACTER_CLIPS.run;
    const stride=charMix(walk.stride,jog.stride,run),stance=charMix(walk.stance,jog.stance,run),lift=charMix(walk.lift,jog.lift,run);
    let hip=charMix(.86,charMix(walk.hip,jog.hip,run),motion),rootX=0,rootZ=0,lean=.025,roll=0,twist=0;
    const gesture=options.action,gestureT=charClamp(options.actionT||0,0,1),gestureWeight=gestureT===0||gestureT===1?0:Math.sin(Math.PI*gestureT);
    const feet=[];
    for(let side=0;side<2;side++){
        const f=(cycle+side*.5)%1,step=charStep(f,stride,stance,lift),sign=side?1:-1,climbing=mode==='climb'?charStep(f,CHARACTER_CLIPS.climb.stride,CHARACTER_CLIPS.climb.stance,CHARACTER_CLIPS.climb.lift):null;
        let x=sign*.11,y=charMix(.1,step.y,motion),z=step.z*motion,pitch=step.pitch*motion;
        if(mode==='cycle'){x=sign*.13;y=.11+Math.sin(phase+side*Math.PI)*.17;z=.01+Math.cos(phase+side*Math.PI)*.17;pitch=-.1;}
        else if(mode==='sit'){y=.1;z=.36;pitch=0;}
        else if(mode==='surf'){x=side?-.10:-.27;y=.1;z=side?.17:-.18;pitch=0;}
        else if(climbing){y=charMix(.1,.25+climbing.z,motion);z=charMix(0,.2-(climbing.y-.1),motion);pitch=-.1*motion;}
        if(options.ground&&(mode==='idle'||mode==='move')){
            y+=options.ground(x,z);
            pitch-=charClamp(Math.atan((options.ground(x,z+.14)-options.ground(x,z-.1))/.24),-.35,.35);
        }
        if(mode==='move')y+=Math.sin(Math.abs(step.pitch*motion))*(step.pitch>0?.22:.09);
        feet.push({point:[x,y,z],pitch,contact:climbing?!motion||climbing.contact:mode!=='move'||!motion||step.contact});
    }
    if(mode==='cycle'){hip=.57;rootZ=-.16;lean=.44;}
    else if(mode==='sit'){hip=.57;lean=.035;}
    else if(mode==='surf'){hip=.80;rootX=.035;rootZ=-.025;lean=.12;roll=-.12;}
    else if(mode==='climb'){hip=charMix(.86,.84,motion);rootZ=-.02*motion;lean=.12*motion;roll=Math.sin(phase)*.018*motion;}
    else{
        const half=cycle*2%1,duty=stance*2;
        const runBounce=half<duty?.035*Math.sin(half/duty*Math.PI):.09*Math.sin((half-duty)/(1-duty)*Math.PI);
        const bounce=charMix(.016*Math.sin(cycle*CHAR_TAU*2),runBounce,run);
        hip+=bounce*motion+.0025*Math.sin(time*1.7)*(1-motion);
        rootX=Math.sin(cycle*CHAR_TAU)*.009*motion;roll=Math.sin(cycle*CHAR_TAU)*.035*motion;
        twist=Math.sin(cycle*CHAR_TAU)*.055*motion;lean+=run*motion*.14;
    }
    lean+=.009*Math.sin(time*1.7)*(1-motion);
    if(gesture==='attack')twist+=.18*gestureWeight;
    if(gesture==='pet'){hip-=.34*gestureWeight;lean+=.28*gestureWeight;rootZ+=.1*gestureWeight;}
    if(gesture==='flinch'){lean-=.15*gestureWeight;hip-=.02*gestureWeight;}
    // Lower the pelvis when a downhill foot needs more reach. All contacts
    // remain attached to the terrain instead of dangling above the road.
    const pelvisRotation=charEuler(0,twist,roll);
    for(const [side,foot] of feet.entries()){
        const offset=charRotate(pelvisRotation,[side?.11:-.11,0,0]),horizontal=Math.hypot(foot.point[0]-rootX-offset[0],foot.point[2]-rootZ-offset[2]);
        hip=Math.min(hip,foot.point[1]+Math.sqrt(Math.max(.05,.788**2-horizontal**2))-offset[1]);
    }
    charFrame(out,0,[rootX,hip,rootZ],pelvisRotation);
    charChild(out,1,0,charEuler(lean*.6,0,0));
    charChild(out,2,1,charEuler(lean*.4,-twist*.7,0));
    charChild(out,3,2,charEuler(-lean*.35,.035*Math.sin(time*.65)*(1-motion),0));
    for(let side=0;side<2;side++){
        const thigh=side?13:10,shin=thigh+1,footBone=thigh+2,offset=charRotate(out.rotations[0],charSub(CHAR_BIND[thigh],CHAR_BIND[0])),start=charJoint(out,0).map((v,i)=>v+offset[i]);
        const leg=charIK(start,feet[side].point,.41,.38,[0,0,1]);
        charSegment(out,thigh,start,leg.knee);charSegment(out,shin,leg.knee,leg.end);
        charFrame(out,footBone,leg.end,charEuler(feet[side].pitch,side?-.045:.045,0));
        feet[side].point=leg.end;
    }
    for(let side=0;side<2;side++){
        const arm=side?7:4,forearm=arm+1,hand=arm+2,sign=side?1:-1;
        const shoulder=charRotate(out.rotations[2],charSub(CHAR_BIND[arm],CHAR_BIND[2])).map((v,i)=>v+out.joints[2*3+i]);
        let wrist=null;
        if(mode==='cycle')wrist=[sign*.18,.73,.40];
        else if(mode==='sit'){wrist=[sign*.15,.81,.34];if(gesture==='eat'&&side)wrist=wrist.map((v,i)=>charMix(v,[.1,1.17,.19][i],gestureWeight));}
        else if(mode==='surf')wrist=[-.30,side?1.12:1.04,side?.38:.10];
        else if(mode==='climb'){
            const step=charStep((cycle+(side?0:.5))%1,CHARACTER_CLIPS.climb.stride,CHARACTER_CLIPS.climb.stance,CHARACTER_CLIPS.climb.lift);
            wrist=[sign*charMix(.22,.13,motion),charMix(.77,1.4+step.z,motion),charMix(.04,.26-(step.y-.1)*.6,motion)];
        }
        if(wrist){
            const limb=charIK(shoulder,wrist,.31,.275,[sign*.7,-.5,-.15]);
            charSegment(out,arm,shoulder,limb.knee);charSegment(out,forearm,limb.knee,limb.end);
            charFrame(out,hand,limb.end,charEuler(-1.05,0,side?.12:-.12));
        }else{
            const swing=Math.cos(cycle*CHAR_TAU)*sign*charMix(walk.arm,jog.arm,run)*motion;
            const upper=charMultiply(out.rotations[2],charEuler(swing,0,sign*.055));
            const elbow=charRotate(upper,[0,-.31,0]).map((v,i)=>v+shoulder[i]);
            const bend=-.12-run*.95*motion-.10*Math.max(0,-Math.cos(cycle*CHAR_TAU)*sign)*motion;
            const lower=charMultiply(upper,charEuler(bend,0,0)),end=charRotate(lower,[0,-.275,0]).map((v,i)=>v+elbow[i]);
            if(side===1&&gestureWeight>0&&['attack','steal','talk','pet'].includes(gesture)){
                const target=gesture==='pet'?[.10,.48,.45+Math.sin((options.actionT||0)*Math.PI*6)*.04]:gesture==='attack'?[.12,1.23,.52]:gesture==='steal'?[.12,1.01,.43]:[.20,1.18,.26];
                const goal=end.map((v,i)=>charMix(v,target[i],gestureWeight)),limb=charIK(shoulder,goal,.31,.275,[sign*.7,-.3,-.1]);
                charSegment(out,arm,shoulder,limb.knee);charSegment(out,forearm,limb.knee,limb.end);charFrame(out,hand,limb.end,charEuler(-gestureWeight,0,0));
            }else{charFrame(out,arm,shoulder,upper);charFrame(out,forearm,elbow,lower);charFrame(out,hand,end,lower);}
        }
    }
    out.feet=feet;return out;
}

class CharacterMeshBuilder{
    constructor(){this.vertices=[];this.indices=[];this.bonesA=[];this.bonesB=[];this.weights=[];this.slots=[];this.shades=[];this.lookup=new Map();}
    tri(a,b,c,slot,influence,tone=1){
        const normal=charUnit(charCross(charSub(b,a),charSub(c,a)));
        for(const p of [a,b,c]){
            const rig=typeof influence==='function'?influence(p):[influence,influence,0];
            const key=p.concat(normal).map(v=>v.toFixed(6)).join(',')+','+rig.join(',')+','+slot+','+tone;
            let id=this.lookup.get(key);
            if(id===undefined){id=this.bonesA.length;this.lookup.set(key,id);this.vertices.push(...p,...normal);this.bonesA.push(rig[0]);this.bonesB.push(rig[1]);this.weights.push(rig[2]);this.slots.push(slot);this.shades.push(tone);}
            this.indices.push(id);
        }
    }
    quad(a,b,c,d,slot,rig,tone=1){this.tri(a,b,c,slot,rig,tone);this.tri(a,c,d,slot,rig,tone);}
    loft(rings,slot,rig,segments=8,cap=true){
        const at=(r,i)=>{const a=i*CHAR_TAU/segments;return [r[0]+Math.sin(a)*r[3],r[1],r[2]+Math.cos(a)*r[4]];};
        for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++)this.quad(at(rings[j],i),at(rings[j],i+1),at(rings[j+1],i+1),at(rings[j+1],i),slot,rig);
        if(cap)for(let i=0;i<segments;i++){const a=rings[0],b=rings[rings.length-1];this.tri(a.slice(0,3),at(a,i+1),at(a,i),slot,rig);this.tri(b.slice(0,3),at(b,i),at(b,i+1),slot,rig);}
    }
    box(x,y,z,w,h,d,slot,rig,tone=1){
        const a=[x,y,z],b=[x+w,y,z],c=[x+w,y,z+d],e=[x,y,z+d],A=[x,y+h,z],B=[x+w,y+h,z],C=[x+w,y+h,z+d],E=[x,y+h,z+d];
        this.quad(a,b,c,e,slot,rig,tone);this.quad(A,E,C,B,slot,rig,tone);this.quad(e,c,C,E,slot,rig,tone);this.quad(b,a,A,B,slot,rig,tone);this.quad(a,e,E,A,slot,rig,tone);this.quad(c,b,B,C,slot,rig,tone);
    }
    finish(){return {vertices:new Float32Array(this.vertices),indices:new Uint16Array(this.indices),bonesA:new Uint8Array(this.bonesA),bonesB:new Uint8Array(this.bonesB),weights:new Float32Array(this.weights),slots:new Uint8Array(this.slots),shades:new Float32Array(this.shades),deformed:new Float32Array(this.vertices.length)};}
}
const charMeshCache=new Map();
function charBlend(a,b,t){return [a,b,charClamp(t,0,1)];}
function charTorsoRig(p){return p[1]<1.12?charBlend(0,1,(p[1]-.91)/.21):charBlend(1,2,(p[1]-1.12)/.19);}
function charBuildMesh({female,longHair,curly,cap,topHat,backpack,coat,uniform}){
    const m=new CharacterMeshBuilder(),S=CHAR_SLOT,waist=female?.142:.164,shoulder=female?.222:.238;
    m.loft([[0,coat?.78:.87,0,.18,.119],[0,.96,0,waist,.112],[0,1.10,0,waist+.017,.125],[0,1.25,0,shoulder,.137],[0,1.34,0,shoulder*.94,.115],[0,1.39,0,.10,.078]],S.shirt,charTorsoRig,8);
    m.loft([[0,.82,0,.167,.106],[0,.90,0,.172,.119],[0,.95,0,.16,.11]],S.pants,0,8);
    m.loft([[0,.89,0,.176,.121],[0,.935,0,.17,.116]],S.belt,0,8);
    m.box(-.027,.897,.12,.054,.031,.012,S.metal,0);
    // Collar, a placket and sleeve cuffs add readable clothing planes.
    m.quad([-.10,1.39,.07],[0,1.27,.14],[-.042,1.31,.142],[-.14,1.35,.10],S.trim,2);
    m.quad([.10,1.39,.07],[.14,1.35,.10],[.042,1.31,.142],[0,1.27,.14],S.trim,2);
    m.box(-.011,1.00,.126,.022,.24,.012,S.trim,charTorsoRig,.78);
    for(const y of [1.06,1.15,1.24])m.box(-.009,y,.143,.018,.018,.008,S.metal,charTorsoRig,.7);
    m.loft([[0,1.37,0,.061,.060],[0,1.49,0,.057,.057]],S.skin,p=>charBlend(2,3,(p[1]-1.39)/.08),8);
    for(let side=0;side<2;side++){
        const x=side?.11:-.11,thigh=side?13:10,shin=thigh+1,foot=thigh+2;
        const legRig=p=>charBlend(thigh,shin,(.55-p[1])/.15);
        m.loft([[x,.10,0,.065,.075],[x,.18,-.005,.071,.077],[x,.38,-.006,.079,.087],[x,.47,0,.081,.092],[x,.55,.008,.091,.106],[x,.75,.003,.101,.108],[x,.90,0,.097,.099]],S.pants,legRig,8);
        // A beveled, forward-facing shoe with a distinct heel and toe.
        m.loft([[x,.015,.061,.077,.144],[x,.045,.068,.080,.154],[x,.107,.038,.071,.120],[x,.145,-.007,.064,.073]],S.shoe,foot,8);
        m.box(x-.069,.013,-.065,.138,.018,.25,S.belt,foot);
        m.box(x-.044,.113,.056,.088,.014,.042,S.trim,foot,.65);
        const arm=side?7:4,forearm=arm+1,hand=arm+2,ax=side?.245:-.245;
        const armRig=p=>p[1]>1.27?charBlend(arm,2,(p[1]-1.27)/.14):charBlend(arm,forearm,(1.09-p[1])/.15);
        m.loft([[ax,.75,0,.052,.061],[ax,.84,0,.057,.063],[ax,.98,0,.066,.067],[ax,1.035,0,.069,.072],[ax,1.20,0,.082,.081],[ax,1.32,0,.090,.086],[ax,1.38,0,.053,.056]],S.shirt,armRig,8);
        m.loft([[ax,.731,0,.055,.063],[ax,.77,0,.056,.063]],S.trim,forearm,8);
        m.loft([[ax,.615,.016,.044,.037],[ax,.65,.022,.051,.045],[ax,.72,.006,.044,.040],[ax,.75,0,.036,.033]],S.skin,hand,6);
        m.box(ax+(side?-.053:.031),.65,.005,.022,.048,.033,S.skin,hand,.94);
    }
    // Smaller head, cheek and jaw contours, separate ears, and a modeled nose.
    m.loft([[0,1.46,.015,.069,.072],[0,1.50,.007,.104,.101],[0,1.59,0,.123,.111],[0,1.68,-.006,.112,.105],[0,1.727,-.014,.074,.074]],S.skin,3,10);
    for(const side of [-1,1]){
        m.loft([[side*.12,1.54,0,.018,.023],[side*.126,1.58,0,.024,.026],[side*.118,1.62,-.003,.018,.02]],S.skin,3,6);
        const x=side*.047;
        m.box(x-.019,1.601,.107,.038,.018,.008,S.white,3,.86);
        m.box(x-.007,1.600,.116,.014,.019,.006,S.eye,3);
        m.box(x-.025,1.632,.103,.047,.011,.014,S.hair,3,.9);
    }
    m.tri([-.024,1.60,.111],[0,1.536,.168],[.024,1.60,.111],S.skin,3,1.04);
    m.tri([-.024,1.60,.111],[-.022,1.536,.119],[0,1.536,.168],S.skin,3,.93);
    m.tri([.024,1.60,.111],[0,1.536,.168],[.022,1.536,.119],S.skin,3,.98);
    m.box(-.026,1.516,.108,.052,.008,.009,S.belt,3,.9);
    // Hair is a fitted polygon cap. Longer styles have side and back locks.
    m.loft([[0,1.655,-.024,.124,.104],[0,1.713,-.022,.112,.102],[0,1.758,-.024,.076,.075],[0,1.773,-.027,.016,.02]],S.hair,3,10);
    m.box(-.108,1.626,-.106,.216,.077,.035,S.hair,3);
    if(longHair||curly){
        m.loft([[0,1.37,-.079,.116,.052],[0,1.51,-.071,.133,.063],[0,1.65,-.04,.131,.079]],S.hair,3,10,false);
        for(const side of [-1,1])m.loft([[side*.112,curly?1.35:1.40,-.027,.035,.055],[side*.132,1.48,-.019,curly?.053:.036,.060],[side*.13,1.63,-.022,.035,.059]],S.hair,3,curly?7:6);
    }
    if(cap){
        m.loft([[0,1.698,-.019,.13,.116],[0,1.75,-.023,.116,.109],[0,1.78,-.025,.076,.073]],uniform?S.pants:S.shirt,3,10);
        m.box(-.10,1.696,.06,.20,.024,.13,uniform?S.pants:S.shirt,3,.8);
        if(uniform)m.box(-.022,1.728,.103,.044,.03,.014,S.metal,3);
    }
    if(topHat){
        m.loft([[0,1.755,-.02,.21,.17],[0,1.79,-.02,.21,.17]],S.hair,3,16);
        m.loft([[0,1.79,-.02,.13,.11],[0,2.1,-.02,.145,.12]],S.hair,3,16);
        m.loft([[0,1.8,-.02,.133,.113],[0,1.87,-.02,.137,.116]],S.metal,3,16);
    }
    if(backpack){
        m.loft([[0,1.00,-.19,.145,.06],[0,1.13,-.205,.157,.085],[0,1.27,-.185,.125,.065]],S.bag,1,8);
        for(const side of [-1,1])m.box(side*.147-.017,1.01,.116,.034,.27,.02,S.bag,charTorsoRig,.8);
        m.box(-.09,1.04,-.294,.18,.1,.025,S.bag,1,.85);
    }
    if(uniform){m.box(-.13,1.214,.137,.071,.086,.018,S.metal,2);m.box(.07,1.14,.14,.09,.065,.012,S.pants,2,.8);}
    return m.finish();
}
export function getCharacterMesh(appearance={}){
    const flags={female:!!appearance.female,longHair:!!appearance.longHair,curly:appearance.hairstyle==='curly',cap:!!appearance.cap,topHat:!!appearance.topHat,backpack:appearance.backpack!==false,coat:!!appearance.coat,uniform:!!appearance.uniform};
    const key=Object.values(flags).map(Number).join('');
    if(!charMeshCache.has(key))charMeshCache.set(key,charBuildMesh(flags));
    return charMeshCache.get(key);
}
const charScratch=createCharacterPose();

/** Skin each cached vertex once, then append indexed triangles to the world's
 * existing dynamic batch. No additional program, texture or draw pass. */
export function drawCharacter(m,x,z,base,angle=0,phase=0,seated=false,skin='#bd9369',shirt='#707b4b',appearance={}){
    const mesh=getCharacterMesh(appearance),height=appearance.height||1,co=Math.cos(angle),si=Math.sin(angle);
    const mode=appearance.mode||(seated?'sit':phase?'move':'idle');
    const ground=appearance.ground&&(mode==='idle'||mode==='move')?((lx,lz)=>(appearance.ground(x+lx*si+lz*co,z-lx*co+lz*si)-base)/height-.015):null;
    const pose=sampleCharacterPose(mode,phase,{motion:appearance.motion,run:appearance.run,time:appearance.time,action:appearance.action,actionT:appearance.actionT,ground},charScratch),mat=pose.matrices,v=mesh.vertices,work=mesh.deformed;
    const palette=[skin,shirt,appearance.pants||'#626955',appearance.hair||'#453a30',appearance.shoes||'#3c3d36',appearance.trim||'#c9c7b4','#282c29','#e1dfca','#c7aa67','#45483c',appearance.bag||'#886d4b'].map(rgb);
    for(let id=0;id<mesh.bonesA.length;id++){
        const i=id*6,a=mesh.bonesA[id]*12,b=mesh.bonesB[id]*12,w=mesh.weights[id],q=1-w;
        for(let row=0;row<3;row++){
            const A=a+row*4,B=b+row*4;
            work[i+row]=(mat[A]*v[i]+mat[A+1]*v[i+1]+mat[A+2]*v[i+2]+mat[A+3])*q+(mat[B]*v[i]+mat[B+1]*v[i+1]+mat[B+2]*v[i+2]+mat[B+3])*w;
            work[i+3+row]=(mat[A]*v[i+3]+mat[A+1]*v[i+4]+mat[A+2]*v[i+5])*q+(mat[B]*v[i+3]+mat[B+1]*v[i+4]+mat[B+2]*v[i+5])*w;
        }
    }
    for(const id of mesh.indices){
        const i=id*6,px=work[i],py=work[i+1]*height,pz=work[i+2],nx=work[i+3],ny=work[i+4]/height,nz=work[i+5],color=palette[mesh.slots[id]],shade=mesh.shades[id];
        const gilded=appearance.gilded&&[CHAR_SLOT.shirt,CHAR_SLOT.pants,CHAR_SLOT.metal].includes(mesh.slots[id]);
        m.data.push(x+px*si+pz*co,base+py,z-px*co+pz*si,nx*si+nz*co,ny,-nx*co+nz*si,color[0]*shade,color[1]*shade,color[2]*shade,gilded?-1.4:-1,gilded?.4:-1);
    }
}
