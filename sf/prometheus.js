import {pose,unit} from './geometry.js';

export const PROMETHEUS=Object.freeze({x:96,z:15.5,rotation:Math.PI/2,figureBase:4.75,torch:{x:95.88,y:13.23,z:14.25}});
const prometheusBronze='#679b87',prometheusShade='#527f73',prometheusMetal={metal:.32};

/** Continuous elliptical sections make a sculpted silhouette rather than a
 * scaled-up citizen. Drapery uses a separate fluted surface over the figure. */
function prometheusLoft(m,rings,color,flutes=0,material=prometheusMetal,sides=40){
    const point=(r,i)=>{const a=i*Math.PI*2/sides,fold=flutes?1+Math.cos(a*flutes)*.045:1;return [(r[3]||0)+Math.cos(a)*r[1]*fold,r[0],(r[4]||0)+Math.sin(a)*r[2]*fold];};
    for(let j=1;j<rings.length;j++)for(let i=0;i<sides;i++){
        const a=rings[j-1],b=rings[j],start=m.data.length;m.quad(point(a,i),point(a,i+1),point(b,i+1),point(b,i),color,material);
        for(const [v,[ring,index]] of [[a,i],[a,i+1],[b,i+1],[a,i],[b,i+1],[b,i]].entries()){
            const angle=index*Math.PI*2/sides,slope=(a[1]-b[1])/Math.max(.01,b[0]-a[0]),n=unit([Math.cos(angle)/Math.max(.1,ring[1]),slope,Math.sin(angle)/Math.max(.1,ring[2])]);
            for(let k=0;k<3;k++)m.data[start+v*11+3+k]=n[k];
        }
    }
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
        m.box(-.9,2.02,1.255,1.8,.9,.06,'#7c8264',{metal:.35});
        const uv=signs.get('PROMETHEUS');if(uv)m.quad([-.85,2.45,1.325],[.85,2.45,1.325],[.85,2.85,1.325],[-.85,2.85,1.325],'#ffffff',uv);
        const motto=signs.get('Fire is for everyone.');if(motto)m.quad([-.8,2.08,1.325],[.8,2.08,1.325],[.8,2.29,1.325],[-.8,2.29,1.325],'#ffffff',motto);
        pose(m,0,site.figureBase,0,0,()=>{
            // Contrapposto: one foot advances while the other bears the weight.
            for(const [x,z,y] of [[-.29,.22,0],[.3,-.08,.08]]){
                m.sphere(x,y+.1,z+.13,.19,.12,.36,prometheusShade,24,10,prometheusMetal);
                m.rod([x,y+.15,z],[x*.9,1.7,z-.06],.19,prometheusBronze,24,prometheusMetal);
                m.rod([x*.9,1.7,z-.06],[x*.75,3.25,0],.27,prometheusBronze,24,prometheusMetal);
            }
            // A folded chiton falls diagonally, leaving the chest and shoulders clear.
            prometheusLoft(m,[[.75,.57,.34],[1.1,.66,.37],[1.65,.62,.36],[2.3,.58,.34],[2.95,.53,.33],[3.45,.47,.29],[3.7,.39,.26]],prometheusShade,14);
            prometheusLoft(m,[[3.2,.44,.28],[3.7,.4,.26],[4.1,.43,.29],[4.6,.56,.33],[5.1,.67,.34],[5.45,.64,.3],[5.65,.5,.25]],prometheusBronze);
            for(const side of [-1,1])m.sphere(side*.27,5.05,.29,.29,.15,.075,'#72a58d',24,12,prometheusMetal);
            m.rod([-.46,5.45,-.12],[.36,3.65,.3],.09,prometheusShade,20,prometheusMetal);
            for(let i=0;i<6;i++)m.rod([-.49+i*.035,5.45,.05],[.31+i*.03,3.65,.29],.015,'#81ac94',6,prometheusMetal);
            m.cylinder(0,3.65,0,.43,.12,'#b09e6a',40,.43,{metal:.5});
            // Extended right arm, carefully articulated wrist and torch-bearing hand.
            const shoulder=[-.6,5.38,0],elbow=[-1.02,6.42,.02],hand=[-1.25,7.28,.12];
            m.sphere(...shoulder,.27,.31,.28,prometheusBronze,28,14,prometheusMetal);
            m.rod(shoulder,elbow,.21,prometheusBronze,28,prometheusMetal);m.sphere(...elbow,.19,.23,.2,prometheusBronze,24,12,prometheusMetal);m.rod(elbow,hand,.155,prometheusBronze,24,prometheusMetal);
            m.sphere(...hand,.19,.23,.17,'#74a78f',24,12,prometheusMetal);
            for(let i=0;i<4;i++)m.rod([-1.4,7.34+i*.07,.17],[-1.17,7.38+i*.07,.23],.032,prometheusShade,10,prometheusMetal);
            const leftShoulder=[.6,5.35,0],leftElbow=[.96,4.55,.1],leftHand=[.58,4.05,.35];
            m.sphere(...leftShoulder,.27,.3,.27,prometheusBronze,28,14,prometheusMetal);m.rod(leftShoulder,leftElbow,.2,prometheusBronze,24,prometheusMetal);m.sphere(...leftElbow,.19,.21,.19,prometheusBronze,24,12,prometheusMetal);m.rod(leftElbow,leftHand,.15,prometheusBronze,24,prometheusMetal);m.sphere(...leftHand,.17,.21,.16,prometheusBronze,24,12,prometheusMetal);
            // Broken bronze shackles remain in his lowered hand.
            for(let link=0;link<7;link++)for(let i=0;i<16;i++){
                if(link===6&&i>10)continue;const a=i*Math.PI/8,b=(i+1)*Math.PI/8,y=4.04-link*.14,at=t=>link%2?[.6+Math.cos(t)*.085,y+Math.sin(t)*.13,.42]:[.6,y+Math.sin(t)*.13,.42+Math.cos(t)*.085];m.rod(at(a),at(b),.023,'#a39062',8,{metal:.5});
            }
            m.cylinder(0,5.45,0,.19,.42,prometheusBronze,28);
            m.sphere(0,6.12,.02,.34,.46,.3,'#76a48b',40,22,prometheusMetal);
            // Brow, cheek planes, nose, lips and a curled beard give the face a gaze.
            for(const side of [-1,1]){
                m.rod([side*.05,6.25,.29],[side*.25,6.24,.26],.045,prometheusShade,12,prometheusMetal);
                m.sphere(side*.135,6.18,.296,.057,.028,.025,'#375f58',16,8,prometheusMetal);
                m.sphere(side*.23,6.03,.22,.11,.1,.09,prometheusBronze,20,10,prometheusMetal);
            }
            m.tri([-.07,6.25,.29],[.07,6.25,.29],[0,6.02,.47],'#88b297',prometheusMetal);m.tri([-.07,6.25,.29],[0,6.02,.47],[-.075,5.99,.32],prometheusBronze,prometheusMetal);m.tri([.07,6.25,.29],[.075,5.99,.32],[0,6.02,.47],prometheusShade,prometheusMetal);
            m.rod([-.11,5.94,.3],[.11,5.94,.3],.025,prometheusShade,12,prometheusMetal);
            for(let i=0;i<18;i++){const a=i*Math.PI/9;m.sphere(Math.cos(a)*.3,6.37+Math.sin(a)*.12,-.015+Math.sin(a)*.19,.09,.105,.085,prometheusShade,14,8,prometheusMetal);}
            for(let row=0;row<3;row++)for(let i=0;i<7-row;i++){const xx=(i-(6-row)/2)*.075;m.sphere(xx,5.92-row*.09,.24+row*.015,.065,.11,.065,prometheusShade,14,8,prometheusMetal);}
            m.cylinder(-1.25,7.15,.12,.055,1.05,'#bca36a',24,.07,{metal:.55});m.cylinder(-1.25,8.2,.12,.11,.2,'#a28b54',32,.35,{metal:.6});m.cylinder(-1.25,8.4,.12,.36,.09,'#d5bc78',40,.34,{metal:.6});
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
            prometheusLoft(m,rings,tongue===0?'#ffdf7c':tongue===1?'#fcb349':'#f5cb5d',0,{emissive:.95},20);
        }
        m.sphere(0,.18,0,.16,.25,.16,'#fff0bd',24,14,{emissive:1});
    });
}

export function prometheusTorchLight(){return {...PROMETHEUS.torch,y:PROMETHEUS.torch.y+.45,radius:1.65,strength:.4,poolStrength:0,color:[1,.58,.18]};}
