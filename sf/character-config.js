import {Mesh} from './geometry.js';
import {drawCharacter} from './characters.js';

export const CHARACTER_DEFAULTS=Object.freeze({gender:'man',skin:'#bd9369',shirt:'#707b4b',pants:'#626955',hair:'#453a30',shoes:'#3c3d36',hairstyle:'short',sunglasses:false});
export function normalizeCharacter(value={}){
    const result={...CHARACTER_DEFAULTS};
    for(const key of ['skin','shirt','pants','hair','shoes'])if(/^#[0-9a-f]{6}$/i.test(value?.[key]))result[key]=value[key];
    if(['man','woman'].includes(value?.gender))result.gender=value.gender;
    if(['short','long','curly'].includes(value?.hairstyle))result.hairstyle=value.hairstyle;
    result.sunglasses=value?.sunglasses===true;
    return result;
}
export function characterAppearance(settings){return {...settings,female:settings.gender==='woman',longHair:settings.hairstyle!=='short',backpack:false};}

export function drawCharacterPreview(canvas,settings){
    const ctx=canvas.getContext('2d'),m=new Mesh();if(!ctx)return;
    drawCharacter(m,0,0,0,Math.PI/2-.3,0,false,settings.skin,settings.shirt,characterAppearance(settings));
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#383c36';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#222820';ctx.beginPath();ctx.ellipse(120,216,48,12,0,0,Math.PI*2);ctx.fill();
    const triangles=[];
    for(let i=0;i<m.data.length;i+=33){
        const points=[0,11,22].map(k=>({x:120+m.data[i+k]*100,y:215-m.data[i+k+1]*100-m.data[i+k+2]*20}));
        triangles.push({points,depth:(m.data[i+2]+m.data[i+13]+m.data[i+24])/3,color:m.data.slice(i+6,i+9),light:.65+Math.max(0,m.data[i+3]*-.4+m.data[i+4]*.7+m.data[i+5]*.5)*.35});
    }
    triangles.sort((a,b)=>a.depth-b.depth);
    for(const t of triangles){ctx.fillStyle='rgb('+t.color.map(v=>Math.round(Math.min(1,v*t.light)*255)).join(',')+')';ctx.beginPath();t.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();}
}
