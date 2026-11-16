import {WORLD_SIZE,STREET_LAYOUT_SIZE} from './geography.js';
import {pose} from './geometry.js';

const airportAdvertisers=[{id:'airport-openai',art:'ai-openai',z:81.9},{id:'airport-anthropic',art:'ai-anthropic',z:83.25},{id:'airport-xai',art:'ai-xai',z:84.6}];
export const AIRPORT_ADS=Object.freeze(['east','west'].flatMap(side=>airportAdvertisers.map(ad=>Object.freeze({id:ad.id+(side==='west'?'-west':''),art:ad.art,side,near:Object.freeze([side==='east'?84:79,ad.z])}))));
export const AIRPORT_BILLBOARD_PLOT=Object.freeze({width:2.3,depth:.8,clearingWidth:2.4,clearingDepth:1.2});
const airportFieldRoadX=70.5*WORLD_SIZE/STREET_LAYOUT_SIZE;
const airportAdRect=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
/** Authored openings in the green strip immediately west of the terminal
 * approach. Keep the cross streets and the existing estate frontage clear. */
export const AIRPORT_FIELD_ADS=Object.freeze(['ai-openai','ai-anthropic','ai-xai'].map((art,i)=>{
    const x=airportFieldRoadX-2.2,z=[106.8,115.6,128][i];
    return Object.freeze({id:'airport-field-ad-'+i,art,x,z,angle:0,side:'west',area:'airport-field',street:'Third Street south',roadX:airportFieldRoadX,polygon:airportAdRect(x,z,2.3,.8),clearing:airportAdRect(x,z,2.4,1.2)});
}));
export function inAirportFieldBillboards(x,z,margin=0){return AIRPORT_FIELD_ADS.some(p=>Math.abs(x-p.x)<1.2+margin&&Math.abs(z-p.z)<.6+margin);}


/** Panels always run east–west, across the direction of arriving traffic.
 * Reserve their clearings before houses are placed, on both road verges. */
export function planAirportBillboards({routes,fits,curbWidth=.25}){
    const plans=[],size=AIRPORT_BILLBOARD_PLOT,rect=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
    for(const ad of AIRPORT_ADS){
        let best=null,score=Infinity;
        for(const road of routes)if(['Third Street','Third Street south'].includes(road.name)){
            const [a,b]=road.points;if(Math.abs(b[0]-a[0])>.01)continue;
            const offset=road.halfWidth+curbWidth+size.clearingWidth/2+.15,roadX=a[0],x=roadX+(ad.side==='east'?offset:-offset);
            for(let z=Math.max(79,Math.min(a[1],b[1])+.65);z<Math.min(95.3,Math.max(a[1],b[1])-.65);z+=.125){
                const distance=(x-ad.near[0])**2+(z-ad.near[1])**2;if(distance>=score)continue;
                const clearing=rect(x,z,size.clearingWidth,size.clearingDepth);
                if(plans.some(p=>Math.abs(p.x-x)<size.clearingWidth&&Math.abs(p.z-z)<size.clearingDepth)||!fits(clearing))continue;
                score=distance;best={...ad,x,z,roadX,street:road.name,angle:0,polygon:rect(x,z,size.width,size.depth),clearing};
            }
        }
        if(!best||score>100)throw new Error('No clear airport-road billboard plot for '+ad.id);
        plans.push(best);
    }
    return plans;
}

export function drawAirportBillboard(m,signs,{x,z,angle,base,art}){
    pose(m,x,base,z,angle,()=>{
        // Two supports, service catwalk and a restrained, double-sided panel.
        for(const xx of [-.7,.7]){m.box(xx-.13,-.08,-.19,.26,.2,.38,'#adb4ae','stone');m.rod([xx,0,0],[xx,2.5,0],.045,'#667e82',10,{metal:.2});}
        m.box(-1.04,1.31,-.14,2.08,1.28,.28,'#34484f',{metal:.2});
        const uv=signs.get(art);if(uv)for(const side of [-1,1]){
            const points=[[-1,1.35,side*.149],[1,1.35,side*.149],[1,2.55,side*.149],[-1,2.55,side*.149]];
            m.quad(...(side===1?points:[points[1],points[0],points[3],points[2]]),[1.06,1.06,1.06],uv);
        }
        m.box(-1.09,1.27,-.24,2.18,.055,.48,'#819292',{metal:.3});
        for(const xx of [-.8,.8]){m.rod([xx,2.63,0],[xx,2.68,.27],.015,'#668088',6);m.box(xx-.1,2.63,.25,.2,.045,.12,'#e6e2cc',{emissive:.35});}
    });
}
