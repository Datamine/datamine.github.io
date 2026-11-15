import {pose} from './geometry.js';

/** Turned metal profiles, curved arms and opal globes, kept in the static mesh. */
export function drawStreetLamp(m,x,base,z,angle,style=0){
    const green='#426d65',edge='#65877a',brass='#bca36a',metal={metal:.24},glass={emissive:.85},heads=[];
    const profile=(cx,cz,points,color=green)=>{
        for(let i=1;i<points.length;i++){const [y,r]=points[i-1],[yy,rr]=points[i];m.cylinder(cx,y,cz,r,yy-y,color,24,rr,metal);}
    };
    const curve=(a,b,c,d,r=.03)=>{
        let previous=a;
        for(let i=1;i<=16;i++){const t=i/16,s=1-t,p=a.map((v,k)=>s*s*s*v+3*s*s*t*b[k]+3*s*t*t*c[k]+t*t*t*d[k]);m.rod(previous,p,r,green,12,metal);previous=p;}
    };
    pose(m,x,base,z,angle,()=>{
        profile(0,0,[[0,.105],[.035,.115],[.09,.105],[.12,.09],[.18,.085],[.22,.07],[.29,.066],[.34,.054],[.43,.048],[1.86,.035],[1.9,.053],[1.96,.053],[2.0,.035]]);
        for(let i=0;i<12;i++){const a=i*Math.PI/6;m.rod([Math.cos(a)*.047,.43,Math.sin(a)*.047],[Math.cos(a)*.036,1.82,Math.sin(a)*.036],.0055,edge,5);}
        profile(0,0,[[.20,.071],[.22,.073],[.235,.067]],brass);
        if(style===0){
            for(const side of [-1,1]){
                curve([0,1.94,0],[side*.05,2.24,0],[side*.34,2.04,.045],[side*.3,2.22,.045],.028);
                profile(side*.3,.045,[[2.15,.055],[2.2,.10],[2.23,.11],[2.25,.09]]);
                m.sphere(side*.3,2.43,.045,.185,.205,.185,'#ffe7b9',20,12,glass);
                m.cylinder(side*.3,2.6,.045,.065,.035,brass,20,.025,metal);
                heads.push({x:side*.3,y:2.43,z:.045,radius:.56,strength:.115,poolStrength:.028});
            }
            profile(0,0,[[2.0,.036],[2.17,.025],[2.22,.045],[2.29,0]],brass);
        }else if(style===1){
            curve([0,1.98,0],[0,2.65,-.05],[0,2.76,.49],[0,2.45,.49],.033);
            // A tapered eight-pane lantern, with a domed cap and brass finial.
            profile(0,.49,[[2.37,.17],[2.4,.195],[2.44,.17],[2.51,.085],[2.54,.025]]);
            profile(0,.49,[[1.99,.035],[2.04,.105],[2.07,.12],[2.10,.105]]);
            for(let i=0;i<8;i++){
                const a=i*Math.PI/4,b=(i+1)*Math.PI/4,at=(t,y,r)=>[Math.cos(t)*r,y,.49+Math.sin(t)*r];
                m.quad(at(a,2.09,.105),at(b,2.09,.105),at(b,2.375,.15),at(a,2.375,.15),'#ffe0a3',glass);
                m.rod(at(a,2.075,.11),at(a,2.39,.155),.011,edge,6,metal);
            }
            m.sphere(0,2.0,.49,.036,.055,.036,brass,12,6,metal);
            heads.push({x:0,y:2.235,z:.49,radius:.51,strength:.13,poolStrength:.04});
        }else{
            profile(0,0,[[2.0,.035],[2.04,.095],[2.08,.12],[2.12,.105]]);
            m.sphere(0,2.32,0,.21,.245,.21,'#ffebc7',24,14,glass);
            m.cylinder(0,2.53,0,.065,.045,brass,20,.015,metal);
            heads.push({x:0,y:2.32,z:0,radius:.59,strength:.12,poolStrength:.045});
        }
    });
    const c=Math.cos(angle),s=Math.sin(angle);
    return heads.map(p=>({...p,x:x+p.x*c-p.z*s,y:base+p.y,z:z+p.x*s+p.z*c,color:[1,.71,.34]}));
}

/** One additive, depth-tested draw for all soft halos and terrain-following
 * light pools. No full-screen blur, render targets, textures or per-light draws. */
export function createLampGlow(gl){
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec3 aPosition,aColor;attribute vec2 aUV;attribute float aRadius,aStrength;uniform mat4 uVP;uniform vec3 uRight,uUp,uEye;varying vec2 vUV;varying vec3 vColor;varying float vStrength,vDistance;void main(){vec3 p=aPosition+(uRight*aUV.x+uUp*aUV.y)*aRadius;gl_Position=uVP*vec4(p,1.);vUV=aUV;vColor=aColor;vStrength=aStrength;vDistance=distance(p,uEye);}`));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec2 vUV;varying vec3 vColor;varying float vStrength,vDistance;void main(){float r=dot(vUV,vUV);if(r>1.)discard;float halo=exp(-r*4.5)*(1.-smoothstep(.6,1.,r))+exp(-r*34.)*.6;float fade=1.-smoothstep(28.,60.,vDistance);gl_FragColor=vec4(vColor,halo*vStrength*fade);}`));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const attributes=[['aPosition',3,0],['aUV',2,12],['aColor',3,20],['aRadius',1,32],['aStrength',1,36]].map(([name,size,offset])=>({location:gl.getAttribLocation(program,name),size,offset}));
    const uniforms=Object.fromEntries(['uVP','uRight','uUp','uEye'].map(name=>[name,gl.getUniformLocation(program,name)])),buffer=gl.createBuffer();
    const stats={lights:0,triangles:0};let count=0;
    function setLights(lights,terrainHeight){
        const data=[],vertex=(p,uv,light,radius,strength)=>data.push(...p,...uv,...light.color,radius,strength);
        // Quarter-unit cells conform to the same height triangles as the ground.
        for(const light of lights){
            const r=1.08,step=.25,loX=Math.floor((light.x-r)/step),hiX=Math.ceil((light.x+r)/step),loZ=Math.floor((light.z-r)/step),hiZ=Math.ceil((light.z+r)/step);
            const ground=(ix,iz)=>{const x=ix*step,z=iz*step;return {p:[x,terrainHeight(x,z)+.077,z],uv:[(x-light.x)/r,(z-light.z)/r]};};
            for(let z=loZ;z<hiZ;z++)for(let x=loX;x<hiX;x++){
                if(Math.hypot((x+.5)*step-light.x,(z+.5)*step-light.z)>r+step)continue;
                const a=ground(x,z),b=ground(x+1,z),c=ground(x+1,z+1),d=ground(x,z+1);
                for(const v of [a,c,b,a,d,c])vertex(v.p,v.uv,light,0,light.poolStrength);
            }
        }
        for(const light of lights)for(const uv of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]])vertex([light.x,light.y,light.z],uv,light,light.radius,light.strength);
        count=data.length/10;stats.lights=lights.length;stats.triangles=count/3;
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    }
    function draw(camera){
        if(!count)return false;
        gl.useProgram(program);gl.uniformMatrix4fv(uniforms.uVP,false,camera.matrix);gl.uniform3fv(uniforms.uRight,camera.right);gl.uniform3fv(uniforms.uUp,camera.up);gl.uniform3fv(uniforms.uEye,camera.eye);
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        for(const a of attributes){gl.enableVertexAttribArray(a.location);gl.vertexAttribPointer(a.location,a.size,gl.FLOAT,false,40,a.offset);}
        gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.drawArrays(gl.TRIANGLES,0,count);
        gl.depthMask(true);gl.disable(gl.BLEND);for(const a of attributes)gl.disableVertexAttribArray(a.location);
        return true;
    }
    return {setLights,draw,stats};
}
// The crown is a procedural light installation behind the top-floor glazing.
// Periodic distances join its six drifting metaballs around the whole tower.
// It uses the existing time uniform and static mesh: no frame uploads or pass.
export const SALESFORCE_CROWN_GLSL=`
    if(vUV.x>-.6&&vUV.x<-.4){
        float around=(vUV.x+.58)/.16,angle=around*6.2831853,height=clamp(vUV.y,0.,1.),time=uTime*.18;
        vec2 uv=vec2(around,height);
        float field=0.;vec3 wax=vec3(0.);
        for(int i=0;i<6;i++){
            float seed=float(i),phase=seed*2.39996;
            vec2 center=vec2(seed/6.+sin(time*.37+phase)*.12,.48+sin(time*.63+phase)*.57);
            vec2 delta=vec2(sin((uv.x-center.x)*3.1415927)*1.1,(uv.y-center.y)*1.1);
            float radius=.26+.04*sin(time*.5+phase),weight=radius*radius/(dot(delta,delta)+.006);
            vec3 color=mix(vec3(.57,.73,.79),vec3(.69,.83,.87),.5+.5*sin(phase+time*.11));
            field+=weight;wax+=color*weight;
        }
        wax/=max(field,.001);
        vec3 background=mix(vec3(.39,.55,.61),vec3(.44,.6,.66),height);
        vec3 col=mix(background,wax,smoothstep(.85,1.3,field)*.55);
        col+=wax*min(field*.012,.035);
        col=mix(col,vec3(.77,.87,.9),smoothstep(2.5,6.,field)*.1);
        float mullion=pow(.5+.5*cos(angle*40.),24.),floorLine=pow(.5+.5*cos(height*37.699112),32.);
        col*=1.-mullion*.14-floorLine*.08;
        float rim=pow(1.-abs(dot(normalize(vNormal),normalize(uEye-vWorld))),3.);
        col+=vec3(.045,.065,.075)*rim;
        float fog=smoothstep(50.,115.,vDistance);
        gl_FragColor=vec4(mix(col,vec3(.59,.72,.74),fog*.7),1.);return;
    }
`;

