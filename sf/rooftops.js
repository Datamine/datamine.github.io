import {rand,tint,pose} from './geometry.js';

export const COMMERCIAL_ROOF_STYLES=Object.freeze(['mechanical','cool-roof','copper-shed','northlights','gravel','solar','terrace','penthouse']);
const roofPalette=['#647982','#b3a68b','#aebbb6','#546168','#987360','#72978a','#9da4b2','#c5c0a5'];
function roofPaint(color,seed){
    const values=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255),gray=values[0]*.2126+values[1]*.7152+values[2]*.0722,saturation=.65+rand(seed,31,4)*.85,light=(rand(seed,19,8)-.5)*.08;
    return '#'+values.map(v=>Math.round(Math.max(0,Math.min(1,gray+(v-gray)*saturation+light))*255).toString(16).padStart(2,'0')).join('');
}
/** Stable building-specific choices; all details are baked into static meshes. */
export function commercialRoofPlan({x,z,w,d,seed=0,style=null}){
    const value=seed*97.13+x*3.7+z*.91,index=Math.floor(rand(value,17,83)*COMMERCIAL_ROOF_STYLES.length),name=style||COMMERCIAL_ROOF_STYLES[index];
    const colors={'cool-roof':'#c8cdc0','copper-shed':'#69988c',gravel:'#b3a68b',terrace:'#9b7960'};
    return {style:name,color:roofPaint(colors[name]||roofPalette[Math.floor(rand(value,9,41)*roofPalette.length)],value),trim:roofPaint('#b9bfb4',value+5),metal:roofPaint('#879c9e',value+11),accent:roofPaint('#648c7b',value+17),seed:value,w,d};
}

function roofFan(m,x,y,z,r,color){
    m.cylinder(x,y,z,r,.014,'#384b50',16);m.cylinder(x,y+.016,z,r*.18,.018,color,12);
    for(let i=0;i<5;i++){
        const a=i*Math.PI*.4,p=(r,b)=>[x+Math.cos(b)*r,y+.021,z+Math.sin(b)*r];
        m.quad(p(r*.24,a+.7),p(r*.79,a+.57),p(r*.72,a+.2),p(r*.16,a),color,{metal:.3});
    }
    for(let i=-3;i<=3;i++){const u=i*r/4,reach=Math.sqrt(r*r-u*u)*.92;m.rod([x-reach,y+.035,z+u],[x+reach,y+.035,z+u],.005,color,4);}
}
function roofHVAC(m,x,y,z,w,d,h,color){
    for(const u of [.06,w-.1])m.box(x+u,y,z+.04,.035,.05,Math.max(.08,d-.08),'#455958');
    m.box(x,y+.05,z,w,h,d,color,{metal:.22});m.box(x-.008,y+h+.05,z-.008,w+.016,.025,d+.016,tint(color,18),{metal:.3});
    for(let i=0;i<4;i++)m.box(x+.025,y+.08+i*h*.19,z-.009,w-.05,.012,.013,'#52686c');
    roofFan(m,x+w/2,y+h+.08,z+d/2,Math.min(w,d)*.32,tint(color,18));
}
function roofVent(m,x,y,z,r,h,color){
    m.cylinder(x,y,z,r,h,color,12,r,{metal:.3});m.cylinder(x,y+h,z,r*1.42,.035,tint(color,12),16,r*.55,{metal:.3});
}

/** x/z is the roof's local northwest corner, y its cornice top. Keeps every
 * fixture inside that rectangle, including narrow roofs on shallow lots. */
export function drawCommercialRoof(m,options){
    const {x,y,z,w,d,seed=0,parapets=true,surfaceColor=null}=options,plan=commercialRoofPlan(options),start=m.data.length;
    const margin=Math.min(.11,w*.07,d*.07),W=w-margin*2,D=d-margin*2,S=Math.min(1.2,Math.max(.35,Math.min(W/2.5,D/1.4))),deck=.035;
    const unit=(u,v,uw,vd,h=.22)=>({x:margin+W*u,z:margin+D*v,w:W*uw,d:D*vd,h:h*S});
    pose(m,x,y,z,0,()=>{
        const color=surfaceColor?roofPaint(surfaceColor,plan.seed):plan.color;
        m.box(0,0,0,w,.035,d,color,plan.style==='terrace'?'wood':plan.style==='gravel'?'dirt':'roof');
        if(parapets){for(const xx of [0,w-.035])m.box(xx,deck,0,.035,.14,d,plan.trim,'stone');for(const zz of [0,d-.035])m.box(.035,deck,zz,w-.07,.14,.035,plan.trim,'stone');}
        const hvac=(u,v,uw,vd,h=.22)=>{const q=unit(u,v,uw,vd,h);roofHVAC(m,q.x,deck,q.z,q.w,q.d,q.h,plan.metal);};
        const bulkhead=(u,v,uw,vd,h=.52)=>{
            const q=unit(u,v,uw,vd,h);m.box(q.x,deck,q.z,q.w,q.h,q.d,plan.trim,'stucco');m.box(q.x-.015,deck+q.h,q.z-.015,q.w+.03,.035,q.d+.03,plan.accent,{metal:.2});
            const doorW=q.w*.48;m.box(q.x+q.w*.2,deck+.025,q.z+q.d+.008,doorW,q.h*.77,.012,'#52676a');m.box(q.x+q.w*.59,deck+q.h*.4,q.z+q.d+.023,.012,.015,.008,'#c6bb8e');
        };
        const vent=(u,v)=>roofVent(m,margin+W*u,deck,margin+D*v,Math.min(.055*S,W*.045,D*.065),.19*S,plan.metal);
        if(plan.style==='mechanical'){
            hvac(.05,.16,.35,.43,.28);hvac(.54,.43,.37,.37,.24);
            const duct=unit(.31,.5,.32,.12,.12);m.box(duct.x,deck+.08*S,duct.z,duct.w,.1*S,duct.d,plan.metal,{metal:.3});
            vent(.8,.16);vent(.9,.23);
        }else if(plan.style==='cool-roof'){
            bulkhead(.06,.07,.32,.33,.6);hvac(.57,.55,.3,.32,.2);
            for(const u of [.56,.76,.9])vent(u,.15);
            const q=unit(.12,.62,.3,.22);m.box(q.x,deck,q.z,q.w,.018,q.d,'#aab9ad');
        }else if(plan.style==='copper-shed'){
            const q=unit(.07,.1,.62,.68,.45),ridge=q.z+q.d*.46;
            m.box(q.x,deck,q.z,q.w,.12*S,q.d,plan.trim,'stone');
            for(const side of [-1,1]){const zz=side<0?q.z:q.z+q.d,points=[[q.x,deck+.12*S,zz],[q.x+q.w,deck+.12*S,zz],[q.x+q.w,deck+q.h,ridge],[q.x,deck+q.h,ridge]];m.quad(...(side<0?points.reverse():points),side<0?plan.accent:tint(plan.accent,-13),'roof');}
            for(const xx of [q.x,q.x+q.w]){const points=[[xx,deck+.12*S,q.z],[xx,deck+.12*S,q.z+q.d],[xx,deck+q.h,ridge]];m.tri(...(xx===q.x?points:points.reverse()),plan.trim,'stucco');}
            for(let i=1;i<6;i++)for(const zz of [q.z,q.z+q.d])m.rod([q.x+q.w*i/6,deck+.125*S,zz],[q.x+q.w*i/6,deck+q.h+.005,ridge],.007,plan.metal,4);
            vent(.84,.25);vent(.84,.69);
        }else if(plan.style==='northlights'){
            const q=unit(.08,.1,.78,.7,.32),count=W>3.5?4:2,run=q.d/count;
            for(let i=0;i<count;i++){
                const zz=q.z+i*run,top=deck+q.h,shoulder=zz+run*.7;
                m.quad([q.x,top,shoulder],[q.x+q.w,top,shoulder],[q.x+q.w,deck,zz],[q.x,deck,zz],plan.accent,'roof');
                m.quad([q.x,deck,zz+run],[q.x+q.w,deck,zz+run],[q.x+q.w,top,shoulder],[q.x,top,shoulder],'#6c9298','glass');
                for(const xx of [q.x,q.x+q.w]){const points=[[xx,deck,zz],[xx,deck,zz+run],[xx,top,shoulder]];m.tri(...(xx===q.x?points:points.reverse()),plan.trim);}
                for(let j=0;j<=3;j++)m.rod([q.x+q.w*j/3,top+.006,shoulder],[q.x+q.w*j/3,deck+.006,zz+run],.009,plan.trim,4);
            }
            vent(.93,.55);
        }else if(plan.style==='gravel'){
            const q=unit(.08,.17,.27,.48,.13);m.box(q.x,deck,q.z,q.w,q.h,q.d,plan.trim,'stone');
            m.box(q.x+.018,deck+q.h,q.z+.018,q.w-.036,.025,q.d-.036,'#789c9b','glass');hvac(.55,.12,.29,.34,.2);
            for(const u of [.56,.74,.9])vent(u,.78);
            for(let i=0;i<8;i++){const u=margin+W*(.1+rand(seed,i,8)*.8),v=margin+D*(.05+rand(seed,i,9)*.07);m.box(u,deck,v,.025,.012,.02,tint(plan.color,i%2?12:-12),'stone');}
        }else if(plan.style==='solar'){
            const columns=W>3?3:2,rows=D>1.3?2:1,panelW=W*.63/columns,panelD=D*.54/rows;
            for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
                const xx=margin+W*.06+column*panelW,zz=margin+D*.08+row*panelD,width=panelW*.88,depth=panelD*.8,low=deck+.08*S,high=low+.15*S;
                for(const u of [xx+.02,xx+width-.02]){m.rod([u,deck,zz+depth],[u,high,zz+depth],.01,plan.metal,5);m.rod([u,deck,zz],[u,low,zz],.01,plan.metal,5);}
                m.quad([xx,low,zz],[xx,high,zz+depth],[xx+width,high,zz+depth],[xx+width,low,zz],'#365c78',{metal:.28});
                for(let j=1;j<4;j++){const u=xx+width*j/4;m.rod([u,low+.005,zz],[u,high+.005,zz+depth],.004,'#97b3bd',4);}
            }
            hvac(.76,.53,.2,.32,.2);vent(.83,.2);
        }else if(plan.style==='terrace'){
            bulkhead(.06,.07,.25,.27,.55);
            for(const v of [.67,.82]){const q=unit(.12,v,.64,.1,.13);m.box(q.x,deck,q.z,q.w,q.h,q.d,'#9b7760','wood');for(let i=0;i<4;i++)m.sphere(q.x+q.w*(i+.5)/4,deck+q.h+.045*S,q.z+q.d/2,Math.min(q.w/9,.1*S),.08*S,Math.min(q.d*.43,.07),'#6d935f',10,5);}
            const q=unit(.53,.25,.24,.22);m.box(q.x,deck+.23*S,q.z,q.w,.028,q.d,plan.trim,'wood');for(const u of [.1,.85])m.box(q.x+q.w*u,deck,q.z+q.d*.45,.018,.23*S,.018,plan.metal);
            vent(.9,.8);
        }else{
            bulkhead(.12,.14,.52,.6,.73);hvac(.73,.57,.21,.3,.2);
            const q=unit(.17,.22,.42,.42);m.box(q.x,deck+.75*S,q.z,q.w,.05,q.d,plan.accent,{metal:.25});vent(.87,.22);
        }
    });
    let top=y;for(let i=start;i<m.data.length;i+=11)top=Math.max(top,m.data[i+1]);
    return {...plan,height:top-y};
}
