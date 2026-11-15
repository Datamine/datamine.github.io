import {MATERIAL_IDS} from './materials.js';

const rand=(x,y,salt=0)=>{const n=Math.sin(x*127.1+y*311.7+salt*19.3)*43758.5453;return n-Math.floor(n);};
const colorCache=new Map();
function rgb(hex){if(!colorCache.has(hex))colorCache.set(hex,[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255]);return colorCache.get(hex);}
function tint(hex,n){return '#'+rgb(hex).map(v=>Math.max(0,Math.min(255,Math.round(v*255+n))).toString(16).padStart(2,'0')).join('');}
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);};
class Mesh {
    constructor(){this.data=[];}
    tri(a,b,c,color,uv=null){const normal=unit(cross(sub(b,a),sub(c,a))),col=typeof color==='string'?rgb(color):color,material=typeof uv==='string'?[-2-MATERIAL_IDS[uv],0]:uv?.material?[-2-MATERIAL_IDS[uv.material],uv.angle||0]:uv?.snow?[-.75,0]:uv?.water!==undefined?[-1.75,uv.water]:uv?.envelope?[-1,-8]:uv?.window!==undefined?[-1.05,uv.window]:uv?.emissive?[-1.25,uv.emissive]:uv?.metal?[-1.4,uv.metal]:null;for(const [i,v] of [a,b,c].entries())this.data.push(...v,...normal,...col,...(material|| (uv?uv[i]:[-1,-1])));}
    quad(a,b,c,d,color,uv=null){this.tri(a,b,c,color,uv&&!Array.isArray(uv)?uv:uv&&[uv[0],uv[1],uv[2]]);this.tri(a,c,d,color,uv&&!Array.isArray(uv)?uv:uv&&[uv[0],uv[2],uv[3]]);}
    box(x,y,z,w,h,d,color,material=null){
        const a=[x,y,z],b=[x+w,y,z],c=[x+w,y,z+d],e=[x,y,z+d],A=[x,y+h,z],B=[x+w,y+h,z],C=[x+w,y+h,z+d],E=[x,y+h,z+d];
        this.quad(a,b,c,e,color,material);this.quad(A,E,C,B,color,material);this.quad(e,c,C,E,color,material);this.quad(b,a,A,B,color,material);this.quad(a,e,E,A,color,material);this.quad(c,b,B,C,color,material);
    }
    cylinder(x,y,z,r,h,color,segments=8,topRadius=r,material=null){
        // Keep explicitly square roofs and beams square; round visible trunks,
        // domes and columns with more segments and continuous side normals.
        if(segments!==4)segments=Math.max(segments,r>=.16?16:r>=.055?10:segments);
        for(let i=0;i<segments;i++){
            const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments,p=[x+Math.cos(a)*r,y,z+Math.sin(a)*r],q=[x+Math.cos(b)*r,y,z+Math.sin(b)*r],P=[x+Math.cos(a)*topRadius,y+h,z+Math.sin(a)*topRadius],Q=[x+Math.cos(b)*topRadius,y+h,z+Math.sin(b)*topRadius],start=this.data.length;
            this.quad(q,p,P,Q,color,material);
            if(segments>=10)for(const [j,t] of [b,a,a,b,a,b].entries()){const n=unit([Math.cos(t),(r-topRadius)/(h||1e-8),Math.sin(t)]);for(let k=0;k<3;k++)this.data[start+j*11+3+k]=n[k];}
            if(topRadius)this.tri([x,y+h,z],Q,P,color,material);
        }
    }
    sphere(x,y,z,rx,ry,rz,color,segments=8,rings=4,material=null){
        if(Math.max(rx,ry,rz)>=.25){segments=Math.max(segments,12);rings=Math.max(rings,6);}
        const point=(i,j)=>{const a=i*Math.PI/rings,b=j*Math.PI*2/segments;return [x+Math.sin(a)*Math.cos(b)*rx,y+Math.cos(a)*ry,z+Math.sin(a)*Math.sin(b)*rz];};
        for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
            const a=point(i,j),b=point(i,j+1),c=point(i+1,j+1),d=point(i+1,j),start=this.data.length;this.quad(a,d,c,b,color,material);
            for(let v=start;v<this.data.length;v+=11){const n=unit([(this.data[v]-x)/(rx*rx||1e-8),(this.data[v+1]-y)/(ry*ry||1e-8),(this.data[v+2]-z)/(rz*rz||1e-8)]);for(let k=0;k<3;k++)this.data[v+3+k]=n[k];}
        }
    }
    rod(a,b,r,color,segments=6,material=null){
        const axis=unit(sub(b,a)),u=unit(cross(axis,Math.abs(axis[1])<.9?[0,1,0]:[1,0,0])),v=cross(axis,u),at=(p,t)=>p.map((n,i)=>n+(u[i]*Math.cos(t)+v[i]*Math.sin(t))*r);
        for(let i=0;i<segments;i++){
            const t=i*Math.PI*2/segments,t2=(i+1)*Math.PI*2/segments,start=this.data.length;this.quad(at(a,t),at(a,t2),at(b,t2),at(b,t),color,material);
            if(segments>=10)for(const [j,angle] of [t,t2,t2,t,t2,t].entries())for(let k=0;k<3;k++)this.data[start+j*11+3+k]=u[k]*Math.cos(angle)+v[k]*Math.sin(angle);
        }
    }
}
function matrixMultiply(a,b){const out=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let i=0;i<4;i++)out[col*4+row]+=a[i*4+row]*b[col*4+i];return out;}
function rayBox(ray,lo,hi){let near=0,far=220;for(let i=0;i<3;i++){if(Math.abs(ray.dir[i])<1e-9){if(ray.origin[i]<lo[i]||ray.origin[i]>hi[i])return null;}else{let a=(lo[i]-ray.origin[i])/ray.dir[i],b=(hi[i]-ray.origin[i])/ray.dir[i];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return null;}}return near;}
function rayTriangle(ray,a,b,c){const e1=sub(b,a),e2=sub(c,a),p=cross(ray.dir,e2),det=dot(e1,p);if(Math.abs(det)<1e-8)return null;const inv=1/det,t=sub(ray.origin,a),u=dot(t,p)*inv;if(u<-.0001||u>1.0001)return null;const q=cross(t,e1),v=dot(ray.dir,q)*inv;if(v<-.0001||u+v>1.0001)return null;const d=dot(e2,q)*inv;return d>.01?d:null;}
function pose(m,x,y,z,angle,draw){const start=m.data.length;draw(m);const c=Math.cos(angle),s=Math.sin(angle);for(let i=start;i<m.data.length;i+=11){const xx=m.data[i],zz=m.data[i+2],nx=m.data[i+3],nz=m.data[i+5];m.data[i]=x+xx*c-zz*s;m.data[i+1]+=y;m.data[i+2]=z+xx*s+zz*c;m.data[i+3]=nx*c-nz*s;m.data[i+5]=nx*s+nz*c;if(m.data[i+9]<-1.5)m.data[i+10]+=angle;}}

// Wall indices match makeBuilding: north, south, west, east in building space.
// Rotate each outward normal into world space and compare it with the actual
// eye-to-building direction. This also handles off-center players and any yaw.
export function cutawayWallMask(building,eye){
    const {x,y,w,d,rotation=0}=building,c=Math.cos(rotation),s=Math.sin(rotation);
    const dx=eye[0]-(x+w/2),dz=eye[2]-(y+d/2);
    const localX=c*dx+s*dz,localZ=-s*dx+c*dz;
    const facing=[-localZ,localZ,-localX,localX];
    return facing.reduce((mask,value,side)=>value>1e-7?mask|(1<<side):mask,0);
}

export {rand,rgb,tint,sub,dot,cross,unit,Mesh,matrixMultiply,rayBox,rayTriangle,pose};
