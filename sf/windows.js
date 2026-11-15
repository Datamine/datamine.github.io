import {tint} from './geometry.js';
import {windowAppearance} from './materials.js';

/** Complete pane divisions, shared by houses, offices, and civic buildings.
 * Cross rails stop at mullions, so no bars end halfway across a pane. */
export function windowLayout(w,h,style='sash'){
    const bar=Math.min(.025,w*.045,h*.035),vertical=style==='industrial'?[w/3,w*2/3]:[w/2],cross=h*(style==='office'||style==='storefront'?.76:style==='industrial'?.64:.5);
    const divisions=vertical.map(x=>({x:x-bar/2,y:0,w:bar,h})),cuts=[0,...vertical.flatMap(x=>[x-bar/2,x+bar/2]),w];
    for(let i=0;i<cuts.length-1;i+=2)divisions.push({x:cuts[i],y:cross-bar/2,w:cuts[i+1]-cuts[i],h:bar});
    return {bar,divisions};
}

/** Glass sits behind a solid outer frame and shaded reveals, with a projecting
 * sill. The glazing uses the ambient room shader, never a tiled pane texture. */
export function drawFacadeWindow(m,{isX=false,plane,along,y,w,h,far=false,trim='#dedbd0',seed=0,style='sash',bay=false}){
    const out=far?-1:1,offset=bay?.18:0,frame=Math.min(.035,w*.09,h*.07),appearance=windowAppearance(isX?plane:along,y,isX?along:plane,seed);
    const point=(u,v,d)=>isX?[plane+out*(d+offset),y+v,along+u]:[along+u,y+v,plane+out*(d+offset)];
    const face=(points,color,material=null)=>{if(isX!==far)points=[points[0],points[3],points[2],points[1]];m.quad(...points,color,material);};
    const box=(u,v,ww,hh,front,depth,color,material=null,reveal=-1,skip=[])=>{
        const corners=[[u,v],[u+ww,v],[u+ww,v+hh],[u,v+hh]];
        face(corners.map(p=>point(...p,front)),color,material);
        // The back is hidden against the wall. Shared mullion ends are hidden
        // against other rails, so neither needs triangles or competing caps.
        for(let i=0;i<4;i++)if(!skip.includes(i)){
            const a=corners[i],b=corners[(i+1)%4];
            face([point(...a,front-depth),point(...b,front-depth),point(...b,front),point(...a,front)],i===reveal?tint(color,-30):color,material);
        }
    };
    if(bay)box(-frame*2,-frame*2,w+frame*4,h+frame*4,.005,offset,trim,'wood');
    // Separate rails leave an actual open pocket instead of an opaque backing.
    box(-frame,-frame,frame,h+frame*2,.07,.06,trim,null,1);
    box(w,-frame,frame,h+frame*2,.07,.06,trim,null,3);
    box(0,-frame,w,frame,.07,.06,trim,null,2);
    box(0,h,w,frame,.07,.06,trim,null,0);
    const corners=[[0,0],[w,0],[w,h],[0,h]];
    face(corners.map(p=>point(...p,.013)),appearance.color,appearance.material);
    for(const part of windowLayout(w,h,style).divisions)box(part.x,part.y,part.w,part.h,.05,.018,style==='industrial'?'#667b75':tint(trim,-10),null,-1,part.h===h?[0,2]:[1,3]);
    box(-frame*1.6,-frame-.035,w+frame*3.2,.035,.115,.115,tint(trim,-7),'stone');
    if(style==='office')box(-frame*1.3,h+frame,w+frame*2.6,.035,.09,.08,trim,'stone');
}
