import {pose,unit} from './geometry.js';
import {drawFacadeWindow} from './windows.js';

// Exterior reference: https://media.api.sf.gov/images/SFCityHall.original.png
export const CITY_HALL=Object.freeze({width:4,depth:2.9,height:4.56});

/** Broad granite wings, a columned portico, a tall windowed drum, and a
 * separately profiled copper dome. One static mesh; no new rendering passes. */
export function drawCityHall(m,cx,base,cz){
    const stone='#c9cdc5',pale='#e0dfce',shade='#a3ada4',gold='#c8af69',metal={metal:.18};
    const start=m.data.length;
    pose(m,cx,base,cz,0,()=>{
        m.box(-2.1,0,-1.4,4.2,.1,2.8,shade,'stone');
        m.box(-2.03,.1,-1.32,4.06,1.4,2.5,stone,'stone');
        // The central pavilion projects from the lower wings.
        m.box(-.67,.1,-1.33,1.34,1.57,2.62,stone,'stone');
        for(const z of [-1.32,1.18])for(const x of [-1.77,-1.35,-.93,.93,1.35,1.77]){
            drawFacadeWindow(m,{plane:z,along:x-.105,y:.29,w:.21,h:.39,far:z<0,trim:pale,seed:x,style:'office'});
            drawFacadeWindow(m,{plane:z,along:x-.105,y:.9,w:.21,h:.43,far:z<0,trim:pale,seed:x+7,style:'office'});
        }
        for(const side of [-1,1])for(const z of [-.98,-.48,.02,.52])for(const y of [.3,.91])drawFacadeWindow(m,{isX:true,plane:side*2.03,along:z,y,w:.23,h:.4,far:side<0,trim:pale,seed:z+side,style:'office'});
        // Rusticated base, string course, cornice, and a roof balustrade.
        for(const y of [.17,.77,1.43]){
            m.box(-2.045,y,-1.335,4.09,.055,.045,pale);
            m.box(-2.045,y,1.17,4.09,.055,.055,pale);
            for(const x of [-2.045,2.005])m.box(x,y,-1.32,.04,.055,2.5,pale);
        }
        m.box(-2.08,1.5,-1.37,4.16,.09,2.6,pale,'stone');
        m.box(-1.99,1.59,-1.28,3.98,.025,2.42,'#818f88','roof');
        for(const z of [-1.32,1.18]){
            for(let i=0;i<28;i++){
                const x=-1.98+i*3.96/27;if(Math.abs(x)<.75)continue;
                m.box(x-.022,1.6,z,.044,.15,.045,pale);
                m.box(x-.025,1.35,z-.01,.05,.07,.07,pale);
            }
            for(const x of [-2.04,.74])m.box(x,1.75,z-.015,1.3,.035,.075,pale);
        }
        for(const side of [-1,1])for(const x of [-.48,0,.48]){
            const z=side>0?1.292:-1.33;
            drawFacadeWindow(m,{plane:z,along:x-.12,y:.21,w:.24,h:.59,far:side<0,trim:shade,style:'storefront',seed:18+x});
        }
        // Paired columns support a closed triangular pediment on each facade.
        for(const side of [-1,1]){
            const z=side>0?1.25:-1.28;
            for(const x of [-.6,-.36,.36,.6]){
                m.box(x-.057,.17,z-.057,.114,.09,.114,pale,'stone');
                m.cylinder(x,.26,z,.039,1.15,pale,12,.033,'stone');
                m.cylinder(x,1.4,z,.055,.075,pale,12);
                m.box(x-.063,1.475,z-.063,.126,.045,.126,pale);
            }
            m.box(-.75,1.52,z-.08,1.5,.13,.16,pale,'stone');
            const front=z+side*.095,back=z-side*.08;
            for(const zz of [front,back])m.tri([-.78,1.67,zz],[.78,1.67,zz],[0,1.99,zz],pale,'stone');
            for(const x of [-.78,.78])m.quad([x,1.67,front],[x,1.67,back],[0,1.99,back],[0,1.99,front],pale);
            m.sphere(0,1.77,front+side*.012,.085,.065,.016,gold,12,6,metal);
        }
        for(let i=0;i<4;i++)m.box(-.75-i*.07,.025+i*.035,1.4-i*.035,1.5+i*.14,.035,.035,shade,'stone');
        // The drum is tall enough for the dome to clear the entrance pediment.
        m.cylinder(0,1.7,0,.7,.12,pale,32);
        m.cylinder(0,1.82,0,.6,.81,stone,32);
        for(let i=0;i<16;i++){
            const angle=i*Math.PI/8,s=Math.sin(angle),c=Math.cos(angle),opening=angle+Math.PI/16;
            pose(m,Math.sin(opening)*.614,1.97,Math.cos(opening)*.614,-opening,()=>{
                drawFacadeWindow(m,{plane:0,along:-.07,y:0,w:.14,h:.43,trim:pale,seed:i,style:'sash'});
            });
            m.cylinder(s*.644,1.85,c*.644,.026,.79,pale,10,.023);
            m.cylinder(s*.644,2.59,c*.644,.04,.055,gold,10);
        }
        m.cylinder(0,2.64,0,.69,.095,pale,32);
        m.cylinder(0,2.735,0,.68,.035,gold,32,.68,metal);
        const profile=[[.665,2.77],[.65,2.94],[.6,3.17],[.51,3.43],[.38,3.66],[.22,3.83],[.115,3.9]],segments=32;
        const at=(r,y,a,extra=0)=>[Math.sin(a)*(r+extra),y,Math.cos(a)*(r+extra)];
        for(let row=0;row<profile.length-1;row++)for(let i=0;i<segments;i++){
            const [r,y]=profile[row],[rr,yy]=profile[row+1],a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments,start=m.data.length;
            m.quad(at(r,y,a),at(r,y,b),at(rr,yy,b),at(rr,yy,a),i%4?'#657f80':'#718c8b',metal);
            for(let v=start;v<m.data.length;v+=11){const p=m.data.slice(v,v+3),r0=Math.hypot(p[0],p[2]),n=unit([p[0]/r0,(r-rr)/(yy-y),p[2]/r0]);for(let k=0;k<3;k++)m.data[v+3+k]=n[k];}
        }
        // Thin gilded ribs follow the dome, rather than floating as straight rods.
        for(let i=0;i<16;i++)for(let j=1;j<profile.length;j++){
            const [r,y]=profile[j-1],[rr,yy]=profile[j],a=i*Math.PI/8;
            m.quad(at(r,y,a-.009,.006),at(r,y,a+.009,.006),at(rr,yy,a+.009,.006),at(rr,yy,a-.009,.006),gold,metal);
        }
        m.cylinder(0,3.9,0,.15,.09,gold,16,.14,metal);
        m.cylinder(0,3.99,0,.1,.23,'#607c7b',16,.1,metal);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;m.cylinder(Math.sin(a)*.115,4,Math.cos(a)*.115,.012,.23,pale,6);}
        m.cylinder(0,4.22,0,.155,.055,gold,16,.14,metal);
        m.sphere(0,4.29,0,.14,.12,.14,'#698685',20,8,metal);
        m.cylinder(0,4.39,0,.035,.11,gold,12,.019,metal);m.sphere(0,4.52,0,.032,.04,.032,gold,12,6,metal);
    });
    // Fit the wing span between Civic Center's existing parallel streets.
    const scale=CITY_HALL.width/4.4;
    for(let i=start;i<m.data.length;i+=11){m.data[i]=cx+(m.data[i]-cx)*scale;const n=unit([m.data[i+3]/scale,m.data[i+4],m.data[i+5]]);for(let k=0;k<3;k++)m.data[i+3+k]=n[k];}
}
