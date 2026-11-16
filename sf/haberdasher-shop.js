import {pose} from './geometry.js';
import {HABERDASHER} from './haberdasher-layout.js';
import {drawHatModel} from './hat-models.js';
import {drawPlaque} from './southern-district.js';

export const HABERDASHER_SIGNS=Object.freeze(['HABERDASHER','HATS · 1 TO 100,000 COINS']);
/** Two recessed display cases, a striped canopy and a modeled hanging top hat.
 * Staff trade from the pavement; this storefront is a solid, non-enterable shop. */
export function drawHaberdasherShop(m,signs){
    const h=HABERDASHER,start=m.data.length,front=h.d/2;
    pose(m,h.x,h.base,h.z,h.rotation,()=>{
        m.box(-1.5,-.05,-.9,3,.12,1.8,'#bbb59e','stone');
        m.box(-1.46,.07,-.86,2.92,2.17,1.43,'#8b7971','brick');
        for(const x of [-1.46,-.42,.35,1.38])m.box(x,.16,.56,.08,1.75,.3,'#d5c9ac','wood');
        for(const x of [-1.38,.43]){
            m.box(x,.18,.60,.95,.43,.25,'#536f63','cedar');
            m.box(x-.02,.59,.6,.99,.045,.27,'#d5c9ac','wood');
            // Glass is the rear of the case, allowing the physical hats to show.
            m.quad([x,.65,.61],[x+.95,.65,.61],[x+.95,1.69,.61],[x,1.69,.61],'#48595b',{window:.13});
            for(const dx of [.02,.32,.63])m.box(x+dx,.65,.67,.26,.14,.17,'#c8b89c','wood');
            m.box(x-.02,1.68,.6,.99,.07,.27,'#d5c9ac','wood');
            for(const xx of [x-.02,x+.95])m.box(xx,.62,.83,.025,1.1,.03,'#c0ad83');
        }
        for(const [id,x] of [['paper',-1.23],['panama',-.92],['beret',-.61],['top-hat',.58],['wizard',.89],['crown',1.2]])drawHatModel(m,id,x,.81,.72,0,.68);
        m.box(-.34,.1,.60,.64,1.65,.06,'#405d52','wood');m.box(-.28,.77,.668,.52,.84,.018,'#90a6a0',{window:.2});m.box(-.28,.19,.668,.52,.46,.018,'#4a685a','cedar');m.rod([.2,.73,.706],[.2,.95,.706],.013,'#c7a46b',8,{metal:.5});
        m.box(-1.53,1.84,.56,3.06,.34,.38,'#3b584c','wood');drawPlaque(m,signs,'HABERDASHER',0,1.91,.951,2.7,.19);
        for(let i=0;i<16;i++){
            const x=-1.52+i*3.04/16,color=i%2?'#e3d6b9':'#876573';
            m.quad([x,2.48,.93],[x+3.04/16,2.48,.93],[x+3.04/16,2.32,1.15],[x,2.32,1.15],color,'wood');m.box(x,2.26,1.135,3.04/16,.06,.018,color);
        }
        // Mansard roof with a central dormer and restrained copper trim.
        m.quad([-1.52,2.25,-.92],[-1.15,2.75,-.57],[1.15,2.75,-.57],[1.52,2.25,-.92],'#596c65','shingles');
        m.quad([-1.52,2.25,.93],[1.52,2.25,.93],[1.15,2.75,.57],[-1.15,2.75,.57],'#596c65','shingles');
        m.quad([-1.52,2.25,-.92],[-1.52,2.25,.93],[-1.15,2.75,.57],[-1.15,2.75,-.57],'#53635e','shingles');
        m.quad([1.52,2.25,-.92],[1.15,2.75,-.57],[1.15,2.75,.57],[1.52,2.25,.93],'#53635e','shingles');
        m.box(-1.17,2.74,-.59,2.34,.06,1.18,'#829184','roof');m.box(-.31,2.28,.60,.62,.48,.32,'#b9b499','stucco');m.box(-.24,2.36,.93,.48,.28,.024,'#718e8c',{window:.14});
        m.box(-.28,2.49,.96,.56,.025,.025,'#d4c7aa');m.box(-.015,2.36,.96,.03,.28,.025,'#d4c7aa');
        m.tri([-.37,2.75,.96],[.37,2.75,.96],[0,2.94,.96],'#d4c7aa','stone');
        for(const x of [-1.49,1.49])m.box(x-.03,.13,.91,.06,1.63,.06,'#d8c9a5','wood');
        drawPlaque(m,signs,'HATS · 1 TO 100,000 COINS',0,1.28,.711,.52,.12);
        // The projecting shop symbol sits above head height and never blocks a tile.
        m.rod([-1.3,2.9,.85],[-1.3,2.9,1.45],.025,'#806f4f',8);m.rod([-1.3,2.9,1.40],[-1.3,2.73,1.40],.014,'#806f4f',8);
        drawHatModel(m,'top-hat',-1.3,2.5,1.40,0,.63);
    });
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=start;i<m.data.length;i+=11)for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],m.data[i+a]);hi[a]=Math.max(hi[a],m.data[i+a]);}
    const footprint=[[h.x-h.w/2,h.z-h.d/2],[h.x+h.w/2,h.z-h.d/2],[h.x+h.w/2,h.z+h.d/2],[h.x-h.w/2,h.z+h.d/2]];
    return {id:'haberdasher',kind:'haberdasher',label:'Haberdasher',entry:{...h.entry},description:'A little hat shop just north of the GPU Factory, with recessed hat displays, a striped canopy, and a projecting top-hat sign. Talk to the haberdasher outside. Nine prestige hats cost from 1 to 100,000 coins; owned hats stay in your Character wardrobe.',start,count:m.data.length-start,lo,hi,footprint,navigationPolygons:[footprint]};
}
