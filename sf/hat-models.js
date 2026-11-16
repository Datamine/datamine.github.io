import {Mesh,pose,rgb} from './geometry.js';
import {hatById} from './hat-catalog.js';

const hatGeometryCache=new Map();
/** Head-local original meshes. The same triangles furnish the shop windows
 * and attach to bone 3 on a person; none are screen-space decorations. */
export function getHatGeometry(id){
    if(!hatById(id))return null;if(hatGeometryCache.has(id))return hatGeometryCache.get(id);
    const m=new Mesh(),h=hatById(id),[body,trim,gem]=h.colors;
    const band=(r,y,height,color=trim,rz=r*.87)=>{
        for(let i=0;i<24;i++){
            const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
            m.quad([Math.sin(a)*r,y,Math.cos(a)*rz],[Math.sin(b)*r,y,Math.cos(b)*rz],[Math.sin(b)*r,y+height,Math.cos(b)*rz],[Math.sin(a)*r,y+height,Math.cos(a)*rz],color);
        }
    };
    const brim=(r,y=.035,rz=r*.82)=>{
        for(let i=0;i<24;i++){
            const a=i*Math.PI/12,b=(i+1)*Math.PI/12,A=[Math.sin(a)*r,y,Math.cos(a)*rz],B=[Math.sin(b)*r,y,Math.cos(b)*rz];
            m.tri([0,y,0],B,A,body);m.tri([0,y-.012,0],[A[0],y-.012,A[2]],[B[0],y-.012,B[2]],body);m.quad([A[0],y-.012,A[2]],[B[0],y-.012,B[2]],B,A,body);
        }
    };
    if(id==='paper'){
        const a=[-.18,.01,-.13],b=[.18,.01,-.13],c=[.18,.01,.13],d=[-.18,.01,.13],l=[-.16,.22,0],r=[.16,.22,0];
        m.quad(a,l,r,b,body);m.quad(d,c,r,l,body);m.tri(a,d,l,trim);m.tri(b,r,c,trim);
        for(const z of [-.131,.131])m.quad([-.19,.005,z],[.19,.005,z],[.18,.065,z],[-.18,.065,z],body);
        for(const z of [-.133,.133])for(let i=0;i<4;i++)m.box(-.12+i*.063,.023,z,.04,.005,.002,trim);
    }else if(id==='beanie'){
        m.sphere(0,.055,0,.139,.16,.124,body,16,8);band(.145,.0,.065,trim,.13);
        for(let i=0;i<16;i++){const a=i*Math.PI/8;m.rod([Math.sin(a)*.142,.01,Math.cos(a)*.128],[Math.sin(a)*.142,.064,Math.cos(a)*.128],.003,body,4);}
        m.sphere(0,.213,0,.035,.035,.035,trim,10,5);
    }else if(id==='panama'){
        brim(.25);m.cylinder(0,.035,0,.14,.17,body,24,.125);band(.142,.057,.037,trim,.142);
        m.box(-.055,.2,-.065,.11,.008,.11,trim);
    }else if(id==='beret'){
        m.sphere(.035,.09,-.012,.195,.105,.16,body,20,8);band(.14,.0,.043,trim,.125);m.cylinder(.047,.175,-.025,.015,.045,body,8);
    }else if(id==='top-hat'){
        brim(.215);m.cylinder(0,.035,0,.13,.31,body,24,.15);band(.137,.06,.048);m.cylinder(0,.345,0,.15,.012,body,24,.15);
        m.box(-.025,.065,.139,.05,.038,.012,gem);
    }else if(id==='cavalier'){
        brim(.28,.045);m.sphere(0,.09,-.01,.15,.14,.13,body,16,8);band(.149,.05,.039);
        // Curved feather with a raised quill and individual vanes.
        const points=[[.10,.12,-.015],[.16,.24,-.03],[.15,.37,-.05],[.08,.49,-.065]];
        for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];m.rod(a,b,.007,trim,6);for(const side of [-1,1])m.tri(a,[a[0]+side*.05,a[1]+.065,a[2]+.01],b,gem);}
        m.sphere(.12,.12,.04,.025,.03,.015,trim,10,6);
    }else if(id==='wizard'){
        brim(.245);m.cylinder(0,.035,0,.145,.36,body,24,.045);m.rod([0,.35,0],[.07,.53,.025],.04,body,12);m.sphere(.085,.54,.026,.039,.025,.033,body,12,6);band(.146,.05,.045);
        for(let i=0;i<5;i++){const a=i*Math.PI*2/5,r=.12-i*.014,y=.14+i*.051;m.sphere(Math.sin(a)*r,y,Math.cos(a)*r,.014,.014,.01,trim,8,4);}
        m.sphere(0,.14,.12,.025,.025,.013,gem,10,6);
    }else if(id==='laurel'){
        // Open wreath, rather than a solid cap: the wearer's hair remains visible.
        for(let i=0;i<19;i++){
            const a=.3+i*(Math.PI*2-.6)/18,x=Math.sin(a)*.146,z=Math.cos(a)*.133;
            const b=a+.18;m.rod([x,.035,z],[Math.sin(b)*.146,.035,Math.cos(b)*.133],.009,body,6);
            for(const side of [-1,1]){const tip=[x+Math.sin(a)*side*.04,.08,z+Math.cos(a)*side*.035],l=[x+Math.cos(a)*.025,.047,z-Math.sin(a)*.025],r=[x-Math.cos(a)*.025,.047,z+Math.sin(a)*.025];m.tri([x,.035,z],l,tip,body);m.tri([x,.035,z],tip,r,trim);}
        }
    }else if(id==='crown'){
        band(.145,.0,.11,body,.13);band(.149,.012,.018,trim,.134);band(.149,.085,.016,trim,.134);
        for(let i=0;i<8;i++){
            const a=i*Math.PI/4,A=[Math.sin(a-.23)*.145,.10,Math.cos(a-.23)*.13],B=[Math.sin(a+.23)*.145,.10,Math.cos(a+.23)*.13],tip=[Math.sin(a)*.17,.24+(i%2?0:.035),Math.cos(a)*.15];
            m.tri(A,B,tip,body);m.tri(B,A,[tip[0]*.93,tip[1],tip[2]*.93],trim);m.sphere(...tip,.018,.022,.018,trim,10,6);
            m.sphere(Math.sin(a)*.152,.064,Math.cos(a)*.137,.024,.028,.02,gem,10,6);
        }
        // Raised arches and a sapphire orb.
        for(const axis of [0,1])for(let i=0;i<10;i++){
            const at=j=>{const a=j*Math.PI/10;return axis?[0,.12+Math.sin(a)*.26,Math.cos(a)*.13]:[Math.cos(a)*.145,.12+Math.sin(a)*.26,0];};m.rod(at(i),at(i+1),.012,trim,6);
        }
        m.sphere(0,.4,0,.032,.036,.032,gem,12,7);m.rod([0,.425,0],[0,.49,0],.008,body,6);m.rod([-.022,.47,0],[.022,.47,0],.007,body,6);
    }
    const palette=h.colors.map(rgb),channels=[];
    for(let i=0;i<m.data.length;i+=33){const color=m.data.slice(i+6,i+9);channels.push(palette.findIndex(p=>p.every((c,k)=>Math.abs(c-color[k])<1e-6)));}
    const result={mesh:m,channels};hatGeometryCache.set(id,result);return result;
}
export function drawHatModel(m,id,x,y,z,angle=0,scale=1){
    const model=getHatGeometry(id);if(!model)return;
    pose(m,x,y,z,angle,()=>{const data=model.mesh.data;for(let i=0;i<data.length;i+=11)m.data.push(data[i]*scale,data[i+1]*scale,data[i+2]*scale,...data.slice(i+3,i+11));});
}
