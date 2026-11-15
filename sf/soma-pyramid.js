import {pose} from './geometry.js';

/** A compact, asymmetric glass spire on the original one-tile SoMa parcel. */
export function drawSomaPyramid(m,x,base,z){
    pose(m,x,base,z,0,()=>{
        const corners=[[-1,-1],[1,-1],[1,1],[-1,1]],levels=20;
        const at=(side,t,u,offset=0)=>{
            const a=corners[side],b=corners[(side+1)%4],r=.43*Math.pow(1-t,.94),nx=(a[0]+b[0])/2,nz=(a[1]+b[1])/2;
            return [(a[0]+(b[0]-a[0])*u)*r+t*.13+nx*offset,.24+t*7.1,(a[1]+(b[1]-a[1])*u)*r+nz*offset];
        };
        m.box(-.47,0,-.47,.94,.2,.94,'#b3bdb5','stone');
        for(let side=0;side<4;side++){
            for(let floor=0;floor<levels;floor++){
                const t=floor/levels,u=(floor+1)/levels,bays=floor<12?4:floor<17?3:2;
                m.quad(at(side,t,0),at(side,t,1),at(side,u,1),at(side,u,0),'#658994','glass');
                for(let bay=0;bay<bays;bay++){
                    const a=(bay+.07)/bays,b=(bay+.93)/bays,lo=t+.007,hi=u-.007;
                    if(hi>lo)m.quad(at(side,lo,a,.012),at(side,lo,b,.012),at(side,hi,b,.012),at(side,hi,a,.012),['#557780','#6a919b','#789ca2','#5d858f'][(bay+floor+side)%4],'glass');
                }
                m.rod(at(side,u,0,.018),at(side,u,1,.018),.009,'#9fb3b4',4,{metal:.15});
            }
            for(const u of [0,.25,.5,.75])for(let floor=0;floor<levels-1;floor++)m.rod(at(side,floor/levels,u,.02),at(side,(floor+1)/levels,u,.02),u===0?.014:.0065,'#bac8c3',4,{metal:.2});
            for(let floor=0;floor<15;floor+=3)m.rod(at(side,floor/levels,floor%2?0:1,.028),at(side,(floor+3)/levels,floor%2?1:0,.028),.012,'#9fb9bc',6,{metal:.18});
        }
        m.box(-.36,.2,.43,.72,.45,.035,'#44616b','glass');
        m.box(-.4,.67,.41,.8,.045,.17,'#c1c9be','stone');
        for(const u of [-.3,.3])m.rod([u,.2,.5],[u,.66,.5],.018,'#b9c6bd',8);
        for(const u of [-.16,0,.16])m.rod([u,.22,.47],[u,.61,.47],.008,'#acbdb7',4);
        m.rod([.13,7.22,0],[.13,7.7,0],.012,'#c7d3ca',8,{metal:.22});
        m.sphere(.13,7.7,0,.025,.025,.025,'#d8c3a3',10,6,{emissive:.18});
    });
}
