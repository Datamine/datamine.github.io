import {rand,unit} from './geometry.js';

// Original geometry, informed by the tower and restoration references:
// https://transamericapyramid.com/transamerica-pyramid
// https://www.fosterandpartners.com/news/the-column-transamerica-pyramid-center
export const TRANSAMERICA_PYRAMID=Object.freeze({width:2,depth:2,height:8.7});

/** White cladding, recessed windows, exposed lobby braces, upper service wings
 * and a distinct metal spire. Everything joins the existing static scene batch. */
export function drawTransamericaPyramid(m,cx,base,cz){
    const lower=.9,upper=6.45,tip=8.63,wide=.86,narrow=.225,rows=32;
    const slope=(narrow-wide)/(upper-lower),quartz='#e3e1d6',reveal='#a8b0a9';
    const normals=[[0,-1],[1,0],[0,1],[-1,0]].map(([x,z])=>unit([x,-slope,z]));
    const half=y=>wide+(narrow-wide)*Math.max(0,Math.min(1,(y-lower)/(upper-lower)));
    function point(face,f,y,out=0,spire=false){
        const h=spire?narrow+(.006-narrow)*(y-upper)/(tip-upper):half(y),u=(f*2-1)*h;
        const p=[[u,-h],[h,u],[-u,h],[-h,-u]][face],n=normals[face];
        return [cx+p[0]+n[0]*out,base+y+n[1]*out,cz+p[1]+n[2]*out];
    }
    function panel(face,l,r,bottom,top,color,material='stucco',out=0,spire=false){
        m.quad(point(face,l,bottom,out,spire),point(face,l,top,out,spire),point(face,r,top,out,spire),point(face,r,bottom,out,spire),color,material);
    }

    m.box(cx-1,base,cz-1,2,.065,2,'#b8b9aa','concrete');
    m.box(cx-.48,base+.09,cz-.48,.96,.73,.96,'#78908e','glass');
    // Pale diagonal columns leave the dark, recessed lobby visible between them.
    for(let face=0;face<4;face++){
        for(const f of [.06,.5,.94]){
            const foot=point(face,f,.1,.035);
            for(const direction of [-1,1]){
                const top=point(face,Math.max(0,Math.min(1,f+direction*.22)),.85,.012);
                m.rod(foot,top,.043,quartz,6,'concrete');
            }
        }
        panel(face,0,1,.82,lower,quartz,'concrete',.008);
    }
    m.box(cx-.24,base+.12,cz+.486,.48,.57,.016,'#536d6d','glass');
    for(const x of [-.25,0,.25])m.box(cx+x-.012,base+.12,cz+.505,.024,.59,.025,'#c3c6b9',{metal:.12});
    m.box(cx-.31,base+.69,cz+.49,.62,.045,.07,'#dedecf');
    for(let i=0;i<2;i++)m.box(cx-.52,base+.035+i*.025,cz+.84-i*.08,1.04,.025,.075,'#bfc1b1','concrete');

    const windowColors=['#546b69','#617775','#738683','#879792'];
    for(let face=0;face<4;face++)for(let row=0;row<rows;row++){
        const y0=lower+(upper-lower)*row/rows,y1=lower+(upper-lower)*(row+1)/rows;
        const bottom=y0+(y1-y0)*.19,top=y1-(y1-y0)*.15;
        const columns=Math.max(2,Math.floor((half((y0+y1)/2)*2-.08)/.15));
        // Continuous spandrels and narrow piers surround real window openings.
        panel(face,0,1,y0,bottom,quartz);
        panel(face,0,1,top,y1,quartz);
        for(let col=0;col<columns;col++){
            const l=(col+.29)/columns,r=(col+.71)/columns;
            panel(face,col/columns,l,bottom,top,quartz);
            panel(face,r,(col+1)/columns,bottom,top,quartz);
            const outer=[point(face,l,bottom),point(face,r,bottom),point(face,r,top),point(face,l,top)];
            const inner=[point(face,l,bottom,-.027),point(face,r,bottom,-.027),point(face,r,top,-.027),point(face,l,top,-.027)];
            for(let k=0;k<4;k++){const n=(k+1)%4;m.quad(outer[k],inner[k],inner[n],outer[n],reveal,'concrete');}
            m.quad(inner[0],inner[3],inner[2],inner[1],windowColors[Math.floor(rand(face*71+col,row,63)*windowColors.length)],'glass');
        }
    }
    for(let face=0;face<4;face++)m.rod(point(face,0,lower,.004),point(face,0,upper,.004),.012,'#efecdf',4);

    // Upper east/west service wings grow out of the taper instead of starting
    // at street level. Closed prisms give both wings visible depth from any yaw.
    for(const side of [-1,1]){
        const profile=[[half(4.05),4.05],[.62,4.5],[.62,6.23],[.48,6.43],[half(6.43),6.43]];
        const front=profile.map(([x,y])=>[cx+side*x,base+y,cz-.135]),back=profile.map(([x,y])=>[cx+side*x,base+y,cz+.135]);
        for(let i=1;i<profile.length-1;i++){
            m.tri(front[0],front[side>0?i+1:i],front[side>0?i:i+1],quartz,'stucco');
            m.tri(back[0],back[side>0?i:i+1],back[side>0?i+1:i],'#d5d9cd','stucco');
        }
        for(let i=0;i<profile.length;i++){
            const n=(i+1)%profile.length;
            if(side>0)m.quad(front[i],back[i],back[n],front[n],quartz,'stucco');
            else m.quad(front[n],back[n],back[i],front[i],quartz,'stucco');
        }
        for(let i=0;i<5;i++)m.box(cx+side*.626-(side<0?.009:0),base+5.32+i*.15,cz-.075,.009,.045,.15,'#808f87');
        m.rod(front[2],front[3],.012,'#f0eddf',4);
        m.rod(back[2],back[3],.012,'#e1e4d6',4);
    }

    // The upper quarter is a metal screen, with its own tighter lattice and
    // pale corner rails, rather than more office windows all the way to the tip.
    const metal={metal:.22};
    for(let face=0;face<4;face++){
        panel(face,0,1,upper,tip,'#abb7b0',metal,0,true);
        for(let rib=0;rib<12;rib++){
            const y=upper+(tip-upper)*rib/12,next=upper+(tip-upper)*(rib+1)/12;
            m.rod(point(face,0,y,.005,true),point(face,1,y,.005,true),.006,'#d7ddd0',4,metal);
            for(let col=0;col<3;col++){
                const l=col/3,r=(col+1)/3;
                m.rod(point(face,rib%2?l:r,y,.005,true),point(face,rib%2?r:l,next,.005,true),.0035,'#c6d0c5',4,metal);
            }
        }
        for(let col=0;col<=4;col++)m.rod(point(face,col/4,upper,.006,true),point(face,col/4,tip,.006,true),col===0?.011:.0045,'#e1e5d8',4,metal);
    }
    m.cylinder(cx,base+tip,cz,.013,.06,'#ede8d4',8,.005,{emissive:.2});
}
