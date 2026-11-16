import {pose,unit,cross,sub} from './geometry.js';

// Alcatraz is centered at reference (42, 2.5); share its east/west latitude.
const prometheusX=96,prometheusZ=3.75;
export const PROMETHEUS=Object.freeze({x:prometheusX,z:prometheusZ,rotation:Math.PI/2,figureBase:4.75,torch:{x:prometheusX-.12,y:13.23,z:prometheusZ-1.25}});
const prometheusBronze='#679b87',prometheusShade='#527f73',prometheusMetal={metal:.32};

const prometheusCurve=(a,b,c,d,t)=>b.map((v,i)=>.5*(2*v+(-a[i]+c[i])*t+(2*a[i]-5*v+4*c[i]-d[i])*t*t+(-a[i]+3*v-3*c[i]+d[i])*t*t*t));
function prometheusSamples(points,steps){
    const result=[];for(let i=0;i<points.length-1;i++)for(let j=0;j<steps;j++)result.push(prometheusCurve(points[Math.max(0,i-1)],points[i],points[i+1],points[Math.min(points.length-1,i+2)],j/steps));
    result.push(points.at(-1));return result;
}
/** Shared vertex normals follow the actual curved surface, including the
 * folds and shifting centerline, so no horizontal lighting seams remain. */
function prometheusSurface(m,rows,sides,point,color,material){
    const vertices=Array.from({length:rows},(_,j)=>Array.from({length:sides},(_,i)=>point(j,i*Math.PI*2/sides)));
    const normals=vertices.map((row,j)=>row.map((p,i)=>unit(cross(sub(vertices[Math.min(rows-1,j+1)][i],vertices[Math.max(0,j-1)][i]),sub(row[(i+1)%sides],row[(i+sides-1)%sides])))));
    for(let j=1;j<rows;j++)for(let i=0;i<sides;i++){
        const n=(i+1)%sides,start=m.data.length,indices=[[j-1,n],[j-1,i],[j,i],[j-1,n],[j,i],[j,n]];
        m.quad(vertices[j-1][n],vertices[j-1][i],vertices[j][i],vertices[j][n],color,material);
        for(const [v,[row,col]] of indices.entries())for(let k=0;k<3;k++)m.data[start+v*11+3+k]=normals[row][col][k];
    }
}
function prometheusLoft(m,rings,color,flutes=0,material=prometheusMetal,sides=48,steps=3){
    const samples=prometheusSamples(rings.map(r=>[r[0],r[1],r[2],r[3]||0,r[4]||0]),steps);
    prometheusSurface(m,samples.length,sides,(j,a)=>{
        const r=samples[j],fold=flutes?1+Math.cos(a*flutes+r[0]*.5)*.065:1;
        return [r[3]+Math.cos(a)*Math.max(.001,r[1])*fold,r[0],r[4]+Math.sin(a)*Math.max(.001,r[2])*fold];
    },color,material);
}
/** Curved, tapered limbs and locks, rather than constant-width cylinders. */
function prometheusTube(m,points,color,sides=24,steps=3,material=prometheusMetal){
    const samples=prometheusSamples(points,steps),frames=samples.map((p,j)=>{
        const axis=unit(sub(samples[Math.min(samples.length-1,j+1)].slice(0,3),samples[Math.max(0,j-1)].slice(0,3))),u=unit(cross(axis,Math.abs(axis[2])<.85?[0,0,1]:[1,0,0]));return [u,cross(u,axis)];
    });
    prometheusSurface(m,samples.length,sides,(j,a)=>samples[j].slice(0,3).map((v,k)=>v+Math.max(.002,samples[j][3])*(frames[j][0][k]*Math.cos(a)+frames[j][1][k]*Math.sin(a))),color,material);
}

export function drawPrometheus(m,signs){
    const site=PROMETHEUS,start=m.data.length;
    pose(m,site.x,0,site.z,site.rotation,()=>{
        // A low breakwater and four levels of granite make the harbor plinth.
        m.cylinder(0,-.3,0,3.05,.42,'#8b9d91',64,2.85,'stone');
        m.cylinder(0,.12,0,2.8,.18,'#c2c7b4',64,2.7,'stone');
        for(const [r,y,h,top] of [[2.2,.3,.18,2.2],[2,.48,.18,2],[1.8,.66,.22,1.8],[1.58,.88,.22,1.58],[1.4,1.1,.2,1.4],[1.27,1.3,2.75,1.19]])m.cylinder(0,y,0,r,h,'#aeb9aa',8,top,'stone');
        for(const y of [1.35,3.55,4.05])m.cylinder(0,y,0,1.34,.14,'#d2cdb4',8,1.34,'stone');
        m.cylinder(0,4.19,0,1.45,.22,'#a0b0a1',8,1.45,'stone');m.cylinder(0,4.41,0,1.3,.2,'#c6c7b0',8,1.2,'stone');m.cylinder(0,4.61,0,1.2,.14,'#a7b3a3',12,1.2,'stone');
        // Shallow stone joints and bronze acanthus leaves catch the light
        // without enlarging the island or adding another texture.
        for(let side=0;side<8;side++)pose(m,0,0,0,side*Math.PI/4,()=>{
            for(const y of [1.87,2.48,3.09])m.box(-.43,y,1.184,.86,.014,.018,'#909f93','stone');
            for(const hand of [-1,1])prometheusTube(m,[[hand*.07,3.79,1.29,.013],[hand*.23,3.87,1.34,.036],[hand*.32,4.0,1.29,.012]],'#929a78',10,2);
        });
        m.box(-.9,2.02,1.255,1.8,.9,.06,'#7c8264',{metal:.35});
        const uv=signs.get('PROMETHEUS');if(uv)m.quad([-.85,2.45,1.325],[.85,2.45,1.325],[.85,2.85,1.325],[-.85,2.85,1.325],'#ffffff',uv);
        const motto=signs.get('Fire is for everyone.');if(motto)m.quad([-.8,2.08,1.325],[.8,2.08,1.325],[.8,2.29,1.325],[-.8,2.29,1.325],'#ffffff',motto);
        pose(m,0,site.figureBase,0,0,()=>{
            // Contrapposto: one foot advances while the other bears the weight.
            for(const [x,z,y] of [[-.29,.22,0],[.3,-.08,.08]]){
                m.sphere(x,y+.1,z+.13,.19,.12,.36,prometheusShade,24,10,prometheusMetal);
                prometheusTube(m,[[x,y+.16,z,.135],[x*.97,.7,z-.025,.2],[x*.9,1.3,z-.06,.155],[x*.9,1.7,z-.06,.18]],prometheusBronze);
                prometheusTube(m,[[x*.9,1.7,z-.06,.18],[x*.84,2.25,z-.03,.285],[x*.75,3.25,0,.27]],prometheusBronze);
                for(let toe=0;toe<4;toe++)m.sphere(x-.11+toe*.068,y+.105,z+.39,.043,.065,.085,prometheusBronze,12,6,prometheusMetal);
            }
            // A folded chiton falls diagonally, leaving the chest and shoulders clear.
            prometheusLoft(m,[[.75,.57,.5,-.06,.03],[1.1,.66,.5,-.04,0],[1.65,.62,.47,0,0],[2.3,.58,.43,.04,0],[2.95,.53,.37,.06,0],[3.45,.47,.31,.03,0],[3.7,.39,.26]],prometheusShade,18);
            prometheusLoft(m,[[3.2,.44,.28],[3.7,.4,.26,.02,0],[4.1,.43,.29,.025,-.015],[4.6,.56,.33,0,-.015],[5.1,.67,.34,-.025,0],[5.45,.64,.3,-.035,0],[5.65,.43,.24,-.02,0],[5.83,.2,.18]],prometheusBronze);
            for(const side of [-1,1]){
                m.sphere(side*.27,5.05,.29,.29,.15,.075,'#72a58d',32,16,prometheusMetal);
                for(let rib=0;rib<3;rib++)prometheusTube(m,[[side*.07,4.7-rib*.19,.3,.016],[side*.23,4.68-rib*.19,.32,.025],[side*.39,4.73-rib*.19,.245,.008]],prometheusBronze,12,2);
            }
            m.rod([-.46,5.45,-.12],[.36,3.65,.3],.09,prometheusShade,20,prometheusMetal);
            for(let i=0;i<6;i++)m.rod([-.49+i*.035,5.45,.05],[.31+i*.03,3.65,.29],.015,'#81ac94',6,prometheusMetal);
            m.cylinder(0,3.65,0,.43,.12,'#b09e6a',40,.43,{metal:.5});
            // Extended right arm, carefully articulated wrist and torch-bearing hand.
            const shoulder=[-.6,5.38,0],elbow=[-1.02,6.42,.02],hand=[-1.25,7.28,.12];
            m.sphere(...shoulder,.27,.31,.28,prometheusBronze,28,14,prometheusMetal);
            prometheusTube(m,[[...shoulder,.23],[-.83,5.82,.015,.265],[-.96,6.18,.02,.2],[...elbow,.18]],prometheusBronze,28);m.sphere(...elbow,.19,.23,.2,prometheusBronze,28,14,prometheusMetal);
            prometheusTube(m,[[...elbow,.18],[-1.12,6.7,.04,.195],[-1.22,7.07,.09,.125],[...hand,.105]],prometheusBronze,28);
            m.sphere(...hand,.19,.23,.17,'#74a78f',24,12,prometheusMetal);
            for(let i=0;i<4;i++)prometheusTube(m,[[-1.4,7.29+i*.075,.14,.034],[-1.31,7.3+i*.075,.23,.038],[-1.19,7.31+i*.075,.22,.033],[-1.17,7.3+i*.075,.16,.018]],prometheusShade,10,2);
            prometheusTube(m,[[-1.09,7.24,.14,.045],[-1.11,7.39,.22,.04],[-1.21,7.43,.24,.021]],prometheusBronze,12,2);
            const leftShoulder=[.6,5.35,0],leftElbow=[.96,4.55,.1],leftHand=[.58,4.05,.35];
            m.sphere(...leftShoulder,.27,.3,.27,prometheusBronze,28,14,prometheusMetal);
            prometheusTube(m,[[...leftShoulder,.23],[.84,5.08,.045,.245],[...leftElbow,.17]],prometheusBronze,28);m.sphere(...leftElbow,.19,.21,.19,prometheusBronze,28,14,prometheusMetal);
            prometheusTube(m,[[...leftElbow,.17],[.85,4.3,.23,.185],[...leftHand,.105]],prometheusBronze,28);m.sphere(...leftHand,.17,.21,.16,prometheusBronze,28,14,prometheusMetal);
            for(let finger=0;finger<4;finger++)prometheusTube(m,[[.48+finger*.055,4.05,.44,.028],[.5+finger*.055,3.91,.47,.033],[.55+finger*.05,3.9,.4,.018]],prometheusBronze,10,2);
            // Broken bronze shackles remain in his lowered hand.
            for(let link=0;link<7;link++)for(let i=0;i<16;i++){
                if(link===6&&i>10)continue;const a=i*Math.PI/8,b=(i+1)*Math.PI/8,y=4.04-link*.14,at=t=>link%2?[.6+Math.cos(t)*.085,y+Math.sin(t)*.13,.42]:[.6,y+Math.sin(t)*.13,.42+Math.cos(t)*.085];m.rod(at(a),at(b),.023,'#a39062',8,{metal:.5});
            }
            m.cylinder(0,5.45,0,.19,.42,prometheusBronze,28);
            prometheusLoft(m,[[5.72,.12,.15,0,.06],[5.82,.24,.22,0,.045],[6,.31,.28,0,.025],[6.2,.34,.3,0,.02],[6.4,.28,.26,0,0],[6.55,.12,.12,0,-.015],[6.57,.005,.005]],'#76a48b',0,prometheusMetal,56,3);
            // Brow, cheek planes, nose, lips and a curled beard give the face a gaze.
            for(const side of [-1,1]){
                m.rod([side*.05,6.25,.29],[side*.25,6.24,.26],.045,prometheusShade,12,prometheusMetal);
                m.sphere(side*.135,6.18,.296,.057,.028,.025,'#375f58',16,8,prometheusMetal);
                m.sphere(side*.23,6.03,.22,.11,.1,.09,prometheusBronze,20,10,prometheusMetal);
                m.sphere(side*.325,6.12,.015,.045,.1,.067,prometheusBronze,20,12,prometheusMetal);
                prometheusTube(m,[[side*.04,6.22,.311,.016],[side*.13,6.235,.32,.021],[side*.22,6.205,.283,.01]],'#81ad92',12,2);
            }
            m.tri([-.07,6.25,.29],[.07,6.25,.29],[0,6.02,.47],'#88b297',prometheusMetal);m.tri([-.07,6.25,.29],[0,6.02,.47],[-.075,5.99,.32],prometheusBronze,prometheusMetal);m.tri([.07,6.25,.29],[.075,5.99,.32],[0,6.02,.47],prometheusShade,prometheusMetal);
            m.rod([-.11,5.94,.3],[.11,5.94,.3],.025,prometheusShade,12,prometheusMetal);
            for(let i=0;i<16;i++){
                const a=i*Math.PI/8,x=Math.cos(a),z=Math.sin(a);
                prometheusTube(m,[[x*.12,6.52,z*.1,.035],[x*.26,6.49,z*.23,.07],[x*.335,6.32,z*.29,.066],[x*.32,6.18,z*.25,.025]],prometheusShade,12,3);
            }
            prometheusLoft(m,[[5.65,.025,.025,0,.27],[5.73,.14,.075,0,.27],[5.83,.22,.085,0,.27],[5.91,.245,.045,0,.29]],prometheusShade,9,prometheusMetal,40,3);
            m.cylinder(-1.25,7.15,.12,.055,1.05,'#bca36a',24,.07,{metal:.55});m.cylinder(-1.25,8.2,.12,.11,.2,'#a28b54',32,.35,{metal:.6});m.cylinder(-1.25,8.4,.12,.36,.09,'#d5bc78',40,.34,{metal:.6});
            for(const y of [7.74,7.84,8.12])m.cylinder(-1.25,y,.12,.08,.035,'#d6c28b',32,.08,{metal:.55});
            for(let i=0;i<10;i++){
                const a=i*Math.PI/5,dx=Math.cos(a),dz=Math.sin(a);
                prometheusTube(m,[[-1.25+dx*.12,8.22,.12+dz*.12,.013],[-1.25+dx*.27,8.31,.12+dz*.27,.021],[-1.25+dx*.355,8.43,.12+dz*.355,.012]],'#e1c98b',10,2,{metal:.55});
            }
        });
    });
    return {id:'prometheus',kind:'monument',label:'Prometheus',navigationAccess:'observe-only',entry:{x:site.x-4,y:site.z-.5},description:'Prometheus lifts an eternal flame over the bay. The fire is for everyone; the birds have interpreted this as including the pedestal.',start,count:m.data.length-start,lo:[site.x-3.1,-.3,site.z-3.1],hi:[site.x+3.1,14.9,site.z+3.1]};
}

export function drawPrometheusFlame(m,time,reduced=false){
    const p=PROMETHEUS.torch,t=reduced?0:time*.001;
    pose(m,p.x,p.y,p.z,0,()=>{
        for(let tongue=0;tongue<3;tongue++){
            const a=tongue*Math.PI*2/3,height=1.1+Math.sin(t*3.1+tongue)*.17,rings=[];
            for(let i=0;i<=10;i++){const f=i/10,r=.13*Math.sin(Math.PI*f)**.7+.015,lean=Math.sin(t*2.4+tongue+f*2)*f*.23;rings.push([f*height,r,r,Math.cos(a)*(.12+lean),Math.sin(a)*(.12+lean)]);}
            prometheusLoft(m,rings,tongue===0?'#ffdf7c':tongue===1?'#fcb349':'#f5cb5d',0,{emissive:.95},20,1);
        }
        m.sphere(0,.18,0,.16,.25,.16,'#fff0bd',24,14,{emissive:1});
    });
}

export function prometheusTorchLight(){return {...PROMETHEUS.torch,y:PROMETHEUS.torch.y+.45,radius:1.65,strength:.4,poolStrength:0,color:[1,.58,.18]};}
