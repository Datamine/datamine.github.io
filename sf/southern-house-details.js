import {tint} from './geometry.js';
/** Details stay above the existing house floor and inside its street-facing
 * parcel: no extra foundation overlays or private paving across the curb. */
export function drawSouthernHouseDetails(m,kind,p){
    const {left,width:w,face:z,floor:y,H,shape,door,dw,color,bx,bw}=p,ivory='#e8dbc2',metal='#4e766b';
    if(kind==='coastal'){
        for(let level=0;level<(p.storeys||1);level++)for(const side of [-1,1]){
            const x=bx+side*(bw/2+.06);m.box(x-.035,y+.58+level*1.12,z+.03,.07,.54,.045,side<0?'#527b8c':'#5b8f8a','wood');
            for(let j=0;j<4;j++)m.box(x-.027,y+.63+level*1.12+j*.095,z+.078,.054,.013,.009,ivory);
        }
        m.box(bx-bw*.48,y+.43,z+.065,bw*.96,.09,.13,'#b48059','wood');
        for(let j=0;j<4;j++){m.sphere(bx-bw*.36+j*bw*.23,y+.56,z+.13,.065,.065,.06,'#6f9b66',6,3);m.sphere(bx-bw*.36+j*bw*.23,y+.62,z+.13,.027,.025,.027,j%2?'#dea987':'#d6c66e',6,3);}
    }else if(kind==='deco'){
        for(let tier=0;tier<3;tier++)m.box(left+.05+tier*w*.09,y+H+.03+tier*.075,z-.08,w-.1-tier*w*.18,.075,.13,tier%2?ivory:tint(color,12),'stucco');
        for(let rib=0;rib<3;rib++)m.box(door-.045+rib*.036,y+1.76,z+.028,.016,Math.max(.1,H-1.8),.038,ivory);
        m.box(left+.03,y+.15,z+.018,w-.06,.16,.035,tint(color,-12),'glazedTile');
        for(const side of [-1,1])m.rod([bx+side*bw*.45,y+1.22,z+.055],[bx+side*bw*.45,y+1.36,z+.055],.018,'#c5ae78',6,{metal:.25});
    }else if(kind==='craftsman'){
        m.box(door-.07,y+1.66,z-.01,dw+.14,.07,.23,'#c2a079','cedar');
        for(const x of [door-.055,door+dw+.055]){m.box(x-.023,y+.22,z+.13,.046,1.44,.046,ivory);m.box(x-.05,y+.18,z+.10,.1,.24,.1,'#9d876d','stone');}
        for(let x=left+.08;x<left+w-.05;x+=.19)m.rod([x,y+H-.12,z+.035],[x,y+H-.04,z+.15],.014,'#c1a37b',4);
        for(const side of [-1,1])m.rod([bx+side*bw*.45,y+.52,z+.08],[bx+side*bw*.45,y+.37,z+.15],.017,metal,4);
    }else if(kind==='mediterranean'){
        const r=dw*.57,cy=y+1.45;for(let i=0;i<10;i++){const a=i*Math.PI/10,b=(i+1)*Math.PI/10,at=(t,rr)=>[door+dw/2+Math.cos(t)*rr,cy+Math.sin(t)*rr,z+.135];m.quad(at(a,r),at(b,r),at(b,r+.035),at(a,r+.035),ivory,'travertine');}
        m.box(left+.025,y+.15,z+.02,w-.05,.11,.026,'#8e9d91','glazedTile');
        for(let x=left+.1;x<left+w-.08;x+=.22){m.box(x,y+H-.06,z+.03,.13,.045,.14,'#ad7759','roofTile');}
        m.cylinder(left+w-.12,y+.17,z+.12,.075,.16,'#ba8159',10,.105,'limewash');m.sphere(left+w-.12,y+.4,z+.12,.12,.18,.11,'#748f57',10,5);
    }else if(kind==='garden'){
        const x=left+w-.09;for(const u of [x-.05,x+.035])m.rod([u,y+.18,z+.045],[u,y+1.42,z+.045],.009,'#a3aa85',4);
        for(let j=0;j<7;j++){m.rod([x-.05,y+.3+j*.16,z+.045],[x+.035,y+.3+j*.16,z+.045],.007,'#a3aa85',4);if(j%2)m.sphere(x+.035*Math.sin(j),y+.35+j*.14,z+.065,.07,.10,.035,['#72955d','#91a86c','#a2b17c'][j%3],6,3);}
        for(const u of [left+.1,left+w-.14]){m.cylinder(u,y+.15,z+.12,.06,.12,'#b98666',10,.085);m.sphere(u,y+.35,z+.12,.085,.14,.075,'#7f9d67',8,4);}
    }
}
