import { requiredValue } from './types/assert.ts';
interface LampLight {
  x: number;
  y: number;
  z: number;
  color: readonly number[];
  radius: number;
  strength: number;
  poolStrength: number;
}
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

/** Turned metal profiles, curved arms and opal globes, kept in the static mesh. */
export function drawStreetLamp(
  m: Mesh,
  x: number,
  base: number,
  z: number,
  angle: number,
  style = 0,
) {
  const modern = style >= 3,
    green = style === 3 ? '#526773' : style === 4 ? '#8b9c99' : '#426d65',
    edge = modern ? '#bcc9c5' : '#65877a',
    brass = modern ? '#c1cbc4' : '#bca36a',
    metal = { metal: 0.24 },
    glass = { emissive: 0.85 },
    heads: {
      x: number;
      y: number;
      z: number;
      radius: number;
      strength: number;
      poolStrength: number;
    }[] = [];
  const profile = (
    cx: number,
    cz: number,
    points: readonly (readonly [number, number])[],
    color = green,
  ) => {
    for (let i = 1; i < points.length; i++) {
      const [y, r] = points[i - 1],
        [yy, rr] = points[i];
      m.cylinder(cx, y, cz, r, yy - y, color, 24, rr, metal);
    }
  };
  const curve = (a: number[], b: number[], c: number[], d: number[], r = 0.03) => {
    let previous = a;
    for (let i = 1; i <= 16; i++) {
      const t = i / 16,
        s = 1 - t,
        p = a.map(
          (v, k) => s * s * s * v + 3 * s * s * t * b[k] + 3 * s * t * t * c[k] + t * t * t * d[k],
        );
      m.rod(previous, p, r, green, 12, metal);
      previous = p;
    }
  };
  pose(m, x, base, z, angle, () => {
    if (modern) {
      profile(0, 0, [
        [0, 0.095] satisfies [number, number],
        [0.08, 0.095] satisfies [number, number],
        [0.15, 0.057] satisfies [number, number],
        [0.24, 0.052] satisfies [number, number],
        [2.42, 0.026] satisfies [number, number],
      ]);
      m.box(-0.031, 0.65, -0.061, 0.062, 0.19, 0.025, edge, metal);
    } else {
      profile(0, 0, [
        [0, 0.105] satisfies [number, number],
        [0.035, 0.115] satisfies [number, number],
        [0.09, 0.105] satisfies [number, number],
        [0.12, 0.09] satisfies [number, number],
        [0.18, 0.085] satisfies [number, number],
        [0.22, 0.07] satisfies [number, number],
        [0.29, 0.066] satisfies [number, number],
        [0.34, 0.054] satisfies [number, number],
        [0.43, 0.048] satisfies [number, number],
        [1.86, 0.035] satisfies [number, number],
        [1.9, 0.053] satisfies [number, number],
        [1.96, 0.053] satisfies [number, number],
        [2.0, 0.035] satisfies [number, number],
      ]);
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        m.rod(
          [Math.cos(a) * 0.047, 0.43, Math.sin(a) * 0.047] satisfies [number, number, number],
          [Math.cos(a) * 0.036, 1.82, Math.sin(a) * 0.036] satisfies [number, number, number],
          0.0055,
          edge,
          5,
        );
      }
      profile(
        0,
        0,
        [
          [0.2, 0.071] satisfies [number, number],
          [0.22, 0.073] satisfies [number, number],
          [0.235, 0.067] satisfies [number, number],
        ],
        brass,
      );
    }
    if (style === 0) {
      for (const side of [-1, 1] satisfies [number, number]) {
        curve(
          [0, 1.94, 0] satisfies [number, number, number],
          [side * 0.05, 2.24, 0] satisfies [number, number, number],
          [side * 0.34, 2.04, 0.045] satisfies [number, number, number],
          [side * 0.3, 2.22, 0.045] satisfies [number, number, number],
          0.028,
        );
        profile(side * 0.3, 0.045, [
          [2.15, 0.055] satisfies [number, number],
          [2.2, 0.1] satisfies [number, number],
          [2.23, 0.11] satisfies [number, number],
          [2.25, 0.09] satisfies [number, number],
        ]);
        m.sphere(side * 0.3, 2.43, 0.045, 0.185, 0.205, 0.185, '#ffe7b9', 20, 12, glass);
        m.cylinder(side * 0.3, 2.6, 0.045, 0.065, 0.035, brass, 20, 0.025, metal);
        heads.push({
          x: side * 0.3,
          y: 2.43,
          z: 0.045,
          radius: 0.56,
          strength: 0.115,
          poolStrength: 0.028,
        });
      }
      profile(
        0,
        0,
        [
          [2.0, 0.036] satisfies [number, number],
          [2.17, 0.025] satisfies [number, number],
          [2.22, 0.045] satisfies [number, number],
          [2.29, 0] satisfies [number, number],
        ],
        brass,
      );
    } else if (style === 1) {
      curve(
        [0, 1.98, 0] satisfies [number, number, number],
        [0, 2.65, -0.05] satisfies [number, number, number],
        [0, 2.76, 0.49] satisfies [number, number, number],
        [0, 2.45, 0.49] satisfies [number, number, number],
        0.033,
      );
      // A tapered eight-pane lantern, with a domed cap and brass finial.
      profile(0, 0.49, [
        [2.37, 0.17] satisfies [number, number],
        [2.4, 0.195] satisfies [number, number],
        [2.44, 0.17] satisfies [number, number],
        [2.51, 0.085] satisfies [number, number],
        [2.54, 0.025] satisfies [number, number],
      ]);
      profile(0, 0.49, [
        [1.99, 0.035] satisfies [number, number],
        [2.04, 0.105] satisfies [number, number],
        [2.07, 0.12] satisfies [number, number],
        [2.1, 0.105] satisfies [number, number],
      ]);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4,
          b = ((i + 1) * Math.PI) / 4,
          at = (t: number, y: number, r: number) =>
            [Math.cos(t) * r, y, 0.49 + Math.sin(t) * r] satisfies [number, number, number];
        m.quad(
          at(a, 2.09, 0.105),
          at(b, 2.09, 0.105),
          at(b, 2.375, 0.15),
          at(a, 2.375, 0.15),
          '#ffe0a3',
          glass,
        );
        m.rod(at(a, 2.075, 0.11), at(a, 2.39, 0.155), 0.011, edge, 6, metal);
      }
      m.sphere(0, 2.0, 0.49, 0.036, 0.055, 0.036, brass, 12, 6, metal);
      heads.push({ x: 0, y: 2.235, z: 0.49, radius: 0.51, strength: 0.13, poolStrength: 0.04 });
    } else if (style === 3) {
      // Slim contemporary cobra head, with a recessed cool-white lens.
      curve(
        [0, 2.35, 0] satisfies [number, number, number],
        [0, 2.68, 0.08] satisfies [number, number, number],
        [0, 2.67, 0.55] satisfies [number, number, number],
        [0, 2.61, 0.86] satisfies [number, number, number],
        0.026,
      );
      m.sphere(0, 2.59, 0.89, 0.12, 0.055, 0.26, green, 18, 8, metal);
      m.box(-0.089, 2.536, 0.72, 0.178, 0.014, 0.34, '#e9f2ed', glass);
      for (const z of [0.76, 0.84, 0.92, 1] satisfies [number, number, number, number])
        m.box(-0.07, 2.533, z, 0.14, 0.004, 0.008, '#c8dee0', glass);
      heads.push({ x: 0, y: 2.53, z: 0.89, radius: 0.48, strength: 0.105, poolStrength: 0.037 });
    } else if (style === 4) {
      // Brushed steel twin pendants: compact heads and swept crossarms.
      for (const side of [-1, 1] satisfies [number, number]) {
        m.rod(
          [0, 2.41, 0] satisfies [number, number, number],
          [side * 0.34, 2.53, 0.025] satisfies [number, number, number],
          0.024,
          green,
          10,
          metal,
        );
        m.cylinder(side * 0.34, 2.47, 0.025, 0.11, 0.065, green, 16, 0.085, metal);
        m.sphere(side * 0.34, 2.46, 0.025, 0.086, 0.025, 0.086, '#f7e8ca', 16, 6, glass);
        heads.push({
          x: side * 0.34,
          y: 2.445,
          z: 0.025,
          radius: 0.43,
          strength: 0.09,
          poolStrength: 0.024,
        });
      }
    } else {
      profile(0, 0, [
        [2.0, 0.035] satisfies [number, number],
        [2.04, 0.095] satisfies [number, number],
        [2.08, 0.12] satisfies [number, number],
        [2.12, 0.105] satisfies [number, number],
      ]);
      m.sphere(0, 2.32, 0, 0.21, 0.245, 0.21, '#ffebc7', 24, 14, glass);
      m.cylinder(0, 2.53, 0, 0.065, 0.045, brass, 20, 0.015, metal);
      heads.push({ x: 0, y: 2.32, z: 0, radius: 0.59, strength: 0.12, poolStrength: 0.045 });
    }
  });
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return heads.map((p) => ({
    ...p,
    x: x + p.x * c - p.z * s,
    y: base + p.y,
    z: z + p.x * s + p.z * c,
    color:
      style === 3
        ? ([0.78, 0.89, 1] satisfies [number, number, number])
        : style === 4
          ? ([1, 0.86, 0.64] satisfies [number, number, number])
          : ([1, 0.71, 0.34] satisfies [number, number, number]),
  }));
}

/** One additive, depth-tested draw for all soft halos and terrain-following
 * light pools. No full-screen blur, render targets, textures or per-light draws. */
export function createLampGlow(gl: WebGLRenderingContext) {
  const shader = (type: number, source: string) => {
    const s = requiredValue(gl.createShader(type), 'Lamp shader allocation');
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw Error(gl.getShaderInfoLog(s) || 'Lamp shader compilation failed');
    return s;
  };
  const program = requiredValue(gl.createProgram(), 'Lamp program allocation');
  gl.attachShader(
    program,
    shader(
      gl.VERTEX_SHADER,
      `attribute vec3 aPosition,aColor;attribute vec2 aUV;attribute float aRadius,aStrength;uniform mat4 uVP;uniform vec3 uRight,uUp,uEye;varying vec2 vUV;varying vec3 vColor;varying float vStrength,vDistance;void main(){vec3 p=aPosition+(uRight*aUV.x+uUp*aUV.y)*aRadius;gl_Position=uVP*vec4(p,1.);vUV=aUV;vColor=aColor;vStrength=aStrength;vDistance=distance(p,uEye);}`,
    ),
  );
  gl.attachShader(
    program,
    shader(
      gl.FRAGMENT_SHADER,
      `precision mediump float;varying vec2 vUV;varying vec3 vColor;varying float vStrength,vDistance;void main(){float r=dot(vUV,vUV);if(r>1.)discard;float halo=exp(-r*4.5)*(1.-smoothstep(.6,1.,r))+exp(-r*34.)*.6;float fade=1.-smoothstep(28.,60.,vDistance);gl_FragColor=vec4(vColor,halo*vStrength*fade);}`,
    ),
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(program) || 'Lamp shader link failed');
  const attributes = [
    ['aPosition', 3, 0] satisfies [string, number, number],
    ['aUV', 2, 12] satisfies [string, number, number],
    ['aColor', 3, 20] satisfies [string, number, number],
    ['aRadius', 1, 32] satisfies [string, number, number],
    ['aStrength', 1, 36] satisfies [string, number, number],
  ].map(([name, size, offset]) => ({
    location: gl.getAttribLocation(program, name),
    size,
    offset,
  }));
  const uniforms = Object.fromEntries(
      (['uVP', 'uRight', 'uUp', 'uEye'] satisfies [string, string, string, string]).map((name) => [
        name,
        gl.getUniformLocation(program, name),
      ]),
    ),
    buffer = gl.createBuffer();
  const stats = { lights: 0, triangles: 0 };
  let count = 0;
  function setLights(
    lights: readonly LampLight[],
    terrainHeight: (arg0: number, arg1: number) => number,
  ) {
    const data: number[] = [],
      vertex = (
        p: readonly number[],
        uv: readonly number[],
        light: LampLight,
        radius: number,
        strength: number,
      ) => data.push(...p, ...uv, ...light.color, radius, strength);
    // Quarter-unit cells conform to the same height triangles as the ground.
    for (const light of lights) {
      const r = 1.08,
        step = 0.25,
        loX = Math.floor((light.x - r) / step),
        hiX = Math.ceil((light.x + r) / step),
        loZ = Math.floor((light.z - r) / step),
        hiZ = Math.ceil((light.z + r) / step);
      const ground = (ix: number, iz: number) => {
        const x = ix * step,
          z = iz * step;
        return {
          p: [x, terrainHeight(x, z) + 0.077, z] satisfies [number, number, number],
          uv: [(x - light.x) / r, (z - light.z) / r] satisfies [number, number],
        };
      };
      for (let z = loZ; z < hiZ; z++)
        for (let x = loX; x < hiX; x++) {
          if (Math.hypot((x + 0.5) * step - light.x, (z + 0.5) * step - light.z) > r + step)
            continue;
          const a = ground(x, z),
            b = ground(x + 1, z),
            c = ground(x + 1, z + 1),
            d = ground(x, z + 1);
          for (const v of [a, c, b, a, d, c]) vertex(v.p, v.uv, light, 0, light.poolStrength);
        }
    }
    for (const light of lights)
      for (const uv of [
        [-1, -1] satisfies [number, number],
        [1, -1] satisfies [number, number],
        [1, 1] satisfies [number, number],
        [-1, -1] satisfies [number, number],
        [1, 1] satisfies [number, number],
        [-1, 1] satisfies [number, number],
      ])
        vertex([light.x, light.y, light.z], uv, light, light.radius, light.strength);
    count = data.length / 10;
    stats.lights = lights.length;
    stats.triangles = count / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  }
  function draw(camera: {
    matrix: Iterable<number>;
    right: Iterable<number>;
    up: Iterable<number>;
    eye: Iterable<number>;
  }) {
    if (!count) return false;
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uVP, false, camera.matrix);
    gl.uniform3fv(uniforms.uRight, camera.right);
    gl.uniform3fv(uniforms.uUp, camera.up);
    gl.uniform3fv(uniforms.uEye, camera.eye);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const a of attributes) {
      gl.enableVertexAttribArray(a.location);
      gl.vertexAttribPointer(a.location, a.size, gl.FLOAT, false, 40, a.offset);
    }
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.TRIANGLES, 0, count);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    for (const a of attributes) gl.disableVertexAttribArray(a.location);
    return true;
  }
  return { setLights, draw, stats };
}
// The crown is a procedural light installation behind the top-floor glazing.
// Periodic distances join its six drifting metaballs around the whole tower.
// It uses the existing time uniform and static mesh: no frame uploads or pass.
export const SALESFORCE_CROWN_GLSL = `
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
