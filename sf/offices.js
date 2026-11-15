import {pose} from './geometry.js';
import {drawFacadeWindow} from './windows.js';

/** Prewar masonry office tower: ordered bays, framed glazing on all four
 * elevations, a stone base, and a stepped cornice instead of flat blue slots. */
export function drawBrickOfficeTower(m,cx,base,cz){
    pose(m,cx,base,cz,0,()=>{
        const brick='#a0806a',stone='#c9c7b6';
        m.box(-.8,0,-.8,1.6,.16,1.6,'#aaa99a','stone');
        m.box(-.72,.16,-.72,1.44,5.2,1.44,brick,'brick');
        for(let side=0;side<4;side++){
            const isX=side>=2,far=side%2===0,plane=far?-.72:.72;
            for(let floor=0;floor<6;floor++)for(let column=0;column<3;column++)drawFacadeWindow(m,{isX,plane,along:-.56+column*.42,y:.4+floor*.78,w:.27,h:.55,far,trim:stone,seed:side*13+floor*7+column,style:floor?'office':'storefront'});
            for(const u of [-.7,.65]){
                if(isX)m.box(plane-(far?.045:0),.2,u,.045,5.13,.05,'#b49a7f','brick');
                else m.box(u,.2,plane-(far?.045:0),.05,5.13,.045,'#b49a7f','brick');
            }
        }
        for(const [y,w,h,color] of [[.18,1.5,.08,stone],[1.08,1.5,.055,stone],[5.18,1.51,.075,stone],[5.29,1.61,.09,'#d7cfb9'],[5.39,1.69,.065,stone]])m.box(-w/2,y,-w/2,w,h,w,color,'stone');
        m.box(-.73,5.455,-.73,1.46,.03,1.46,'#74867f','roof');
        for(const x of [-.79,.735])m.box(x,5.46,-.79,.055,.18,1.58,stone);
        for(const z of [-.79,.735])m.box(-.735,5.46,z,1.47,.18,.055,stone);
        m.box(-.33,5.49,-.28,.58,.2,.48,'#a6b0a2','concrete');
        for(const x of [-.18,.12]){m.cylinder(x,5.69,-.05,.095,.11,'#7c9188',16);m.cylinder(x,5.8,-.05,.11,.025,stone,16);}
    });
}
