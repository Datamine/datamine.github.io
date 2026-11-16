import {pose} from './geometry.js';
import {windowAppearance} from './materials.js';
import {drawPlaque} from './southern-district.js';
import {drawSquareStreetLife} from './times-square-life.js';
import {TIMES_SQUARE,TIMES_SQUARE_BUILDINGS} from './southern-layout.js';
import {drawCommercialRoof} from './rooftops.js';

export const TIMES_SQUARE_EXAMINE="Hillsborough has been replaced with Times Square. Don't like it? Anything is possible in Loeberland.";
export const TIMES_SQUARE_SIGNS=Object.freeze(['TIMES SQUARE','LOEBERLAND','ANYTHING IS POSSIBLE','BROADWAY','BIG IDEAS']);

/** The LED faces share the sign atlas. RGB above one is the renderer's
 * emissive-atlas marker: artwork stays luminous without adding any lights. */
function squareScreen(m,signs,{x,y,z,w,h,art,angle=0,curve=0}){
    // Move the entire assembly along the facade's outward normal. Windows and
    // their projecting trim must sit behind both flat and bowed screen faces.
    const standoff=.14;
    pose(m,x-Math.sin(angle)*standoff,y,z+Math.cos(angle)*standoff,angle,()=>{
        m.box(-w/2-.055,-.055,-.11,w+.11,h+.11,.11,'#16232c',{metal:.3});
        const uv=signs.get(art),segments=curve?12:1;
        for(let i=0;i<segments;i++){
            const u=i/segments,v=(i+1)/segments,ax=(u-.5)*w,bx=(v-.5)*w,az=Math.cos((u-.5)*Math.PI)*curve,bz=Math.cos((v-.5)*Math.PI)*curve;
            const texture=uv&&[[uv[0][0]+(uv[1][0]-uv[0][0])*u,uv[0][1]],[uv[0][0]+(uv[1][0]-uv[0][0])*v,uv[1][1]],[uv[3][0]+(uv[2][0]-uv[3][0])*v,uv[2][1]],[uv[3][0]+(uv[2][0]-uv[3][0])*u,uv[3][1]]];
            m.quad([ax,0,az+.008],[bx,0,bz+.008],[bx,h,bz+.008],[ax,h,az+.008],texture?[1.12,1.12,1.12]:'#8462a4',texture);
            for(const yy of [-.035,h+.025])m.rod([ax,yy,az+.015],[bx,yy,bz+.015],.012,'#657c83',6,{metal:.25});
        }
        for(const xx of [-w/2-.03,w/2+.03])m.box(xx,-.035,.015,.02,h+.07,.02,'#7c9295',{metal:.2});
    });
}

function squareProfile(x,z,w,d,cut=.22){
    const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,k=Math.min(cut,w*.2,d*.2);
    return [[a+k,c],[b-k,c],[b,c+k],[b,e-k],[b-k,e],[a+k,e],[a,e-k],[a,c+k]];
}
function squareExtrusion(m,points,y,h,color,material){
    const center=points.reduce((v,p)=>[v[0]+p[0]/points.length,v[1]+p[1]/points.length],[0,0]);
    for(let i=0;i<points.length;i++){
        const a=points[i],b=points[(i+1)%points.length];
        m.quad([b[0],y,b[1]],[a[0],y,a[1]],[a[0],y+h,a[1]],[b[0],y+h,b[1]],color,material);
        m.tri([center[0],y+h,center[1]],[b[0],y+h,b[1]],[a[0],y+h,a[1]],color,material);
    }
}
function squareTower(m,b,base,index){
    const palette=['#a8aba5','#b89576','#547c8d','#a66a5c','#91a6ab'],body=palette[index];
    // Three successively narrower, clipped-corner volumes, rather than one box.
    for(const [level,inset,h] of [[0,0,b.h*.58],[b.h*.58,.16,b.h*.27],[b.h*.85,.34,b.h*.15]]){
        const points=squareProfile(b.x,b.z,b.w-inset*2,b.d-inset*2,index===2?.38:.19);
        squareExtrusion(m,points,base+level,h,body,index===2?'glass':index%2?'brick':'stone');
        squareExtrusion(m,points,base+level+h-.07,.11,index===3?'#e1c293':'#bdc6c4',{metal:.15});
        for(let floor=level+.4;floor<level+h-.15;floor+=.64){
            squareExtrusion(m,points,base+floor,.045,index===2?'#91c6cd':'#cfbeb0');
            for(const side of [-1,1])for(let j=0;j<3;j++){
                const x=b.x-b.w/2+inset+.18+j*(b.w-inset*2-.32)/3,y=base+floor+.08,z=b.z+side*(b.d/2-inset+.006),w=(b.w-inset*2-.6)/3;
                const pane=windowAppearance(x,y,z,index*91+j),points=[[x,y,z],[x+w,y,z],[x+w,y+.3,z],[x,y+.3,z]];
                if(side<0)points.reverse();m.quad(...points,pane.color,pane.material);
            }
        }
        for(const [x,z] of points)m.box(x-.018,base+level,z-.018,.036,h,.036,'#b5c8c9',{metal:.12});
    }
    for(const side of [-1,1])pose(m,b.x+side*(b.w/2+.012),base,b.z,side>0?-Math.PI/2:Math.PI/2,()=>{
        for(let floor=.5;floor<b.h*.57;floor+=.64)for(let j=0;j<3;j++){
            const u=-b.d/2+.22+j*(b.d-.36)/3,pane=windowAppearance(b.x+side,b.z,floor,j+index*37);
            m.quad([u,floor,0],[u+(b.d-.65)/3,floor,0],[u+(b.d-.65)/3,floor+.31,0],[u,floor+.31,0],pane.color,pane.material);
        }
        const inward=index>0&&(b.x<63?side>0:side<0);
        if(inward){
            for(let j=0;j<3;j++){
                const u=-b.d/2+.2+j*(b.d-.35)/3,w=(b.d-.7)/3;
                m.box(u,.06,.013,w,.85,.027,'#45676b','glass');m.box(u-.045,0,.005,.06,1,.075,'#c9bca3','stone');
                m.box(u,.3,.047,w,.023,.018,'#bcae94');
            }
            m.box(-b.d/2+.12,1.03,.02,b.d-.24,.065,.25,index%2?'#647f76':'#8d7867','wood');
        }
    });
    // Mechanical penthouses, art-deco copper caps, and antennae vary the skyline.
    if(index%2){
        const y=base+b.h+.1;
        for(let j=0;j<4;j++)squareExtrusion(m,squareProfile(b.x,b.z,b.w*.65-j*.2,b.d*.65-j*.25,.08),y+j*.18,.19,j%2?'#78a296':'#92b7a7',{metal:.18});
        m.cylinder(b.x,y+.72,b.z,.025,.72,'#ded7be',8);
    }else{
        const w=b.w-.72,d=b.d-.72;drawCommercialRoof(m,{x:b.x-w/2,y:base+b.h+.08,z:b.z-d/2,w,d,seed:index*3.17+9,parapets:false});
    }
}

/** A compact downtown neighborhood: stone and brick setbacks, working shops,
 * restrained advertising, cafe seating, books, music and a construction site. */
export function drawTimesSquare(m,signs){
    const p=TIMES_SQUARE,base=p.base,start=m.data.length;
    m.box(p.west,base-.035,p.north,p.east-p.west,.047,p.south-p.north,'#969d9f','stone');
    for(const z of [153.7,155.3])m.box(p.west,base+.013,z,p.east-p.west,.018,.14,'#c8c9ba','stone');
    for(const b of TIMES_SQUARE_BUILDINGS){
        for(const z of [b.z-b.d/2-.3,b.z+b.d/2+.3])m.box(b.x-b.w/2-.22,base+.005,z,b.w+.44,.04,.18,'#bfc2bc','stone');
    }
    const adSets=[['ts-market','ts-cola','ts-think'],['ts-cola','ts-night','ts-moonshot'],['ts-market','ts-moonshot','ts-night'],['ts-broadway','ts-night','ts-broadway'],['ts-think','ts-cola','ts-market']];
    for(const [i,b] of TIMES_SQUARE_BUILDINGS.entries()){
        squareTower(m,b,base,i);
        const angle=i===0?0:b.x<63?-Math.PI/2:Math.PI/2,sideX=i===0?b.x:b.x+(b.x<63?b.w/2:-b.w/2),sideZ=i===0?b.z+b.d/2+.04:b.z;
        const width=i===0?b.w*.95:b.d*.88;
        squareScreen(m,signs,{x:sideX,y:base+1.1,z:sideZ,w:width,h:i===3?2.3:1.65,art:adSets[i][0],angle,curve:i===2?.14:0});
        if(b.h>5)squareScreen(m,signs,{x:sideX,y:base+3.1,z:sideZ,w:width*.88,h:1.65,art:adSets[i][1],angle});
        if(b.h>8)squareScreen(m,signs,{x:sideX,y:base+5.3,z:sideZ,w:width*.7,h:i===0?2.4:2,art:adSets[i][2],angle});
        // Second street-facing elevation keeps screens visible as the camera turns.
        for(const side of i===0?[-1]:[-1,1])squareScreen(m,signs,{x:b.x,y:base+2.1,z:b.z+side*(b.d/2+.04),w:b.w*.89,h:i===3?1.6:1.8,art:adSets[i][side<0?2:0],angle:side<0?Math.PI:0});
    }
    const one=TIMES_SQUARE_BUILDINGS[0];
    for(let i=0;i<4;i++)squareExtrusion(m,squareProfile(63,149.4,1.7-i*.27,2.1-i*.3,.12),base+one.h+.12+i*.18,.19,'#a9b8be',{metal:.35});
    // Broadway's projecting gold-bulb canopy and ticket doors.
    const theater=TIMES_SQUARE_BUILDINGS[3];
    pose(m,theater.x,base,theater.z-theater.d/2-.12,Math.PI,()=>{
        m.box(-1.12,1.02,-.02,2.24,.26,.32,'#6a2945');
        m.box(-1.17,1.28,-.03,2.34,.08,.36,'#c6a15d',{metal:.3});
        drawPlaque(m,signs,'BROADWAY',0,1.05,.315,2.03,.2,true);
        for(let i=0;i<15;i++)for(const z of [.04,.31])m.sphere(-1.07+i*.153,1,z,.026,.026,.026,'#ffe6a2',8,4,{emissive:.85});
        for(const x of [-.64,0,.64]){m.box(x-.2,0,.04,.4,.94,.035,'#21434c',{window:.25});m.box(x-.22,0,.08,.025,.94,.025,'#cfac6d');}
    });
    drawSquareStreetLife(m,signs);
    let top=base+one.h+2.5;for(let i=start;i<m.data.length;i+=11)top=Math.max(top,m.data[i+1]);
    return {id:'times-square',kind:'times-square',label:'Times Square',entry:{...p.entry},description:TIMES_SQUARE_EXAMINE,base,start,count:m.data.length-start,lo:[p.west,base-.04,p.north],hi:[p.east,top,p.south]};
}
