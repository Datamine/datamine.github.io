import {drawPiercedWall} from './wall-openings.js';
import {pose} from './geometry.js';
import {recordInstitutePart,drawInstituteFloor,drawInstituteWall,instituteWindowOpenings} from './institute-interiors.js';
import {drawPlaque} from './southern-district.js';

const researchBrass='#bda46d',researchIvory='#ded4bb',researchCopper='#72978e';

function researchPanel(m,signs,id,x,y,z,w,h){
    // Flush panels need only visible faces, rather than hidden box geometry
    // behind every little ceramic tile in the cornice.
    m.quad([x-.045,y-.045,z+.012],[x+w+.045,y-.045,z+.012],[x+w+.045,y+h+.045,z+.012],[x-.045,y+h+.045,z+.012],researchBrass,{metal:.2});
    m.quad([x,y,z+.021],[x+w,y,z+.021],[x+w,y+h,z+.021],[x,y+h,z+.021],'#eee9db',signs.get(id)||'stone');
}

// Upright arched glazing and projecting stone voussoirs. The ambient window
// shader belongs only to the glass; each lead line is separate solid geometry.
function researchArch(m,x,y,z,w,h,{stained=false,seed=0,open=false,transparent=false}={}){
    const r=w/2,shoulder=y+h-r,glass=stained?'#7c9694':seed%3?'#42626b':'#adab92',point=(a,rr)=>[x+Math.cos(a)*rr,shoulder+Math.sin(a)*rr,z];
    if(!open)m.quad([x-r,y,z],[x+r,y,z],[x+r,shoulder,z],[x-r,shoulder,z],transparent?'#b9d2d5':glass,transparent?{glass:.1}:{window:seed%3?.035:.18});
    for(let i=0;i<12;i++){
        const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
        if(!open)m.tri([x,shoulder,z],point(a,r),point(b,r),transparent?(stained?['#a5bdb8','#c2bca4','#aab6c2','#bfb1bd'][i%4]:'#b9d2d5'):stained?['#7c9e9b','#b7a179','#6a7e93','#9d8796'][i%4]:glass,transparent?{glass:stained?.16:.1}:{window:.06});
        m.quad(point(a,r),point(b,r),point(b,r+.055),point(a,r+.055),i%4===0?researchBrass:researchIvory,'stone');
    }
    for(const side of [-1,1])m.box(x+side*r-.027,y-.04,z-.01,.054,h-r+.06,.07,researchIvory,'stone');
    m.box(x-r-.065,y-.055,z-.015,w+.13,.06,.14,researchIvory,'stone');
    if(!open)m.rod([x,y,z+.032],[x,y+h-.025,z+.032],.012,researchBrass,4);
    if(!open)m.rod([x-r,y+h*.48,z+.032],[x+r,y+h*.48,z+.032],.01,researchBrass,4);
}

function researchRose(m,x,y,z,r,transparent=false){
    for(let i=0;i<24;i++){
        const a=i*Math.PI/12,b=(i+1)*Math.PI/12,at=(t,rr)=>[x+Math.cos(t)*rr,y+Math.sin(t)*rr,z];
        m.tri([x,y,z],at(a,r),at(b,r),['#659393','#b3a27c','#81768f','#9da88b'][Math.floor(i/3)%4],transparent?{glass:.16}:{window:.12});
        m.rod(at(a,r),at(b,r),.025,researchBrass,4,{metal:.25});
        if(i%3===0)m.rod(at(a,r*.23),at(a,r),.012,researchIvory,4);
    }
    m.sphere(x,y,z+.015,r*.23,r*.23,.025,'#c3c5a5',12,4,{emissive:.12});
}

function researchOrbit(m,x,y,z,r,tilt,yaw){
    pose(m,x,y,z,yaw,()=>{
        for(let i=0;i<32;i++){
            const at=a=>[Math.cos(a)*r,Math.sin(a)*r*Math.sin(tilt),Math.sin(a)*r*Math.cos(tilt)];
            m.rod(at(i*Math.PI/16),at((i+1)*Math.PI/16),.018,researchBrass,4,{metal:.3});
        }
    });
}

function researchObservatory(m,signs){
    // Copper ribs, a tiled drum and a brass armillary make the roof an actual
    // scientific instrument, with an offset little reading room beside it.
    const x=-.8,z=-.25;
    m.cylinder(x,3.39,z,1.27,.5,'#94a6a0',24,1.27,'stone');
    m.cylinder(x,3.86,z,1.35,.09,researchBrass,32,1.35,{metal:.3});
    const domeStart=m.data.length;
    m.sphere(x,3.91,z,1.22,.78,1.22,researchCopper,32,12,{metal:.22});
    // The drum closes the underside. Keep the smoothly shaded upper half.
    m.data.length=domeStart+(m.data.length-domeStart)/2;
    for(let rib=0;rib<12;rib++)for(let i=0;i<8;i++){
        const angle=rib*Math.PI/6,at=a=>[x+Math.cos(a)*1.235*Math.cos(angle),3.91+Math.sin(a)*.79,z+Math.cos(a)*1.235*Math.sin(angle)];
        m.rod(at(i*Math.PI/16),at((i+1)*Math.PI/16),.012,researchBrass,4,{metal:.25});
    }
    for(let i=0;i<8;i++)pose(m,x,0,z,i*Math.PI/4,()=>researchPanel(m,signs,'research-etching',-.22,3.48,1.275,.44,.29));
    m.cylinder(x,4.64,z,.065,.36,researchBrass,12,.035,{metal:.3});
    for(let i=0;i<3;i++)researchOrbit(m,x,5.28,z,.59-i*.09,.3+i*.6,i*.8);
    m.sphere(x,5.28,z,.11,.11,.11,'#a7c2b4',12,6,{emissive:.14});
    for(const isX of [false,true])for(const far of [false,true])drawPiercedWall(m,{isX,far,plane:isX?(far?1.18:2.84):(far?-1.32:.84),along:isX?-1.32:1.18,y:3.39,w:isX?2.16:1.66,h:.75,depth:.1,color:'#bfae95',openings:!isX&&!far?[{x:1.74,y:3.51,w:.54,h:.54,ellipse:true,segments:12}]:[]});
    m.box(1.1,4.12,-1.4,1.82,.11,2.32,researchIvory,'stone');
    researchRose(m,2.01,3.78,.86,.27,true);
    for(const side of [-1,1])m.quad([1.08,4.23,-.24+side*1.16],[2.94,4.23,-.24+side*1.16],[2.94,4.73,-.24],[1.08,4.73,-.24],researchCopper,'roofTile');
    for(const side of [-1,1])m.tri([side<0?1.18:2.84,4.23,-1.32],[side<0?1.18:2.84,4.23,.84],[side<0?1.18:2.84,4.73,-.24],'#c0b39d','stone');
}

function researchFieldRoof(m,signs){
    // An eight-sided lantern and terraced indigo roof overlook an asymmetric
    // sloping chart room. Its glazed roof carries the original star-map SVG.
    pose(m,.9,3.39,-.2,Math.PI/8,()=>{
        const half=1.33*Math.sin(Math.PI/8),plane=1.33*Math.cos(Math.PI/8);
        for(let i=0;i<8;i++)pose(m,0,0,0,i*Math.PI/4,()=>{
            drawPiercedWall(m,{plane,along:-half,y:0,w:half*2,h:.95,depth:.08,color:'#82969b',openings:[{x:-.25,y:.14,w:.5,h:.66,arch:true}]});
            m.tri([0,.95,0],[-half,.95,plane],[half,.95,plane],researchIvory,'stone');
            researchArch(m,0,.14,plane+.012,.5,.66,{stained:true,seed:i,transparent:true});
        });
        for(let i=0;i<3;i++)m.cylinder(0,.92+i*.23,0,1.49-i*.32,.24,i%2?'#6c7b90':'#626a8a',8,1.16-i*.32,'shingles');
        m.cylinder(0,1.64,0,.075,.32,researchBrass,16,.02,{metal:.35});
        researchOrbit(m,0,2.18,0,.39,Math.PI/2,0);
        m.sphere(0,2.18,0,.1,.1,.1,'#b9c6bd',12,6,{emissive:.12});
    });
    const left=-3.18,right=-1.42,near=1.37,far=-1.27;
    m.box(left,3.39,far,right-left,.3,near-far,'#8d8d9e','stone');
    for(const side of [-1,1]){
        const z=side<0?far:near;
        m.quad([left,3.69,z],[right,3.69,z],[right,4.35,.05],[left,4.35,.05],'#b9d2d5',{glass:.14});
        for(let i=0;i<5;i++){const x=left+.2+i*.31,z=(side<0?far+.28:near-.28)-(i%2)*.12*side,y=3.69+(1-Math.abs(z-.05)/1.32)*.66+.015;m.sphere(x,y,z,.024,.018,.024,researchBrass,6,3,{metal:.2});if(i){const px=x-.31,pz=(side<0?far+.28:near-.28)-((i-1)%2)*.12*side,py=3.69+(1-Math.abs(pz-.05)/1.32)*.66+.015;m.rod([px,py,pz],[x,y,z],.006,researchBrass,4);}}
        for(const x of [left,left+.44,left+.88,left+1.32,right])m.rod([x,3.7,z],[x,4.37,.05],.021,researchBrass,6,{metal:.25});
    }
    m.rod([left,4.37,.05],[right,4.37,.05],.025,researchIvory,8);
    for(const x of [left,right])m.tri([x,3.69,far],[x,3.69,near],[x,4.35,.05],'#b9d2d5',{glass:.1});
}

/** Walls, furnishings and open doorways share the navigation floor plan.
 * Separate sections allow roofs and camera-facing walls to lift away. */
export function drawResearchInstitute(m,signs,c,index,title){
    const stone=index?'#a5a9b6':'#cfbda3',trim=index?'#666f8c':'#8b9c88',start=m.data.length,parts=[];
    const local={x:0,z:0,base:0,w:c.w,d:c.d,front:1};
    pose(m,c.x,c.base,c.z,0,()=>{
        recordInstitutePart(m,parts,'floor',null,()=>drawInstituteFloor(m,local,index));
        for(let side=0;side<4;side++)recordInstitutePart(m,parts,'wall',side,()=>{
            drawInstituteWall(m,local,side,3.25,stone,researchIvory,{openings:instituteWindowOpenings(local,side)});
            if(side<2)pose(m,0,0,side===0?-c.d/2:c.d/2,side===0?Math.PI:0,()=>{
                for(const [i,x] of [-c.w*.39,-c.w*.23,c.w*.23,c.w*.39].entries())researchArch(m,x,.48,.035,.62,1.23,{stained:index===1&&i%2===0,seed:i+index,transparent:true});
                if(side===0)researchPanel(m,signs,index?'research-stars':'research-etching',-.62,.47,.037,1.24,1.23);
                for(let x=-c.w/2+.25;x<c.w/2-.5;x+=.64)researchPanel(m,signs,'research-mosaic',x,3.005,.04,.57,.16);
                for(const x of [-c.w/2+.08,c.w/2-.24]){m.box(x,.2,.005,.16,3.03,.12,researchIvory,'stone');m.box(x-.035,3.13,-.015,.23,.16,.16,researchBrass,{metal:.18});}
            });
            else pose(m,side===2?-c.w/2:c.w/2,0,0,side===2?Math.PI/2:-Math.PI/2,()=>{
                for(const x of [-1.28,1.28])researchArch(m,x,.51,.035,.57,1.29,{stained:index===1,seed:Math.round(x*4),transparent:true});
                researchPanel(m,signs,index?'research-stars':'research-mosaic',-.46,.62,.04,.92,1.1);
                for(let x=-1.85;x<1.7;x+=.64)researchPanel(m,signs,'research-mosaic',x,2.73,.04,.57,.35);
            });
            if(side===1){
                researchArch(m,0,.015,c.d/2+.035,1.5,2.1,{seed:1,open:true});
                m.box(-1.8,2.17,c.d/2-.05,3.6,.1,.65,trim,{metal:.2});
                for(const x of [-1.55,1.55]){m.cylinder(x,0,c.d/2+.48,.035,2.18,researchBrass,12);m.cylinder(x,2.04,c.d/2+.48,.075,.13,researchIvory,12,.04);}
                m.box(-c.w/2+.24,2.3,c.d/2+.04,c.w-.48,.66,.045,index?'#414c67':'#465e53');
                drawPlaque(m,signs,title,0,2.32,c.d/2+.09,c.w-.65,.59);
            }
        });
        recordInstitutePart(m,parts,'roof',null,()=>{
            m.box(-c.w/2-.07,3.25,-c.d/2-.07,c.w+.14,.1,c.d+.14,researchIvory,'stone');
            m.box(-c.w/2+.08,3.35,-c.d/2+.08,c.w-.16,.035,c.d-.16,index?'#737c91':'#9baba0','roof');
            for(const side of [-1,1]){m.box(-c.w/2-.08,3.34,side<0?-c.d/2-.08:c.d/2-.04,c.w+.16,.15,.12,trim,'stone');m.box(side<0?-c.w/2-.08:c.w/2-.04,3.34,-c.d/2,.12,.15,c.d,trim,'stone');}
            if(index)researchFieldRoof(m,signs);else researchObservatory(m,signs);
        });
    });
    return {start,end:m.data.length,parts,spec:{id:c.id,x:c.x,z:c.z,w:c.w,d:c.d,base:c.base,front:1,rotation:0}};
}

export function drawResearchCourtDetails(m,signs,c,index){
    // These almost-flush inlays add celestial geometry to the existing paving,
    // not new barriers. Keep the three-dimensional sculpture in its solid disc.
    for(const r of [.9,1.07])for(let i=0;i<48;i++){
        const a=i*Math.PI/24,b=(i+1)*Math.PI/24,at=(angle,radius)=>[c.x+Math.cos(angle)*radius,c.base+.022,173.3+Math.sin(angle)*radius];
        m.quad(at(a,r-.007),at(b,r-.007),at(b,r+.007),at(a,r+.007),researchBrass);
    }
    for(let i=0;i<12;i++){
        const a=i*Math.PI/6,dx=Math.cos(a),dz=Math.sin(a),at=(r,w)=>[c.x+dx*r-dz*w,c.base+.023,173.3+dz*r+dx*w];
        m.quad(at(.94,-.009),at(1.035,-.009),at(1.035,.009),at(.94,.009),researchIvory);
    }
    if(index){
        for(let i=0;i<2;i++)researchOrbit(m,c.x,c.base+.88,173.3,.57,i?1.1:.45,i?1.3:0);
        m.sphere(c.x,c.base+.88,173.3,.14,.14,.14,'#aabeb8',12,6,{emissive:.16});
    }
}
