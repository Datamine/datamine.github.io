import {Mesh,pose,tint,unit,cross,sub} from './geometry.js';

const labBrainCache=new Map();
/** Two original, folded cortical surfaces with a real central fissure. The
 * grooves deform the actual surface, and finite-difference normals preserve
 * the soft lobes without flattening the gyri into painted stripes. */
export function neuralBrainMesh(small=false,color='#cba0b0'){
    const key=small+color;if(labBrainCache.has(key))return labBrainCache.get(key);
    const m=new Mesh(),segments=small?16:32,rings=small?10:18;
    for(const side of [-1,1]){
        const surface=(theta,phi)=>{
            const s=Math.sin(theta),fold=Math.sin(phi*7+Math.sin(theta*4)*1.4+side*.4)+.45*Math.sin(theta*14+phi*3),ripple=(small?.012:.025)*fold*s;
            const x=side*.222+Math.cos(phi)*s*(.205+ripple);
            return [side<0?Math.min(-.012,x):Math.max(.012,x),Math.cos(theta)*(.25+ripple*.4),Math.sin(phi)*s*(.34+ripple)];
        };
        const normal=(theta,phi)=>{
            const e=.002,a=sub(surface(theta+e,phi),surface(theta-e,phi)),b=sub(surface(theta,phi+e),surface(theta,phi-e));
            let n=unit(cross(b,a)),p=surface(theta,phi);if(Math.hypot(...n)<.1)n=[0,Math.cos(theta)>=0?1:-1,0];if(n[0]*(p[0]-side*.222)+n[1]*p[1]+n[2]*p[2]<0)n=n.map(v=>-v);return n;
        };
        for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
            const uv=[[i/rings*Math.PI,j/segments*Math.PI*2],[(i+1)/rings*Math.PI,j/segments*Math.PI*2],[(i+1)/rings*Math.PI,(j+1)/segments*Math.PI*2],[i/rings*Math.PI,(j+1)/segments*Math.PI*2]],points=uv.map(p=>surface(...p));
            const shade=Math.round(7*Math.sin(j*.8+i*.6)),start=m.data.length;m.quad(...points,tint(color,shade));
            for(const [v,p] of [uv[0],uv[1],uv[2],uv[0],uv[2],uv[3]].entries()){const n=normal(...p);for(let k=0;k<3;k++)m.data[start+v*11+3+k]=n[k];}
        }
        // Fine conductive traces follow selected gyri rather than enclosing
        // the brain in an opaque sphere. Dark, recessed seams remain visible.
        if(!small)for(let row=0;row<3;row++){
            const theta=.55+row*.73;
            for(let j=0;j<24;j++){
                const a=surface(theta,j*Math.PI*2/24),b=surface(theta,(j+1)*Math.PI*2/24);
                a[1]+=.008;b[1]+=.008;m.rod(a,b,.005,row===1?'#c6c7c3':'#b08098',3);
            }
        }
    }
    // Cerebellum and a short, non-gory brainstem.
    m.sphere(0,-.24,-.15,.15,.10,.13,tint(color,-19),12,6);m.cylinder(0,-.38,-.11,.048,.15,tint(color,-12),10,.06);
    labBrainCache.set(key,m);return m;
}
function appendLabBrain(m,x,y,z,scale=1,angle=0,small=false,color){
    const data=neuralBrainMesh(small,color).data;
    pose(m,x,y,z,angle,()=>{for(let i=0;i<data.length;i+=11)m.data.push(data[i]*scale,data[i+1]*scale,data[i+2]*scale,...data.slice(i+3,i+11));});
}
function labArc(m,center,radius,axis,color,thickness=.012,start=0,end=Math.PI*2,material=null){
    const at=a=>axis===0?[center[0]+Math.cos(a)*radius,center[1]+Math.sin(a)*radius,center[2]]:axis===1?[center[0],center[1]+Math.sin(a)*radius,center[2]+Math.cos(a)*radius]:[center[0]+Math.cos(a)*radius,center[1],center[2]+Math.sin(a)*radius];
    const n=Math.ceil((end-start)*Math.max(4,radius*10)),sides=thickness<.007?3:thickness<.016?4:6;for(let i=0;i<n;i++)m.rod(at(start+(end-start)*i/n),at(start+(end-start)*(i+1)/n),thickness,color,sides,material);
}
const labRect=r=>[[r.x-r.w/2,r.z-r.d/2],[r.x+r.w/2,r.z-r.d/2],[r.x+r.w/2,r.z+r.d/2],[r.x-r.w/2,r.z+r.d/2]];
/** +Z is the doorway. All dimensions are plot-local and share one footprint
 * plan; the suspended apparatus never consumes the doorway or working aisle. */
export function neuralLabLayout({w,d}){
    return {core:{x:0,z:-d/2+.74,w:1.28,d:1.13},gpu:{x:-w/2+.45,z:-d/2+.46,w:.55,d:.5},desk:{x:-w/2+.50,z:-d/2+1.82,w:.66,d:.85},pods:[{x:w/2-.45,z:-d/2+.55,w:.57,d:.62},{x:w/2-.45,z:-d/2+1.78,w:.57,d:.62}]};
}
function drawLabPod(m,p,color,index){
    m.cylinder(p.x,.02,p.z,.29,.16,'#526b73',24,.29,{metal:.3});m.cylinder(p.x,.18,p.z,.24,.045,'#99b8b6',24,.24);
    m.cylinder(p.x,1.40,p.z,.27,.085,'#81999a',24,.24,{metal:.28});
    for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,x=p.x+Math.cos(a)*.235,z=p.z+Math.sin(a)*.235;m.rod([x,.21,z],[x,1.42,z],.012,'#9ab6b8',8);}
    for(const y of [.32,1.25])labArc(m,[p.x,y,p.z],.245,2,'#91c1c3',.009,0,Math.PI*2,{emissive:.18});
    appendLabBrain(m,p.x,.94,p.z,.44,index?.25:-.2,true,color);
    m.cylinder(p.x,.25,p.z,.075,.16,'#4d6971',16,.12);m.cylinder(p.x,.415,p.z,.09,.025,color,16,.09,{emissive:.2});
    // A pressure gauge, small isolation valves, and a braided return line.
    m.sphere(p.x-.17,1.45,p.z,.06,.04,.06,'#d1d7c8',12,6);m.rod([p.x-.17,1.48,p.z],[p.x-.14,1.48,p.z+.025],.005,'#536772',5);
    m.rod([p.x+.21,.2,p.z],[p.x+.31,.2,p.z],.017,'#91a5a1',8);m.rod([p.x+.31,.2,p.z],[p.x+.31,1.35,p.z],.014,'#5e7e85',8);
}
export function drawNeuralLabInterior(m,b,base){
    const plan=neuralLabLayout(b),{w,d}=b;b.neuralLab=plan;
    b.interiorObstacles=[plan.core,plan.gpu,plan.desk,...plan.pods].map(r=>labRect(r).map(([x,z])=>[b.x+w/2+x,b.y+d/2+z]));
    pose(m,b.x+w/2,base,b.y+d/2,0,()=>{
        m.box(-w/2+.12,-.01,-d/2+.12,w-.24,.035,d-.24,'#788e91','concrete');
        // Ceramic cable channels and restrained floor illumination.
        for(const side of [-1,1]){
            const x=side*(w/2-.13);m.box(x-.015,.027,-d/2+.15,.03,.012,d-.32,'#97b1b1');
            m.box(x-.006,.042,-d/2+.27,.012,.005,d-.6,'#8cb4b7',{emissive:.12});
        }
        const c=plan.core;
        m.cylinder(c.x,.025,c.z,.56,.15,'#3f5e6a',32,.56,{metal:.25});m.cylinder(c.x,.175,c.z,.49,.06,'#a9bab8',32,.49);
        m.cylinder(c.x,.235,c.z,.42,.10,'#566f79',32,.36);m.cylinder(c.x,.335,c.z,.34,.025,'#90b6bd',32,.34,{emissive:.18});
        for(const a of [0,Math.PI]){
            const x=c.x+Math.cos(a)*.59,z=c.z+.10;m.box(x-.035,.12,z-.035,.07,2.11,.07,'#758e96',{metal:.25});
            m.sphere(x,2.26,z,.10,.09,.10,'#adbfc1',16,8,{metal:.2});m.rod([x,2.27,z],[c.x,2.42,c.z],.025,'#819fa6',10);
        }
        labArc(m,[c.x,1.65,c.z],.65,0,'#87a8b5',.024,0,Math.PI*2,{metal:.3});
        labArc(m,[c.x,1.65,c.z],.53,1,'#a597b2',.018,0,Math.PI*2,{metal:.22});
        labArc(m,[c.x,1.08,c.z],.47,2,'#77acba',.013,0,Math.PI*2,{emissive:.20});
        for(const side of [-1,1])m.rod([c.x+side*.22,.36,c.z],[c.x+side*.22,1.23,c.z],.008,'#6d9fae',6,{emissive:.12});
        const gpu=plan.gpu;
        m.box(gpu.x-.275,.03,gpu.z-.25,.55,1.83,.5,'#354e5d',{metal:.18});
        for(let row=0;row<7;row++){
            const y=.16+row*.22;m.box(gpu.x-.24,y,gpu.z+.258,.48,.16,.016,'#576f80');
            for(let j=0;j<5;j++)m.box(gpu.x-.2+j*.08,y+.045,gpu.z+.28,.045,.025,.012,'#293f4d');
            m.sphere(gpu.x+.19,y+.12,gpu.z+.282,.01,.01,.008,row%3?'#82b4b7':'#c5ad79',8,4,{emissive:.22});
        }
        const desk=plan.desk;
        for(const dx of [-.27,.27])for(const dz of [-.33,.33])m.box(desk.x+dx-.018,.02,desk.z+dz-.018,.036,.72,.036,'#6d8691',{metal:.2});
        m.box(desk.x-.33,.74,desk.z-.425,.66,.06,.85,'#aebcb4','concrete');
        m.box(desk.x-.27,.85,desk.z-.28,.06,.42,.58,'#344c5a');
        m.box(desk.x-.203,.88,desk.z-.24,.012,.34,.5,'#658d99',{emissive:.16});
        m.box(desk.x-.09,.805,desk.z-.28,.24,.025,.47,'#577381');
        for(let row=0;row<5;row++)for(let col=0;col<3;col++)m.box(desk.x-.065+col*.065,.832,desk.z-.25+row*.08,.042,.006,.045,'#a1b2ad');
        // A tiny electrode cap, with wires terminating at the console.
        m.sphere(desk.x+.11,.91,desk.z+.27,.12,.10,.12,'#a8a0b1',12,6);for(let i=0;i<4;i++){const x=desk.x+.02+i*.055;m.rod([x,.98,desk.z+.27],[desk.x-.08,.83,desk.z+.08],.005,'#728b9c',5);}
        plan.pods.forEach((p,i)=>drawLabPod(m,p,i?'#aab795':'#a5a1c3',i));
        // Wall-sized connectome: branching pathways and synapses, not a blank
        // office whiteboard. It stays behind the apparatus and below the roof.
        const z=-d/2+.13;m.box(.33,.65,z,Math.max(.6,w/2-.53),1.18,.025,'#344e60');
        const nodes=[[.49,.82],[.69,1.30],[.95,.95],[1.17,1.49],[1.35,1.05],[.66,1.62],[1.35,1.74]].filter(p=>p[0]<w/2-.22);
        for(let i=0;i<nodes.length;i++)for(let j=i+1;j<Math.min(nodes.length,i+3);j++)m.rod([nodes[i][0],nodes[i][1],z+.04],[nodes[j][0],nodes[j][1],z+.04],.006,'#7b9cad',5,{emissive:.10});
        for(const [x,y] of nodes)m.sphere(x,y,z+.05,.025,.025,.015,'#adbec8',10,5,{emissive:.16});
    });
    return plan;
}

/** Only appended while inside this lab. Heavy cortical geometry is cached;
 * the pulse, particles and bobbing brain share the ordinary dynamic draw batch. */
export function drawNeuralLabAnimation(m,b,base,time,{reduced=false}={}){
    if(b.id!=='ai-lab')return;const p=b.neuralLab||neuralLabLayout(b),t=reduced?0:time*.001,c=p.core;
    pose(m,b.x+b.w/2,base,b.y+b.d/2,b.rotation||0,()=>{
        appendLabBrain(m,c.x,1.67+Math.sin(t*.8)*.025,c.z,1,.10*Math.sin(t*.37));
        const pulse=.18+.08*(.5+.5*Math.sin(t*1.3));
        for(let i=0;i<5;i++){
            const a=t*.35+i*Math.PI*2/5,x=c.x+Math.cos(a)*.58,y=1.65+Math.sin(a)*.58,z=c.z;
            m.sphere(x,y,z,.025,.025,.025,i%2?'#c7b1ce':'#9bc3d0',10,5,{emissive:pulse});
        }
        for(let i=0;i<4;i++){
            const a=t*.48+i*Math.PI/2;m.sphere(c.x,1.65+Math.sin(a)*.49,c.z+Math.cos(a)*.49,.02,.02,.02,'#b0c8d0',8,4,{emissive:.25});
        }
        // Traveling activity along four electrode feeds.
        for(let i=0;i<4;i++){
            const f=(t*.22+i*.25)%1,x=c.x+(i%2?1:-1)*.22,y=.4+f*.83;
            m.sphere(x,y,c.z,.013,.045,.013,'#9dbacb',8,4,{emissive:.25});
        }
        const desk=p.desk;
        for(let i=0;i<27;i++){
            const at=j=>{const z=desk.z-.22+j*.0175,phase=j*.72-t*1.65,spike=Math.exp(-(((Math.sin(phase*.23))/.22)**2)),y=1.03+Math.sin(phase)*(.018+.07*spike);return [desk.x-.186,y,z];};
            m.rod(at(i),at(i+1),.004,'#b5d0c1',5,{emissive:.26});
        }
        for(const [i,pod] of p.pods.entries()){
            const a=t*.6+i;labArc(m,[pod.x,.5+((t*.08+i*.45)%1)*.65,pod.z],.20,2,i?'#c8b7d3':'#a6c7b1',.005,0,Math.PI*2,{emissive:.16});
        }
    });
}
