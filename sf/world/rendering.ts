import { isPickTarget } from '../picking.ts';
import { requiredValue } from '../types/assert.ts';
import type { TargetMetadata } from '../types/scene-state.ts';
import type { GeometryGPU, UploadMesh, ShaderProgram } from '../types/rendering.ts';
import type { Actor } from '../types/world.ts';
import type { WorldContext } from './scene.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from '../content-runtime.ts';
import { tigerInteractionTarget, ropeInteractionTarget } from '../interaction-targets.ts';
import { drawHumanNPC } from '../human-npc.ts';
import { createDynamicGeometry } from '../rendering/dynamic-buffer.ts';
import { actorSpeechText } from '../rendering/actor-labels.ts';
import { characterVertexShader, createCharacterGPU } from '../rendering/character-gpu.ts';
import { characterBounds } from '../rendering/character-frame.ts';
import { DOG_PONY_SHOW } from '../dog-pony-layout.ts';
import { drawDogPonyAnimals } from '../dog-pony-show.ts';
import { RENDERING } from '../config/rendering.ts';
import { drawRedwoodLakeLife } from '../redwood-lake-life.ts';
import { SOUTHERN_LAKE } from '../southern-countryside-layout.ts';
import { drawTabletTeleport } from '../teleport-models.ts';
import { DOG_SURFING, drawDogSurfingCompetition } from '../dog-surfing.ts';
import { westernCoastX } from '../coastline.ts';
import { drawBallChair } from '../goblin-town.ts';
import { drawWildMonster } from '../wilderness-models.ts';
import { packStaticMesh, batchInFrustum } from '../static-batches.ts';
import { GLASS_UV, meshGlassTriangles } from '../glazing.ts';
import { TWITTER_HQ } from '../social-layout.ts';
import { drawBottlePostAnimation } from '../bottle-post.ts';
import { drawNeuralLabAnimation } from '../ai-lab-interior.ts';
import {
  createMaterialTexture,
  createSignTexture,
  MATERIAL_ATLAS,
  MATERIAL_IDS,
} from '../materials.ts';
import { createAlpineTexture, ALPINE_TEXTURE_GLSL } from '../alpine-materials.ts';
import {
  Mesh,
  sub,
  dot,
  cross,
  unit,
  matrixMultiply,
  rayBox,
  pose,
  cutawayWallMask,
} from '../geometry.ts';
import { SF_SHADOW_GLSL } from '../shadows.ts';
import { drawCoastalSeagulls } from '../western-coast-details.ts';
import { createLampGlow, SALESFORCE_CROWN_GLSL } from '../lighting.ts';
import { drawOffshoreSea } from '../environment.ts';
import { AIRSHIP_TERMINAL, drawAirship } from '../airship.ts';
import { SF_SPACEPORT } from '../southern-district.ts';
import { JURASSIC, PEQUOD } from '../jurassic-layout.ts';
import {
  drawRaptorGate,
  drawVelociraptor,
  drawCow,
  drawSpectre,
  drawPequod,
  drawKraken,
  drawRailgun,
  drawBeam,
  drawExpeditionLoot,
  drawKrakenCape,
} from '../jurassic-models.ts';
import { applyForwardRollMesh } from '../forward-roll.ts';
import { drawDeliveryCooler } from '../deli.ts';
import { drawGymExercise } from '../gym-exercises.ts';
import { drawFerrari } from '../ferrari.ts';
import { drawBenchPress } from '../adventure-sites.ts';
import { SF_FITNESS } from '../southern-layout.ts';
import { BILLBOARD_ART } from '../billboards.ts';
import { RESEARCH_ART } from '../research-art.ts';
import { RESEARCH_CAMPUSES } from '../research-layout.ts';
import { instituteHiddenSections } from '../institute-interiors.ts';
import { drawDroppedSunglasses } from '../sunglasses.ts';
import { drawPlayerSkateboard } from '../skateboard.ts';
import { drawNavyShip, NAVY_SHIP } from '../shipyard.ts';
import { drawParrot } from '../parrots.ts';
import { swayCharacter } from '../inebriation.ts';
import { drawRehabilitationLaser } from '../rehabilitation.ts';
import { drawFishingSpot, drawFishingRod, drawFishBucket } from '../fishing.ts';
import { drawMotorcycle, pitchMotorcycleMesh } from '../motorcycle.ts';
import { inPacificaPark } from '../southern-expansion.ts';
import { drawReusableRocket, tiltRocketMesh, rocketFlightPoint } from '../rocket.ts';
import {
  nearTahoe,
  drawGondolaCabin,
  drawSkiRider,
  drawRegionalBackdrop,
  SNOW_SURFACE_GLSL,
} from '../tahoe.ts';
import { drawAirshipRope } from '../airship-rope.ts';
import { AIRSHIP_BASKET } from '../airship-basket.ts';
import { MERCHANTS } from '../economy.ts';
import { ILLUMINATI_CAVE } from '../map-instances.ts';
import { drawDrinkingCoffee } from '../bank-models.ts';
import {
  drawStealthBomber,
  drawSecretStair,
  drawBombEffect,
  drawParachute,
  drawBomberCrash,
} from '../illuminati-models.ts';
import { PROMETHEUS, drawPrometheusFlame } from '../prometheus.ts';
import { RESTAURANTS, drawRestaurantDiners } from '../restaurants.ts';
import { drawEstateResidents } from '../estate-life.ts';
import { drawStreetcar } from '../life.ts';
import { drawTrafficSignalLights, drawSlowBus } from '../transit-models.ts';
import { drawBeachSand } from '../gpu-factory.ts';
import { CHARACTER_CLIPS } from '../characters.ts';
import { characterAppearance } from '../character-config.ts';
import { NIGHTLIFE, inNightlife, drawNightlife } from '../nightlife.ts';
import { collapseCharacterMesh } from '../capture-animation.ts';
import { drawZooAnimals, drawMonkey } from '../zoo-animals.ts';
import { SF_ZOO, drawTigerGate, drawTiger, drawAnimalControlNet } from '../zoo.ts';
import { drawWindsurfer } from '../windsurfing.ts';
import { drawWaveSurfer, drawPacificaWaves } from '../surfing.ts';

/** Rendering services for the browser scene.
 * Dependencies are explicit live scene bindings, preserving initialization
 * order without globals. This module only reads bindings when a method runs. */
export function createRendering(context: WorldContext) {
  function initGPU() {
    const compile = (type: number, source: string) => {
      const shader = context.gl.createShader(type);
      if (!shader) throw new Error('Unable to allocate a WebGL shader.');
      context.gl.shaderSource(shader, source);
      context.gl.compileShader(shader);
      if (!context.gl.getShaderParameter(shader, context.gl.COMPILE_STATUS))
        throw new Error(context.gl.getShaderInfoLog(shader) || 'Shader compilation failed.');
      return shader;
    };
    context.program = context.gl.createProgram() as ShaderProgram;
    context.characterGPU?.dispose();
    context.characterGPU = null;
    let gpuSkinning =
      context.gl.getParameter(context.gl.MAX_VERTEX_UNIFORM_VECTORS) >= 96 &&
      context.gl.getParameter(context.gl.MAX_VERTEX_ATTRIBS) >= 5 &&
      new URL(location.href).searchParams.get('characterRenderer') !== 'cpu';
    const vertexSource = `attribute vec3 aPosition,aNormal,aColor;attribute vec2 aUV;uniform mat4 uVP,uLightVP;uniform vec3 uEye;varying vec3 vColor,vWorld,vNormal;varying vec2 vUV;varying vec4 vShadow;varying float vDistance,vBillboard;void main(){vBillboard=aUV.x>=0.&&aColor.r>1.05?1.:0.;float light=.69+.31*max(dot(normalize(aNormal),normalize(vec3(-.5,.9,.35))),0.);bool room=abs(aUV.x+1.05)<.025;bool emissive=aUV.x> -1.3&&aUV.x< -1.1;vColor=aColor*mix(light,room?.9:.97,room?1.:emissive?clamp(aUV.y,0.,1.):0.);if(vBillboard>.5)vColor=vec3(1.);vUV=aUV;vWorld=aPosition;vNormal=aNormal;vDistance=distance(aPosition,uEye);vShadow=uLightVP*vec4(aPosition,1.);gl_Position=uVP*vec4(aPosition,1.);}`;
    let vertexShader;
    try {
      vertexShader = compile(
        context.gl.VERTEX_SHADER,
        gpuSkinning ? characterVertexShader(vertexSource) : vertexSource,
      );
    } catch (error) {
      if (!gpuSkinning) throw error;
      gpuSkinning = false;
      console.warn('GPU character animation unavailable; using the CPU renderer.', error);
      vertexShader = compile(context.gl.VERTEX_SHADER, vertexSource);
    }
    context.gl.attachShader(context.program, vertexShader);
    const precision = context.gl.getShaderPrecisionFormat(
        context.gl.FRAGMENT_SHADER,
        context.gl.HIGH_FLOAT,
      )?.precision
        ? 'highp'
        : 'mediump',
      glassStyle = -2 - MATERIAL_IDS.glass;
    context.gl.attachShader(
      context.program,
      compile(
        context.gl.FRAGMENT_SHADER,
        `precision ${precision} float;uniform sampler2D uAtlas,uMaterials,uShadowMap,uAlpineSnow,uAlpineGroom,uAlpineRock,uAlpineForest;uniform float uShadows,uTime,uGlassPass;uniform vec3 uEye,uFocus;varying vec3 vColor,vWorld,vNormal;varying vec2 vUV;varying vec4 vShadow;varying float vDistance,vBillboard;${ALPINE_TEXTURE_GLSL}${SF_SHADOW_GLSL}void main(){vec3 col=vColor;
            bool clearGlass=abs(vUV.x-(${GLASS_UV}))<.015;
            if(clearGlass!=(uGlassPass>.5))discard;
            if(clearGlass){
                vec3 view=normalize(uEye-vWorld),normal=normalize(vNormal);
                float fresnel=pow(1.-abs(dot(normal,view)),3.);
                float shine=pow(max(dot(reflect(-normalize(vec3(-.5,.9,.35)),normal),view),0.),56.);
                vec3 tint=mix(vColor,vec3(.72,.84,.88),.28+fresnel*.35)+shine*.12;
                float fog=smoothstep(50.,115.,vDistance);
                gl_FragColor=vec4(mix(tint,vec3(.59,.72,.74),fog*.7),clamp(vUV.y+fresnel*.12+shine*.04,.06,.28));return;
            }
            ${SALESFORCE_CROWN_GLSL}
            if(vUV.x> -1.9&&vUV.x< -1.5){
                if(vUV.y>9.5){
                    float r=sin(vWorld.x*9.+sin(vWorld.z*6.+uTime*.3))*sin(vWorld.z*11.-uTime*.25);
                    col=vColor*(.96+.025*r)+vec3(.025,.028,.02)*pow(max(0.,r),12.);
                    col*=1.-sfShadow(vShadow,.0007)*.16;
                    gl_FragColor=vec4(col,1.);return;
                }
                if(vUV.y>3.5){
                    vec2 plane=vWorld.xz+vec2(sin(vWorld.z*7.+uTime*.7),cos(vWorld.x*6.-uTime*.6))*.006;
                    vec2 cell=vec2(${MATERIAL_IDS.poolMosaic % MATERIAL_ATLAS.columns}.,${Math.floor(MATERIAL_IDS.poolMosaic / MATERIAL_ATLAS.columns)}.);
                    vec3 tile=texture2D(uMaterials,(cell+vec2(.008)+fract(plane)*.984)/vec2(${MATERIAL_ATLAS.columns}.,${MATERIAL_ATLAS.rows}.)).rgb;
                    float ripple=sin(vWorld.x*12.+sin(vWorld.z*9.+uTime*.8))*sin(vWorld.z*11.-uTime*.65);
                    col=mix(tile*vec3(.35,.69,.69),vec3(.36,.72,.72),.43)+vec3(.09,.10,.07)*pow(max(0.,ripple),8.);
                    col*=1.-sfShadow(vShadow,.0007)*.18;
                    gl_FragColor=vec4(col,1.);return;
                }
                float lake=step(1.5,vUV.y),depth=clamp(vUV.y,0.,1.),time=uTime*(1.-lake*.65);
                float a=vWorld.x*1.6+vWorld.z*.83-time*.65+sin(vWorld.z*.31)*.7,b=vWorld.x*.6-vWorld.z*2.1+time*.45+sin(vWorld.x*.22)*.8,c=vWorld.x*4.2+vWorld.z*3.7+time*.18;
                vec3 n=normalize(vec3(-cos(a)*.064-cos(b)*.024,1.,-cos(a)*.033+cos(b)*.084));
                vec3 view=normalize(uEye-vWorld);float fresnel=pow(1.-max(dot(n,view),0.),3.);
                vec3 deep=mix(vec3(.14,.33,.42),vec3(.19,.39,.44),smoothstep(20.,60.,vWorld.x));
                col=mix(vec3(.32,.55,.54),deep,depth);col=mix(col,vec3(.28,.43,.4),lake*.55);
                col=mix(col,vec3(.57,.7,.72),fresnel*.6)+(sin(a)+sin(b)*.45+sin(c)*.12)*.018;
                float shine=pow(max(dot(reflect(-normalize(vec3(-.5,.9,.35)),n),view),0.),48.);col+=vec3(.69,.76,.7)*shine*.32;
                float surf=(1.-smoothstep(.025,.23,depth))*(.5+.5*sin(time*1.1+vWorld.x*.9+vWorld.z*.6-depth*24.));col+=vec3(.22,.25,.22)*surf;
                col*=1.-sfShadow(vShadow,.0007)*.1;
                float fog=smoothstep(50.,150.,length(uEye-vWorld));gl_FragColor=vec4(mix(col,vec3(.59,.72,.74),fog*.7),1.);return;
            }
            bool envelope=abs(vUV.x+1.)<.025&&vUV.y< -7.;
            if(envelope){vec3 sight=normalize(uEye-uFocus),delta=vWorld-uFocus;float along=dot(delta,sight),radius=length(delta-sight*along);if(along>0.&&radius<1.15){float opacity=smoothstep(.98,1.06,radius),pattern=fract(dot(mod(floor(gl_FragCoord.xy),4.),vec2(.25,.5625)));if(pattern>=opacity)discard;}}
            if(vUV.x>=0.){col*=texture2D(uAtlas,vUV).rgb;if(vBillboard>.5){float fog=smoothstep(50.,115.,vDistance);gl_FragColor=vec4(mix(col,vec3(.59,.72,.74),fog*.7),1.);return;}}
            ${SNOW_SURFACE_GLSL}
            else if(envelope){col*=.99+.01*sin(dot(vWorld,vec3(17.,31.,13.)));}
            else if(vUV.x< -1.5){float kind=envelope?${MATERIAL_IDS.stucco}.:-vUV.x-2.;vec3 n=abs(vNormal);vec2 plane=n.y>.65?vWorld.xz:n.x>n.z?vec2(vWorld.z,-vWorld.y):vec2(vWorld.x,-vWorld.y);if(!envelope&&n.y>.65&&abs(vUV.y)>.001){float c=cos(vUV.y),s=sin(vUV.y);plane=vec2(vWorld.x*c+vWorld.z*s,-vWorld.x*s+vWorld.z*c);}vec2 cell=vec2(mod(kind,${MATERIAL_ATLAS.columns}.),floor(kind/${MATERIAL_ATLAS.columns}.));vec2 uv=fract(plane);col*=texture2D(uMaterials,(cell+vec2(.008)+uv*.984)/vec2(${MATERIAL_ATLAS.columns}.,${MATERIAL_ATLAS.rows}.)).rgb*1.08;}
            if(abs(vUV.x-(${glassStyle}.))<.5){float f=pow(1.-abs(dot(normalize(vNormal),normalize(uEye-vWorld))),3.);col=mix(col,vec3(.52,.64,.66),.12+f*.3);}
            float shade=sfShadow(vShadow,.0006);col*=1.-shade*.23;
            if(abs(vUV.x+1.05)<.025){float ambient=clamp(vUV.y,0.,1.),f=pow(1.-abs(dot(normalize(vNormal),normalize(uEye-vWorld))),3.);col=mix(vColor*.89,vColor*vec3(1.03,1.,.96)+vec3(.11,.085,.045),ambient);col+=vec3(.12,.17,.18)*f*.16;}
            bool emissive=vUV.x> -1.3&&vUV.x< -1.1;
            if(emissive){float facing=abs(dot(normalize(vNormal),normalize(uEye-vWorld)));vec3 lit=mix(vColor*vec3(1.,.94,.84),vec3(1.,.98,.87),pow(facing,2.)*.62);col=mix(col,lit,clamp(vUV.y,0.,1.));}
            else if(vUV.x> -1.5&&vUV.x< -1.3){vec3 halfVector=normalize(normalize(uEye-vWorld)+normalize(vec3(-.5,.9,.35)));float shine=pow(max(dot(normalize(vNormal),halfVector),0.),44.);col+=vec3(.98,.93,.78)*shine*vUV.y*(1.-shade*.7);}
            float luminance=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(luminance),col,1.12);float fog=smoothstep(50.,115.,vDistance);gl_FragColor=vec4(mix(col,vec3(.59,.72,.74),fog*.7),1.);}`,
      ),
    );
    for (const [i, name] of (
      ['aPosition', 'aNormal', 'aColor', 'aUV', 'aRig'] satisfies [
        string,
        string,
        string,
        string,
        string,
      ]
    ).entries())
      context.gl.bindAttribLocation(context.program, i, name);
    context.gl.linkProgram(context.program);
    if (!context.gl.getProgramParameter(context.program, context.gl.LINK_STATUS))
      throw new Error(context.gl.getProgramInfoLog(context.program) || 'Shader linking failed.');
    context.gl.useProgram(context.program);
    context.program.position = context.gl.getAttribLocation(context.program, 'aPosition');
    context.program.normal = context.gl.getAttribLocation(context.program, 'aNormal');
    context.program.color = context.gl.getAttribLocation(context.program, 'aColor');
    context.program.uv = context.gl.getAttribLocation(context.program, 'aUV');
    context.program.vp = context.gl.getUniformLocation(context.program, 'uVP');
    context.program.eye = context.gl.getUniformLocation(context.program, 'uEye');
    context.program.focus = context.gl.getUniformLocation(context.program, 'uFocus');
    context.program.light = context.gl.getUniformLocation(context.program, 'uLightVP');
    context.program.shadows = context.gl.getUniformLocation(context.program, 'uShadows');
    context.program.time = context.gl.getUniformLocation(context.program, 'uTime');
    context.program.glassPass = context.gl.getUniformLocation(context.program, 'uGlassPass');
    context.gl.uniform1i(context.gl.getUniformLocation(context.program, 'uAtlas'), 0);
    context.gl.uniform1i(context.gl.getUniformLocation(context.program, 'uShadowMap'), 1);
    context.gl.uniform1i(context.gl.getUniformLocation(context.program, 'uMaterials'), 2);
    for (const [i, name] of (
      ['uAlpineSnow', 'uAlpineGroom', 'uAlpineRock', 'uAlpineForest'] satisfies [
        string,
        string,
        string,
        string,
      ]
    ).entries())
      context.gl.uniform1i(context.gl.getUniformLocation(context.program, name), 3 + i);
    if (gpuSkinning)
      context.characterGPU = createCharacterGPU(context.gl, context.program, {
        maxBytes: RENDERING.characterGeometryMiB * 1048576,
      });
    context.gl.enable(context.gl.DEPTH_TEST);
    context.gl.depthFunc(context.gl.LEQUAL);
    context.gl.clearColor(0.56, 0.7, 0.73, 1);
    const names = context.signNames();
    context.atlasTexture = createSignTexture(context.gl, names, context.signs, {
      preserveCase: [...RESTAURANTS.map((r) => r.name), 'California high-speed rail'],
      artwork: [...BILLBOARD_ART, ...RESEARCH_ART],
      billboardController: context.signTextureControls,
      revealed: context.playerLook.sunglasses,
    });
    context.materialState = createMaterialTexture(context.gl);
    context.materialTexture = context.materialState.texture;
    context.alpineState = createAlpineTexture(context.gl);
    context.alpineTextures = context.alpineState.textures;
    context.dynamicGPU = createDynamicGeometry(context.gl);
    context.glassGPU = { buffer: context.gl.createBuffer(), count: 0 };
    initShadows(compile);
    context.lampGlow = createLampGlow(context.gl);
    if (context.built) {
      context.lampGlow.setLights(context.streetLights, context.terrainHeight);
      context.gpuStats.triangles += context.lampGlow.stats.triangles;
    }
  }

  function upload(mesh: UploadMesh, { spatial = false } = {}): GeometryGPU {
    if (mesh.streamId !== undefined)
      return context.worldStream.gpu({
        streamId: mesh.streamId,
        count: requiredValue(mesh.count, 'Stream mesh count is missing.'),
      });
    const data = new Float32Array(mesh.data);
    if (context.headless) {
      mesh.data = data;
      return { count: data.length / 11 };
    }
    const buffer = context.gl.createBuffer();
    context.gl.bindBuffer(context.gl.ARRAY_BUFFER, buffer);
    const packed = spatial ? packStaticMesh(data) : { data, batches: undefined };
    context.gl.bufferData(context.gl.ARRAY_BUFFER, packed.data, context.gl.STATIC_DRAW);
    mesh.data = data;
    context.gpuStats.triangles += data.length / 33;
    return {
      buffer,
      count: data.length / 11,
      glass: meshGlassTriangles(packed.data),
      batches: packed.batches,
    };
  }

  function drawGPU(gpu: GeometryGPU, start = 0, count = gpu.count) {
    if (!count) return;
    if (gpu.stream !== undefined) {
      context.worldStream.draw(
        { stream: gpu.stream, count: gpu.count },
        start,
        count,
        (part, a, n) => {
          if (
            context.program === context.shadowProgram ||
            batchInFrustum(part.chunk, context.camera.matrix)
          )
            drawGPU(part, a, n);
        },
      );
      return;
    }
    if (context.program.glassPass && !context.drawingGlass && gpu.glass?.length)
      context.glazing.collect(gpu, start, count);
    context.gl.bindBuffer(context.gl.ARRAY_BUFFER, gpu.buffer || null);
    for (const [location, size, offset] of [
      [context.program.position, 3, 0],
      [context.program.normal, 3, 12],
      [context.program.color, 3, 24],
      [context.program.uv, 2, 36],
    ]) {
      if (location >= 0) {
        context.gl.enableVertexAttribArray(location);
        context.gl.vertexAttribPointer(location, size, context.gl.FLOAT, false, 44, offset);
      }
    }
    if (
      gpu.batches &&
      context.program !== context.shadowProgram &&
      start === 0 &&
      count === gpu.count
    ) {
      for (const batch of gpu.batches)
        if (batchInFrustum(batch, context.camera.matrix)) {
          context.gl.drawArrays(context.gl.TRIANGLES, batch.start, batch.count);
          context.gpuStats.drawCalls++;
        }
    } else {
      if (gpu.indexBuffer) {
        context.gl.bindBuffer(context.gl.ELEMENT_ARRAY_BUFFER, gpu.indexBuffer || null);
        context.gl.drawElements(
          context.gl.TRIANGLES,
          count,
          gpu.indexType!,
          start * gpu.indexStride!,
        );
      } else context.gl.drawArrays(context.gl.TRIANGLES, start, count);
      context.gpuStats.drawCalls++;
    }
  }

  function drawGlazing() {
    const data = context.glazing.data(context.camera.eye);
    if (!data.length) return;
    context.gl.bindBuffer(context.gl.ARRAY_BUFFER, context.glassGPU.buffer || null);
    context.gl.bufferData(context.gl.ARRAY_BUFFER, data, context.gl.DYNAMIC_DRAW);
    context.glassGPU.count = data.length / 11;
    context.drawingGlass = true;
    context.gl.uniform1f(context.program.glassPass, 1);
    context.gl.depthMask(false);
    context.gl.enable(context.gl.BLEND);
    context.gl.blendFunc(context.gl.SRC_ALPHA, context.gl.ONE_MINUS_SRC_ALPHA);
    drawGPU(context.glassGPU);
    context.gl.depthMask(true);
    context.gl.disable(context.gl.BLEND);
    context.gl.uniform1f(context.program.glassPass, 0);
    context.drawingGlass = false;
  }

  function initShadows(compile: (type: number, source: string) => WebGLShader) {
    const eye = [-20 * context.MAP_SCALE, 90, 70 * context.MAP_SCALE] satisfies [
        number,
        number,
        number,
      ],
      target = [context.N / 2, 0, context.N / 2] satisfies [number, number, number],
      b = unit(sub(eye, target)),
      r = unit(cross([0, 1, 0] satisfies [number, number, number], b)),
      u = cross(b, r);
    const view = new Float32Array([
        r[0],
        u[0],
        b[0],
        0,
        r[1],
        u[1],
        b[1],
        0,
        r[2],
        u[2],
        b[2],
        0,
        -dot(r, eye),
        -dot(u, eye),
        -dot(b, eye),
        1,
      ] satisfies [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ]),
      ortho = new Float32Array([
        1 / (55 * context.MAP_SCALE),
        0,
        0,
        0,
        0,
        1 / (55 * context.MAP_SCALE),
        0,
        0,
        0,
        0,
        -2 / 199,
        0,
        0,
        0,
        -201 / 199,
        1,
      ] satisfies [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ]);
    context.shadowMatrix = matrixMultiply(ortho, view);
    context.shadowRoom = undefined;
    context.gl.activeTexture(context.gl.TEXTURE1);
    context.shadowTexture = context.gl.createTexture();
    context.gl.bindTexture(context.gl.TEXTURE_2D, context.shadowTexture);
    if (!context.gl.getExtension('WEBGL_depth_texture')) {
      context.gl.texImage2D(
        context.gl.TEXTURE_2D,
        0,
        context.gl.RGBA,
        1,
        1,
        0,
        context.gl.RGBA,
        context.gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255] satisfies [number, number, number, number]),
      );
      context.shadowFramebuffer = null;
    } else {
      context.gl.texImage2D(
        context.gl.TEXTURE_2D,
        0,
        context.gl.DEPTH_COMPONENT,
        context.SHADOW_SIZE,
        context.SHADOW_SIZE,
        0,
        context.gl.DEPTH_COMPONENT,
        context.gl.UNSIGNED_SHORT,
        null,
      );
      context.shadowFramebuffer = context.gl.createFramebuffer();
      context.gl.bindFramebuffer(context.gl.FRAMEBUFFER, context.shadowFramebuffer);
      context.gl.framebufferTexture2D(
        context.gl.FRAMEBUFFER,
        context.gl.DEPTH_ATTACHMENT,
        context.gl.TEXTURE_2D,
        context.shadowTexture,
        0,
      );
      const color = context.gl.createRenderbuffer();
      context.gl.bindRenderbuffer(context.gl.RENDERBUFFER, color);
      context.gl.renderbufferStorage(
        context.gl.RENDERBUFFER,
        context.gl.RGBA4,
        context.SHADOW_SIZE,
        context.SHADOW_SIZE,
      );
      context.gl.framebufferRenderbuffer(
        context.gl.FRAMEBUFFER,
        context.gl.COLOR_ATTACHMENT0,
        context.gl.RENDERBUFFER,
        color,
      );
      if (
        context.gl.checkFramebufferStatus(context.gl.FRAMEBUFFER) !==
        context.gl.FRAMEBUFFER_COMPLETE
      )
        context.shadowFramebuffer = null;
    }
    context.gl.texParameteri(
      context.gl.TEXTURE_2D,
      context.gl.TEXTURE_MIN_FILTER,
      context.gl.NEAREST,
    );
    context.gl.texParameteri(
      context.gl.TEXTURE_2D,
      context.gl.TEXTURE_MAG_FILTER,
      context.gl.NEAREST,
    );
    context.gl.texParameteri(
      context.gl.TEXTURE_2D,
      context.gl.TEXTURE_WRAP_S,
      context.gl.CLAMP_TO_EDGE,
    );
    context.gl.texParameteri(
      context.gl.TEXTURE_2D,
      context.gl.TEXTURE_WRAP_T,
      context.gl.CLAMP_TO_EDGE,
    );
    context.gl.bindFramebuffer(context.gl.FRAMEBUFFER, null);
    context.gl.activeTexture(context.gl.TEXTURE0);
    context.shadowProgram = context.gl.createProgram() as ShaderProgram;
    context.gl.attachShader(
      context.shadowProgram,
      compile(
        context.gl.VERTEX_SHADER,
        'attribute vec3 aPosition;attribute vec2 aUV;uniform mat4 uVP;varying float vGlass;void main(){vGlass=abs(aUV.x-(' +
          GLASS_UV +
          '))<.015?1.:0.;gl_Position=uVP*vec4(aPosition,1.);}',
      ),
    );
    context.gl.attachShader(
      context.shadowProgram,
      compile(
        context.gl.FRAGMENT_SHADER,
        'precision mediump float;varying float vGlass;void main(){if(vGlass>.5)discard;gl_FragColor=vec4(1.);}',
      ),
    );
    context.gl.linkProgram(context.shadowProgram);
    Object.assign(context.shadowProgram, {
      position: context.gl.getAttribLocation(context.shadowProgram, 'aPosition'),
      normal: -1,
      color: -1,
      uv: context.gl.getAttribLocation(context.shadowProgram, 'aUV'),
      vp: context.gl.getUniformLocation(context.shadowProgram, 'uVP'),
    });
  }

  function drawBuildings() {
    const room = context.activeInstituteRoom();
    for (const o of context.buildingModels) {
      if (context.program !== context.shadowProgram && !batchInFrustum(o, context.camera.matrix))
        continue;
      if (o.researchRoom) {
        o.cutaway = o.researchRoom === room;
        const hidden = instituteHiddenSections(
          o.researchRoom,
          o.sections || [],
          context.camera.eye,
          o.cutaway,
        );
        if (!o.cutaway) {
          drawGPU(o.gpu);
          continue;
        }
        for (const part of o.sections || [])
          if (!hidden.includes(part)) drawGPU(o.gpu, part.start, part.count);
        continue;
      }
      if (!o.permanent || !o.walls || !o.roof || !o.extras)
        throw new Error('Building draw ranges are incomplete.');
      o.cutaway = o.place === context.currentInterior;
      o.hiddenWalls = o.cutaway ? cutawayWallMask(o, context.camera.eye) : 0;
      drawGPU(o.gpu, o.permanent.start, o.permanent.count);
      for (const wall of o.walls)
        if (!o.cutaway || !(o.hiddenWalls & (1 << wall.side)))
          drawGPU(o.gpu, wall.start, wall.count);
      if (!o.cutaway) drawGPU(o.gpu, o.roof.start, o.roof.count);
      drawGPU(o.gpu, o.extras.start, o.extras.count);
    }
  }

  function renderShadows() {
    const room = context.activeInstituteRoom(),
      key = context.currentInterior
        ? context.currentInterior.id +
          ':' +
          cutawayWallMask(context.currentInterior, context.camera.eye)
        : room
          ? room.id +
            ':' +
            instituteHiddenSections(
              room,
              requiredValue(room.object, 'The institute mesh is missing.').sections || [],
              context.camera.eye,
              true,
            )
              .map((p) => p.side ?? 'roof')
              .join(',')
          : 'outside';
    if (!context.shadowFramebuffer || context.shadowRoom === key) return;
    context.shadowRoom = key;
    const main = context.program;
    context.program = context.shadowProgram;
    context.gl.bindFramebuffer(context.gl.FRAMEBUFFER, context.shadowFramebuffer);
    context.gl.viewport(0, 0, context.SHADOW_SIZE, context.SHADOW_SIZE);
    context.gl.clear(context.gl.DEPTH_BUFFER_BIT | context.gl.COLOR_BUFFER_BIT);
    context.gl.useProgram(context.program);
    context.gl.uniformMatrix4fv(context.program.vp, false, context.shadowMatrix);
    context.gl.enable(context.gl.POLYGON_OFFSET_FILL);
    context.gl.polygonOffset(1, 1);
    drawGPU(context.groundGPU);
    drawGPU(context.sceneGPU);
    drawBuildings();
    context.gl.disable(context.gl.POLYGON_OFFSET_FILL);
    context.gl.bindFramebuffer(context.gl.FRAMEBUFFER, null);
    context.program = main;
  }

  function drawExpeditionActors(
    m: Mesh,
    t: number,
    addTarget: (start: number, metadata: TargetMetadata) => void,
  ) {
    const game = context.expeditions,
      near = (n: Readonly<{ x: number; z: number }>) =>
        Math.hypot(n.x - context.player.x - 0.5, n.z - context.player.y - 0.5) < 40;
    if (near(JURASSIC)) {
      drawRaptorGate(m, game);
    }
    const r = game.raptor;
    if (r.phase !== 'recovered' && near(r)) {
      r.base =
        r.phase === 'caged' || r.phase === 'releasing'
          ? JURASSIC.base
          : context.characterGround(r.x, r.z);
      const start = m.data.length;
      drawVelociraptor(m, r, t);
      if (r.phase !== 'dead') addTarget(start, { npc: r });
      else {
        const remains = game.state.loot.find((l) => l.lootKind === 'raptor');
        if (remains) addTarget(start, { sight: remains });
      }
      if (r.phase === 'loose' && r.prey?.isPlayer)
        context.actorTags.push({ ...r, height: 1.6, chasing: true });
    }
    for (const cow of game.cows)
      if (cow.hp > 0 && near(cow)) {
        cow.base = context.characterGround(cow.x, cow.z);
        const start = m.data.length;
        drawCow(m, cow, t);
        addTarget(start, { npc: cow });
      }
    const ship = game.ship;
    if (ship.home && near(ship)) {
      const start = m.data.length;
      drawPequod(m, ship, game.state.clock * 1000, context.signs);
      addTarget(start, { sight: context.pequodSite });
    }
    if (game.kraken.visible && game.kraken.hp > 0 && near(game.kraken)) {
      game.kraken.base = 0;
      const start = m.data.length;
      drawKraken(m, game.kraken, game.state.clock * 1000);
      addTarget(start, { npc: game.kraken });
    }
    for (const loot of game.state.loot)
      if (near(loot)) {
        const base =
            loot.base ??
            (loot.lootKind === 'kraken' ? PEQUOD.deck : context.characterGround(loot.x, loot.z)),
          start = m.data.length;
        drawExpeditionLoot(m, loot, base, t);
        addTarget(start, { sight: loot });
      }
    for (const beam of game.state.beams) drawBeam(m, beam);
  }

  function dynamicInView(x: number, z: number, base: number, radius = 2, height = 4) {
    return (
      context.headless ||
      batchInFrustum(
        {
          lo: [x - radius, base - 0.6, z - radius] satisfies [number, number, number],
          hi: [x + radius, base + height, z + radius] satisfies [number, number, number],
        },
        context.camera.matrix,
      )
    );
  }

  function actorInView(x: number, z: number, base: number) {
    return (
      context.headless ||
      batchInFrustum(
        {
          lo: [x - 2, base - 0.6, z - 2] satisfies [number, number, number],
          hi: [x + 2, base + 3.4, z + 2] satisfies [number, number, number],
        },
        context.camera.matrix,
      )
    );
  }

  function actorMesh() {
    const mesh = new Mesh();
    if (context.characterGPU) mesh.characters = context.characterGPU.begin();
    return mesh;
  }

  function actorTarget(mesh: Mesh, start: number, end: number, metadata: TargetMetadata) {
    const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
      hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number],
      characters = mesh.characters?.range(start, end) || [];
    for (let i = start; i < end; i += 11)
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], mesh.data[i + k]);
        hi[k] = Math.max(hi[k], mesh.data[i + k]);
      }
    for (const draw of characters) {
      const bounds = characterBounds(draw);
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], bounds.lo[k]);
        hi[k] = Math.max(hi[k], bounds.hi[k]);
      }
    }
    return { mesh, start: start / 11, count: (end - start) / 11, lo, hi, characters, ...metadata };
  }

  function makePrivateActors(t: number) {
    const m = actorMesh(),
      cave = context.secretWorld.kind === 'illuminati',
      base = context.playerGround();
    context.dynamicTargets = [];
    context.actorTags = [];
    const target = (start: number, metadata: TargetMetadata) =>
      context.dynamicTargets.push(actorTarget(m, start, m.data.length, metadata));
    const gesture =
      context.player.gesture && t - context.player.gesture.started < context.player.gesture.duration
        ? context.player.gesture
        : null;
    context.human(
      m,
      context.player.x + 0.5,
      context.player.y + 0.5,
      base + 0.07,
      context.player.angle,
      context.reduced ? 0 : context.player.phase,
      false,
      context.playerLook.skin,
      context.playerLook.shirt,
      {
        ...characterAppearance(context.playerLook),
        mode: context.player.sitBlend > 0 ? 'rest' : 'move',
        sitBlend: context.player.sitBlend,
        motion: context.reduced ? 0 : context.player.motion,
        run: context.player.runBlend,
        time: t * 0.001,
        backpack: false,
        ground: () => base,
        danceBlend: context.player.danceBlend,
        action: (context.player.danceBlend || 0) > 0 ? 'dance' : gesture?.name,
        actionT: gesture ? (t - gesture.started) / gesture.duration : 0,
      },
    );
    if (gesture?.name === 'drink')
      drawDrinkingCoffee(m, context.player, base + 0.07, t, gesture.started, gesture.duration);
    if (context.playerLook.cape && context.expeditions.state.cape)
      drawKrakenCape(
        m,
        context.player.x + 0.5,
        context.player.y + 0.5,
        base + 0.07,
        context.player.angle,
        t,
        context.signs,
      );
    if (cave) {
      context.multiplayerWorld?.draw(
        m,
        t,
        (start, metadata) => target(start, metadata),
        context.actorTags,
        { ground: () => ILLUMINATI_CAVE.floor + 0.025 },
      );
      let start = m.data.length;
      drawStealthBomber(
        m,
        { ...ILLUMINATI_CAVE.bomber, y: ILLUMINATI_CAVE.floor + 0.22 },
        -Math.PI / 2,
        { parked: true, time: t },
      );
      target(start, { sight: context.bomberSite });
      start = m.data.length;
      drawSecretStair(
        m,
        ILLUMINATI_CAVE.entrance.x,
        ILLUMINATI_CAVE.floor + 0.04,
        ILLUMINATI_CAVE.entrance.z,
        0,
      );
      target(start, { sight: context.caveExitSite });
    } else {
      const px = context.player.x + 0.5,
        pz = context.player.y + 0.5;
      m.quad(
        [px - 120, 0.02, pz - 120] satisfies [number, number, number],
        [px - 120, 0.02, pz + 120] satisfies [number, number, number],
        [px + 120, 0.02, pz + 120] satisfies [number, number, number],
        [px + 120, 0.02, pz - 120] satisfies [number, number, number],
        '#ffffff',
        { water: 1 },
      );
      let start = m.data.length;
      drawPequod(
        m,
        context.expeditions.ship,
        context.expeditions.state.clock * 1000,
        context.signs,
      );
      target(start, { sight: context.pequodSite });
      if (context.expeditions.kraken.visible && context.expeditions.kraken.hp > 0) {
        start = m.data.length;
        context.expeditions.kraken.base = 0;
        drawKraken(m, context.expeditions.kraken, context.expeditions.state.clock * 1000);
        target(start, { npc: context.expeditions.kraken });
      }
      if (context.ahabNPC) {
        start = m.data.length;
        drawHumanNPC(m, context.ahabNPC, t, {
          x: context.ahabNPC.x,
          z: context.ahabNPC.z,
          base: PEQUOD.deck + 0.07,
          angle: context.ahabNPC.angle,
          phase: 0,
          seated: false,
          skin: context.ahabNPC.skin,
          shirt: context.ahabNPC.shirt,
          appearance: { coat: true, cap: true, pants: '#3d4a4d', time: t * 0.001 },
          reduced: context.reduced,
          draw: context.human,
        });
        target(start, { npc: context.ahabNPC });
      }
      for (const loot of context.expeditions.state.loot.filter(
        (l) => !l.network && l.lootKind === 'kraken',
      )) {
        start = m.data.length;
        drawExpeditionLoot(m, loot, PEQUOD.deck, t);
        target(start, { sight: loot });
      }
      if (context.expeditions.state.railgun && context.expeditions.state.equipped)
        drawRailgun(m, px, base + 1.14, pz, context.player.angle);
      for (const beam of context.expeditions.state.beams) drawBeam(m, beam);
    }
    return m;
  }

  function makeActors(t: number) {
    if (context.secretWorld && context.secretWorld.kind !== 'world') return makePrivateActors(t);
    let pendingAirshipTarget: { start: number; end: number } | null = null;
    const m = actorMesh(),
      rolling = context.forwardRoll.state.active,
      trick = context.skateboard.riding ? context.skateTricks.pose : null,
      hop = context.playerRocketHop(),
      base = context.playerGround() + 0.07 + (trick?.height || 0) + hop.height,
      phase = context.reduced ? 0 : context.player.phase,
      gesture = context.player.gesture,
      actionT = gesture ? (t - gesture.started) / gesture.duration : 1;
    if (
      Math.hypot(
        context.player.x + 0.5 - DOG_PONY_SHOW.x,
        context.player.y + 0.5 - DOG_PONY_SHOW.z,
      ) < 55 &&
      dynamicInView(
        DOG_PONY_SHOW.x,
        DOG_PONY_SHOW.z,
        context.characterGround(DOG_PONY_SHOW.x, DOG_PONY_SHOW.z),
        5,
        5,
      )
    )
      drawDogPonyAnimals(
        m,
        context.merchants.find((n) => n.id === DOG_PONY_SHOW.administrator)?.showStartedAt,
        Date.now() + (context.multiplayer?.state.serverOffset || 0),
        context.characterGround,
      );
    const carryingFish = !!(
      context.economy.state.fish &&
      !rolling &&
      !context.fishing.state.active &&
      !context.player.dancing &&
      !context.capture.state.active &&
      !context.ferrari?.state.riding &&
      !context.bike.riding &&
      !context.motorcycle?.state.riding &&
      !context.skateboard.riding &&
      !context.flying() &&
      !context.rope.climbing &&
      !context.sutroClimb.state.active &&
      !context.rocket.state.active &&
      context.tahoe.state.mode === 'ground'
    );
    if (context.training)
      drawGymExercise(m, context.gymSelection, t, characterAppearance(context.playerLook), {
        reduced: context.reduced,
      });
    else if (context.tahoe.state.mode === 'ski')
      drawSkiRider(
        m,
        context.tahoe.state,
        t,
        context.reduced,
        characterAppearance(context.playerLook),
      );
    else if (context.tabletService?.state.active) {
      const p = requiredValue(context.tabletService.state.pose, 'Active tablet teleport');
      context.human(
        m,
        p.position.x,
        p.position.z,
        p.position.y,
        context.player.angle,
        0,
        false,
        context.playerLook.skin,
        context.playerLook.shirt,
        {
          ...characterAppearance(context.playerLook),
          phone: false,
          battleaxe: false,
          mode: 'idle',
          action: 'teleport',
          actionT: p.arms,
          ground: null,
        },
      );
      drawTabletTeleport(m, p, t);
    } else if (context.secretWorld?.bomber.state.active) {
      const b = context.secretWorld.bomber.state;
      if (b.phase === 'parachuting') {
        context.human(
          m,
          b.position.x,
          b.position.z,
          b.position.y,
          b.heading,
          0,
          false,
          context.playerLook.skin,
          context.playerLook.shirt,
          {
            ...characterAppearance(context.playerLook),
            mode: 'idle',
            action: 'parachute',
            actionT: 1,
            ground: null,
          },
        );
        drawParachute(m, b.position, b.heading, t);
      } else
        drawStealthBomber(m, b.position, b.heading, {
          bank: b.bank + b.rollAngle,
          time: t,
          pilot: characterAppearance(context.playerLook),
        });
    } else if (context.surf.state.riding && context.surf.state.mode === 'surf')
      drawWaveSurfer(
        m,
        context.player.x + 0.5,
        context.player.y + 0.5,
        context.playerGround(),
        context.player.angle,
        t,
        context.waveSurf.pose,
        {
          appearance: characterAppearance(context.playerLook),
          moving: context.player.moving,
          reduced: context.reduced,
        },
      );
    else if (context.surf.state.riding)
      drawWindsurfer(
        m,
        context.player.x + 0.5,
        context.player.y + 0.5,
        context.playerGround(),
        context.player.angle,
        t,
        {
          appearance: characterAppearance(context.playerLook),
          moving: context.player.moving && !context.surf.state.jump,
          reduced: context.reduced,
          pitch: context.surf.state.jump?.pitch || 0,
        },
      );
    else {
      const riderStart = m.data.length,
        rocketPose = context.rocket.state.active ? context.rocket.state.pose : null,
        onSutro = context.sutroClimb.state.active,
        networkClimb = !!context.multiplayerWorld?.traversing,
        climbing =
          networkClimb ||
          (onSutro && context.sutroClimb.state.phase !== 'top') ||
          context.rope.climbing ||
          rocketPose?.mode === 'climb',
        riderPose = networkClimb
          ? { mode: 'climb' }
          : rocketPose ||
            (context.rope.climbing ? { mode: 'climb' } : context.sutroClimb.state.pose);
      if (context.player.ballChair && context.player.sitting)
        drawBallChair(
          m,
          context.player.x + 0.5,
          base,
          context.player.y + 0.5,
          context.player.angle,
        );
      context.human(
        m,
        context.player.x + 0.5,
        context.player.y + 0.5,
        base +
          (context.ferrari?.state.riding
            ? 0.12
            : context.bike.riding
              ? 0.3
              : context.motorcycle?.state.riding
                ? 0.13
                : context.skateboard.riding
                  ? 0.155
                  : 0),
        context.player.angle,
        phase,
        context.bike.riding,
        context.playerLook.skin,
        context.playerLook.shirt,
        {
          ...characterAppearance(context.playerLook),
          akibo:
            context.playerWeapon() === 'akibo' &&
            !rolling &&
            !context.player.dancing &&
            !context.bike.riding &&
            !context.motorcycle?.state.riding &&
            !context.ferrari?.state.riding &&
            !climbing &&
            !rocketPose,
          backpack: context.playerLook.back === 'backpack',
          rocketBurnUntil:
            context.multiplayer?.state.inventory?.decorativeRocket?.burningUntil || 0,
          serverTime: Date.now() + (context.multiplayer?.state.serverOffset || 0),
          battleaxe:
            context.playerWeapon() === 'battleaxe' &&
            !rolling &&
            !context.player.dancing &&
            !context.bike.riding &&
            !context.motorcycle?.state.riding &&
            !context.ferrari?.state.riding &&
            !climbing &&
            !rocketPose,
          phone:
            context.economy.state.iphoneEquipped &&
            !carryingFish &&
            !rolling &&
            !context.player.dancing &&
            !context.bike.riding &&
            !context.motorcycle?.state.riding &&
            !context.ferrari?.state.riding &&
            !context.flying() &&
            !climbing &&
            !rocketPose &&
            !(context.expeditions.state.railgun && context.expeditions.state.equipped),
          carryingFish,
          railgun:
            context.playerWeapon() === 'railgun' &&
            !rolling &&
            !context.player.dancing &&
            !context.fishing.state.active &&
            !context.bike.riding &&
            !context.motorcycle?.state.riding &&
            !context.ferrari?.state.riding &&
            !climbing &&
            !rocketPose,
          bayonet:
            context.playerWeapon() === 'bayonet' &&
            !rolling &&
            !context.fishing.state.active &&
            context.quests.theyLive.state.bayonet &&
            !context.skateboard.riding &&
            !context.bike.riding &&
            !context.motorcycle?.state.riding &&
            !context.flying(),
          height: context.ferrari?.state.riding ? 0.65 : 1,
          danceBlend: context.player.danceBlend,
          sitBlend: context.player.sitBlend,
          mode: context.player.benchSeat
            ? 'sit'
            : rolling
              ? 'idle'
              : context.player.sitBlend > 0 &&
                  !climbing &&
                  !context.capture.state.active &&
                  !context.ferrari?.state.riding &&
                  !context.bike.riding &&
                  !context.motorcycle?.state.riding &&
                  !context.skateboard.riding
                ? 'rest'
                : context.ferrari?.state.riding
                  ? 'sit'
                  : context.capture.state.active
                    ? 'idle'
                    : rocketPose
                      ? rocketPose.mode
                      : climbing
                        ? requiredValue(riderPose, 'Active climbing pose').mode
                        : context.bike.riding
                          ? 'cycle'
                          : context.motorcycle?.state.riding
                            ? 'motorcycle'
                            : context.skateboard.riding
                              ? 'skate'
                              : 'move',
          motion:
            rolling || context.reduced
              ? 0
              : context.player.motion * (hop.active ? 1 - Math.sin(Math.PI * hop.progress) : 1),
          run: rolling ? 0 : context.player.runBlend,
          time: context.reduced ? 0 : t * 0.001,
          action: hop.active
            ? 'rocket-hop'
            : rolling
              ? 'forward-roll'
              : context.capture.state.active
                ? 'caught'
                : context.fishing.state.active
                  ? 'fish'
                  : (context.player.danceBlend || 0) > 0
                    ? 'dance'
                    : trick
                      ? 'skate-trick'
                      : climbing || rocketPose || context.reduced || actionT >= 1
                        ? undefined
                        : gesture?.name,
          actionT: hop.active
            ? hop.progress
            : rolling
              ? context.forwardRoll.progress
              : context.capture.state.active
                ? context.capture.pose.hands
                : context.fishing.state.active
                  ? context.fishing.progress
                  : trick
                    ? trick.progress
                    : actionT,
          ground: hop.active
            ? (x: number, z: number) => context.characterGround(x, z) + hop.height
            : rolling || context.capture.state.active || networkClimb
              ? null
              : context.expeditions.ship.aboard
                ? () => PEQUOD.deck + 0.01
                : rocketPose
                  ? requiredValue(riderPose, 'Active climbing pose').mode === 'climb'
                    ? null
                    : () =>
                        requiredValue(context.rocket.state.position, 'Active rocket position').y +
                        0.008
                  : context.tahoe.state.mode === 'gondola'
                    ? () =>
                        requiredValue(context.tahoe.state.position, 'Active gondola position').y +
                        0.01
                    : context.rope.climbing
                      ? null
                      : context.flying()
                        ? () =>
                            requiredValue(context.airship.state.position, 'Active airship position')
                              .y +
                            AIRSHIP_BASKET.floor +
                            0.008
                        : onSutro
                          ? requiredValue(riderPose, 'Active climbing pose').mode === 'climb'
                            ? null
                            : () =>
                                requiredValue(
                                  context.sutroClimb.state.position,
                                  'Active Sutro position',
                                ).y + 0.008
                          : context.bike.riding ||
                              context.motorcycle?.state.riding ||
                              context.skateboard.riding
                            ? null
                            : context.chase.state.jailed
                              ? () => context.detention.base + 0.19
                              : context.characterGround,
        },
      );
      if (rolling)
        applyForwardRollMesh(
          m,
          riderStart,
          context.player.x + 0.5,
          base,
          context.player.y + 0.5,
          context.player.angle,
          context.forwardRoll.progress,
          context.chase.state.jailed
            ? () => context.detention.base + 0.18
            : context.characterGround,
          (x: number, z: number) => context.clearAt(x - 0.5, z - 0.5),
        );
      if (
        !context.player.sitting &&
        !rolling &&
        !context.capture.state.active &&
        context.inebriation.intensity &&
        !context.flying() &&
        !context.bike.riding &&
        !context.rocket.state.active
      )
        swayCharacter(
          m,
          riderStart,
          context.player.x + 0.5,
          base,
          context.player.y + 0.5,
          t,
          context.inebriation.intensity,
        );
      if (context.fishing.state.active)
        drawFishingRod(
          m,
          {
            x: context.player.x + 0.5,
            z: context.player.y + 0.5,
            site: requiredValue(context.fishing.state.site, 'Active fishing spot'),
          },
          base,
          context.fishing.progress,
        );
      if (carryingFish)
        pose(m, context.player.x + 0.5, base, context.player.y + 0.5, context.player.angle, () =>
          drawFishBucket(m, 0.12, 0.35, 0.3, 0, context.reduced ? 0 : t * 0.001),
        );
      if (context.ferrari?.state.riding)
        drawFerrari(m, context.ferrari.position, {
          occupied: true,
          travel: context.ferrari.state.travel,
        });
      if (context.skateboard.riding)
        drawPlayerSkateboard(
          m,
          context.player.x + 0.5,
          context.player.y + 0.5,
          base - 0.035,
          context.player.angle,
          context.skateboard.travel,
          context.characterGround,
          trick,
        );
      if (context.motorcycle?.state.riding) {
        drawMotorcycle(
          m,
          context.player.x + 0.5,
          context.player.y + 0.5,
          base,
          context.player.angle,
          context.motorcycle.state.travel,
        );
        pitchMotorcycleMesh(
          m,
          riderStart,
          context.player.x + 0.5,
          base,
          context.player.y + 0.5,
          context.player.angle,
          context.characterGround,
        );
      }
      if (context.bike.riding)
        context.bicycle(
          m,
          context.player.x + 0.5,
          context.player.y + 0.5,
          base,
          context.player.angle,
          phase,
        );
      if (rocketPose)
        tiltRocketMesh(
          m,
          riderStart,
          requiredValue(context.rocket.state.vehicle, 'Active rocket vehicle'),
          context.rocket.state,
        );
      if (
        !rolling &&
        !context.capture.state.active &&
        !climbing &&
        !context.ferrari?.state.riding &&
        !context.bike.riding &&
        !context.motorcycle?.state.riding &&
        !context.flying()
      ) {
        if (context.playerLook.cape && context.expeditions.state.cape)
          drawKrakenCape(
            m,
            context.player.x + 0.5,
            context.player.y + 0.5,
            base,
            context.player.angle,
            t,
            context.signs,
          );
        if (
          context.playerWeapon() === 'railgun' &&
          !hop.active &&
          !context.player.dancing &&
          !context.fishing.state.active
        )
          drawRailgun(
            m,
            context.player.x + 0.5 + Math.cos(context.player.angle) * 0.08,
            base + 1.14,
            context.player.y + 0.5 + Math.sin(context.player.angle) * 0.08,
            context.player.angle,
          );
      }
      if (context.capture.state.active)
        collapseCharacterMesh(
          m,
          riderStart,
          context.player.x + 0.5,
          base,
          context.player.y + 0.5,
          context.player.angle,
          context.capture.pose.fall,
        );
    }
    if (context.tahoe.state.mode === 'gondola')
      drawGondolaCabin(
        m,
        requiredValue(context.tahoe.state.position, 'Active gondola position'),
        context.tahoe.state.angle,
      );
    drawRegionalBackdrop(m, context.player.x + 0.5, context.player.y + 0.5, context.playerGround());
    const shipPosition = requiredValue(
      context.multiplayerWorld?.airshipPosition ||
        (context.airship.state.active
          ? context.airship.state.position
          : {
              x: AIRSHIP_TERMINAL.boarding.x + 0.5,
              y: AIRSHIP_TERMINAL.base + 0.03,
              z: AIRSHIP_TERMINAL.boarding.y + 0.5,
            }),
      'Airship display position',
    );
    if (
      Math.hypot(context.player.x + 0.5 - shipPosition.x, context.player.y + 0.5 - shipPosition.z) <
        110 &&
      dynamicInView(shipPosition.x, shipPosition.z, shipPosition.y - 3, 16, 22)
    ) {
      const start = m.data.length;
      drawAirship(
        m,
        shipPosition,
        context.multiplayerWorld?.sharedAirship?.heading ??
          (context.airship.state.active ? context.airship.state.heading : -Math.PI / 2),
        t,
        context.reduced,
      );
      if (!context.airship.state.active) pendingAirshipTarget = { start, end: m.data.length };
    }
    const seaX = context.player.x + 0.5,
      seaZ = context.player.y + 0.5,
      seaRadius = 350;
    drawOffshoreSea(m, context.seaBounds, seaX, seaZ, seaRadius);
    drawCoastalSeagulls(m, t, [seaX, seaZ] satisfies [number, number], context.reduced);
    drawRehabilitationLaser(m, context.player, base, context.rehabilitation, t);
    if (
      context.player.gesture?.name === 'drink' &&
      t - context.player.gesture.started < context.player.gesture.duration
    )
      drawDrinkingCoffee(
        m,
        context.player,
        base,
        t,
        context.player.gesture.started,
        context.player.gesture.duration,
      );
    context.dynamicTargets = [];
    context.actorTags = [];
    const addTarget = (start: number, metadata: TargetMetadata, end = m.data.length) =>
      context.dynamicTargets.push(actorTarget(m, start, end, metadata));
    if (
      Math.hypot(
        context.player.x + 0.5 - SOUTHERN_LAKE.x,
        context.player.y + 0.5 - SOUTHERN_LAKE.z,
      ) < 40
    )
      drawRedwoodLakeLife(m, context.reduced ? 0 : t, addTarget);
    drawExpeditionActors(m, t, addTarget);
    if (
      Math.hypot(
        context.player.x - westernCoastX(DOG_SURFING.z),
        context.player.y - DOG_SURFING.z,
      ) < 45
    )
      drawDogSurfingCompetition(
        m,
        (Date.now() + (context.multiplayer?.state.serverOffset || 0)) / 1000,
      );
    for (const monster of context.wilderness?.actors || [])
      if (
        monster.hp > 0 &&
        Math.hypot(monster.x - context.player.x - 0.5, monster.z - context.player.y - 0.5) < 40
      ) {
        const start = m.data.length;
        drawWildMonster(m, monster, t);
        addTarget(start, { npc: monster });
      }
    context.multiplayerWorld?.draw(m, t, addTarget, context.actorTags);
    for (const bomb of context.secretWorld?.bombs || [])
      drawBombEffect(m, bomb, performance.now(), context.terrainHeight(bomb.x, bomb.z));
    for (const crash of context.secretWorld?.crashes || [])
      drawBomberCrash(m, crash, performance.now());
    if (
      context.sandSite &&
      Math.hypot(
        context.sandSite.entry.x - context.player.x,
        context.sandSite.entry.y - context.player.y,
      ) < 40
    ) {
      const start = m.data.length;
      drawBeachSand(
        m,
        context.sandSite,
        context.characterGround(context.sandSite.x, context.sandSite.z),
        context.signs,
      );
      addTarget(start, { sight: context.sandSite });
    }
    if (
      context.fishingSite &&
      Math.hypot(
        context.fishingSite.entry.x - context.player.x,
        context.fishingSite.entry.y - context.player.y,
      ) < 45 &&
      dynamicInView(
        context.fishingSite.entry.x + 0.5,
        context.fishingSite.entry.y + 0.5,
        requiredValue(context.fishingSite.base, 'Fishing spot elevation'),
        3,
        3,
      )
    ) {
      const start = m.data.length;
      drawFishingSpot(m, context.fishingSite, t, context.reduced);
      addTarget(start, { sight: context.fishingSite });
    }
    if (
      !context.sunglasses.state.owned &&
      context.sunglassesSite &&
      Math.hypot(
        context.sunglassesSite.x - context.player.x - 0.5,
        context.sunglassesSite.z - context.player.y - 0.5,
      ) < 45
    ) {
      const start = m.data.length;
      drawDroppedSunglasses(
        m,
        context.sunglassesSite,
        context.characterGround(context.sunglassesSite.x, context.sunglassesSite.z),
        t,
        { reduced: context.reduced },
      );
      addTarget(start, { sight: context.sunglassesSite });
    }
    if (
      context.motorcycle &&
      !context.motorcycle.state.riding &&
      Math.hypot(
        context.motorcycle.state.x - context.player.x,
        context.motorcycle.state.y - context.player.y,
      ) < 65 &&
      dynamicInView(
        context.motorcycle.state.x + 0.5,
        context.motorcycle.state.y + 0.5,
        context.characterGround(context.motorcycle.state.x + 0.5, context.motorcycle.state.y + 0.5),
        2,
        2,
      )
    ) {
      const p = context.motorcycle.state,
        start = m.data.length,
        base = context.characterGround(p.x + 0.5, p.y + 0.5) + 0.025;
      drawMotorcycle(m, p.x + 0.5, p.y + 0.5, base, p.angle, p.travel);
      pitchMotorcycleMesh(m, start, p.x + 0.5, base, p.y + 0.5, p.angle, context.characterGround);
      addTarget(start, { sight: context.sightById('zoo-motorcycle') });
    }
    if (context.ferrari && !context.ferrari.state.riding) {
      const p = context.ferrari.position;
      if (
        Math.hypot(p.x - context.player.x - 0.5, p.z - context.player.y - 0.5) < 70 &&
        dynamicInView(p.x, p.z, p.y, 2.5, 2)
      ) {
        const start = m.data.length;
        drawFerrari(m, p, { travel: context.ferrari.state.travel });
        addTarget(start, { sight: context.sightById('ferrari-car') });
      }
    }
    if (
      (!context.training || context.gymSelection !== 'bench') &&
      Math.hypot(SF_FITNESS.x - context.player.x - 0.5, SF_FITNESS.z - context.player.y - 0.5) < 50
    )
      drawBenchPress(m, t, characterAppearance(context.playerLook), {
        reduced: context.reduced,
        training: false,
      });
    if (
      context.bunny &&
      Math.hypot(
        context.bunny.state.x - context.player.x - 0.5,
        context.bunny.state.z - context.player.y - 0.5,
      ) < 70
    ) {
      const start = m.data.length;
      context.bunny.draw(m, t, context.characterGround, {
        reduced: context.reduced,
        cameraAngle: Math.atan2(
          context.camera.eye[2] - context.bunny.state.z,
          context.camera.eye[0] - context.bunny.state.x,
        ),
      });
      addTarget(start, { sight: context.bunny.sight });
    }
    if (
      context.skateDog &&
      Math.hypot(
        context.skateDog.state.x - context.player.x - 0.5,
        context.skateDog.state.z - context.player.y - 0.5,
      ) < 70
    ) {
      const start = m.data.length,
        dog = context.skateDog.state;
      context.skateDog.draw(m, t, context.characterGround, { reduced: context.reduced });
      addTarget(start, { sight: context.skateDog.sight });
      context.actorTags.push({
        x: dog.x,
        z: dog.z,
        base: context.characterGround(dog.x, dog.z),
        height: 1.4,
        speech: 'Woof!',
        speechBubble: true,
        speechUntil: dog.speechUntil,
      });
    }
    if (context.quests.carrying)
      pose(
        m,
        context.player.x + 0.5,
        context.playerGround() + 1.23,
        context.player.y + 0.5,
        context.player.angle - Math.PI / 2,
        () => {
          pose(m, 0.28, 0, -0.12, 0, () => drawMonkey(m, context.reduced ? 0 : t * 0.004));
        },
      );
    const monkeyCampus = RESEARCH_CAMPUSES[0],
      monkeyX = monkeyCampus.x - 1.7,
      monkeyZ = monkeyCampus.z + 3.5;
    if (
      context.quests.state.monkey === 'completed' &&
      Math.hypot(context.player.x - monkeyX, context.player.y - monkeyZ) < 50
    )
      pose(m, monkeyX, monkeyCampus.base + 0.025, monkeyZ, 0, () =>
        drawMonkey(m, context.reduced ? 0 : t * 0.004),
      );
    if (context.monkeyKeeper) {
      const k = context.monkeyKeeper.state,
        a = k.actor,
        x = a.x + 0.5,
        z = a.y + 0.5;
      if (Math.hypot(x - context.player.x - 0.5, z - context.player.y - 0.5) < 65) {
        const start = m.data.length,
          base = context.characterGround(x, z);
        drawHumanNPC(m, a, t, {
          x: x,
          z: z,
          base: base + 0.07,
          angle: a.angle,
          phase: context.reduced ? 0 : (a.travel * Math.PI * 2) / CHARACTER_CLIPS.run.stride,
          seated: false,
          skin: '#bc9470',
          shirt: '#8d986a',
          appearance: {
            pants: '#5b6854',
            cap: true,
            backpack: false,
            mode: 'move',
            motion: a.moving && !context.reduced ? 1 : 0,
            run: 1,
            time: context.reduced ? 0 : t * 0.001,
            ground: context.characterGround,
          },
          reduced: context.reduced,
          draw: context.human,
        });
        addTarget(start, { npc: context.keeperNPC });
        context.actorTags.push({
          x,
          z,
          base,
          height: 2.05,
          chasing: context.monkeyKeeper.active && !context.capture.state.active,
          speechBubble: true,
          speech: context.monkeyKeeper.active
            ? (
                [
                  'Stop! Return that monkey!',
                  'That primate has a keeper!',
                  'Academic recruitment is not an excuse!',
                ] satisfies [string, string, string]
              )[Math.floor(k.elapsed / 3) % 3]
            : '',
          speechUntil: context.monkeyKeeper.active ? Infinity : 0,
        });
      }
    }
    drawZooAnimals(m, t, context.terrainHeight, {
      reduced: context.reduced,
      monkeyTaken: context.quests.taken,
      near: (x: number, z: number) =>
        Math.hypot(x - context.player.x - 0.5, z - context.player.y - 0.5) < 65,
      visible: (x: number, z: number, y: number) => dynamicInView(x, z, y, 2, 7),
    });
    if (context.zoo) {
      const animal = context.zoo.state.tiger,
        near = (x: number, y: number) =>
          Math.hypot(x - context.player.x, y - context.player.y) < 100 &&
          dynamicInView(x + 0.5, y + 0.5, context.characterGround(x + 0.5, y + 0.5), 2, 3);
      if (near(SF_ZOO.x, SF_ZOO.z)) {
        const start = m.data.length;
        drawTigerGate(m, context.zooBase, context.zoo.state.gate);
        addTarget(start, { sight: context.sightById('zoo') });
      }
      if (near(animal.x, animal.y)) {
        const start = m.data.length;
        drawTiger(m, animal, (x, z) => context.characterGround(x, z), { reduced: context.reduced });
        addTarget(start, { sight: tigerInteractionTarget(context.zoo) });
        if (
          (['opening', 'escaping', 'loose'] satisfies [string, string, string]).includes(
            context.zoo.state.phase,
          )
        )
          context.actorTags.push({
            x: animal.x + 0.5,
            z: animal.y + 0.5,
            base: context.characterGround(animal.x + 0.5, animal.y + 0.5),
            height: 1.65,
            chasing: context.zoo.dangerous && !context.capture.state.active,
          });
      }
      const lines = [
        'Stop! We have paperwork!',
        'Pspsps is not working!',
        'You are outside your service area!',
        'This was not in the job description!',
        'Please return to your designated tiger area!',
        'Nobody said there would be cardio!',
      ] satisfies [string, string, string, string, string, string];
      for (const w of context.zoo.state.wardens)
        if (near(w.x, w.y)) {
          const base = context.characterGround(w.x + 0.5, w.y + 0.5),
            speech =
              (w.speechFor || 0) > 0
                ? w.speech
                : context.zoo.state.phase === 'loose' &&
                    Math.floor(context.zoo.state.elapsed / 3.5) % 2 === w.index &&
                    context.zoo.state.elapsed % 3.5 < 2.7
                  ? lines[(Math.floor(context.zoo.state.elapsed / 7) + w.index) % lines.length]
                  : '';
          drawHumanNPC(m, w, t, {
            x: w.x + 0.5,
            z: w.y + 0.5,
            base: base + 0.07,
            angle: w.angle,
            phase: context.reduced ? 0 : (w.travel * Math.PI * 2) / CHARACTER_CLIPS.run.stride,
            seated: false,
            skin: w.index ? '#ba8b67' : '#d4b493',
            shirt: '#7a976f',
            appearance: {
              mode: 'move',
              motion: context.reduced || !w.moving ? 0 : 1,
              run: 1,
              pants: '#536658',
              cap: true,
              uniform: true,
              backpack: false,
              time: context.reduced ? 0 : t * 0.001,
              ground: context.characterGround,
            },
            reduced: context.reduced,
            draw: context.human,
          });
          drawAnimalControlNet(
            m,
            w.x + 0.5,
            base,
            w.y + 0.5,
            w.angle,
            context.reduced ? 0 : t * 0.001,
          );
          context.actorTags.push({
            x: w.x + 0.5,
            z: w.y + 0.5,
            base,
            height: 2.45,
            label: contentText('world.rendering.makeActors.label-1', {}),
            speechBubble: true,
            speech,
            speechUntil: Infinity,
          });
        }
    }
    if (context.rocket.state.active) {
      const p = requiredValue(context.rocket.state.vehicle, 'Active rocket vehicle');
      drawReusableRocket(m, p, t, {
        occupied: context.rocket.state.occupied,
        hatch: context.rocket.state.hatch,
        cameraPosition: context.camera.eye,
        thrust: context.rocket.state.thrust,
        pitch: context.rocket.state.pitch,
        heading: context.rocket.state.heading,
      });
    } else
      for (const [id, site] of [
        ['sf-spaceport', SF_SPACEPORT],
        ['tahoe-spaceport', context.tahoe.spaceport],
      ] as const)
        if (
          Math.hypot(site.x - context.player.x - 0.5, site.z - context.player.y - 0.5) < 100 &&
          dynamicInView(site.x, site.z, site.base, 3, 12)
        ) {
          const start = m.data.length;
          drawReusableRocket(m, { x: site.x, y: site.base + 0.14, z: site.z }, t);
          addTarget(start, {
            sight: { ...requiredValue(context.sightById(id), 'Launch site ' + id), mobile: true },
          });
        }
    if (pendingAirshipTarget)
      addTarget(
        pendingAirshipTarget.start,
        { sight: { ...requiredValue(context.sightById('airship'), 'Airship site'), mobile: true } },
        pendingAirshipTarget.end,
      );
    const ropeStart = m.data.length;
    drawAirshipRope(m, context.rope.state, t, context.reduced);
    if (context.rope.state.deployed && context.rope.state.bottom) {
      const b = context.rope.state.bottom;
      addTarget(ropeStart, { sight: ropeInteractionTarget(b) });
    }
    if (context.rope.state.passenger) {
      const p = context.rope.state.passenger,
        aboard = p.phase === 'aboard',
        ship = context.airship.state.position || context.airship.home,
        a = context.airship.state.heading;
      drawHumanNPC(m, p, t, {
        x: aboard ? ship.x - Math.cos(a) * 0.8 : p.x,
        z: aboard ? ship.z - Math.sin(a) * 0.8 : p.z,
        base: aboard ? ship.y + 0.1 : p.y,
        angle: a,
        phase: aboard ? 0 : (p.y * Math.PI * 2) / 0.56,
        seated: false,
        skin: MERCHANTS.passenger.skin,
        shirt: MERCHANTS.passenger.shirt,
        appearance: {
          mode: aboard ? 'idle' : 'climb',
          motion: aboard ? 0 : 1,
          backpack: false,
          time: context.reduced ? 0 : t * 0.001,
        },
        reduced: context.reduced,
        draw: context.human,
      });
    }
    context.whales.draw(
      m,
      (context.multiplayerWorld?.clock ?? context.waveTime) * 1000,
      [context.player.x + 0.5, context.player.y + 0.5] satisfies [number, number],
      context.reduced,
      (start: number, sight) => addTarget(start, { sight }),
    );
    if (
      Math.hypot(context.player.x + 0.5 - PROMETHEUS.x, context.player.y + 0.5 - PROMETHEUS.z) <
        135 &&
      dynamicInView(PROMETHEUS.x, PROMETHEUS.z, 0, 10, 40)
    )
      drawPrometheusFlame(m, t, context.reduced);
    context.bayShipping.draw(
      m,
      t,
      [context.player.x + 0.5, context.player.y + 0.5] satisfies [number, number],
      context.reduced,
    );
    if (
      !context.bike.riding &&
      actorInView(
        context.bike.x + 0.5,
        context.bike.y + 0.5,
        context.terrainHeight(context.bike.x + 0.5, context.bike.y + 0.5),
      )
    ) {
      const start = m.data.length;
      context.bicycle(
        m,
        context.bike.x + 0.5,
        context.bike.y + 0.5,
        context.terrainHeight(context.bike.x + 0.5, context.bike.y + 0.5) + 0.06,
        0.5,
      );
      addTarget(start, { sight: context.sightById('bicycle') });
    }
    drawPacificaWaves(m, context.waveTime * 1000, {
      x: context.player.x + 0.5,
      z: context.player.y + 0.5,
    });
    if (
      (!context.surf.state.riding || context.surf.state.mode !== 'windsurf') &&
      dynamicInView(
        requiredValue(context.sightById('windsurf'), 'Missing authored entity: windsurf').entry.x +
          0.5,
        requiredValue(context.sightById('windsurf'), 'Missing authored entity: windsurf').entry.y +
          0.5,
        0,
        3,
        6,
      )
    ) {
      const start = m.data.length,
        s = requiredValue(context.sightById('windsurf'), 'Missing authored entity: windsurf'),
        x = s.entry.x + 0.5,
        z = s.entry.y + 0.5;
      drawWindsurfer(m, x, z, context.terrainHeight(x, z) + 0.08, -Math.PI / 2, t, {
        rider: false,
        reduced: true,
      });
      addTarget(start, { sight: s });
    }
    for (let i = 0; i < 6; i++) {
      const fed = t < context.ducksFedUntil,
        a = i * 2.4 + (context.reduced ? 0 : t * 0.0001),
        r = fed ? 0.38 : 0.7,
        x = fed
          ? context.POND.x + 1.15 + Math.cos(a) * 0.25
          : context.POND.x + Math.cos(a) * context.POND.rx * r,
        z = fed
          ? context.POND.y + Math.sin(a) * 0.25
          : context.POND.y + Math.sin(a) * context.POND.ry * r,
        h = context.lakes[0].level + 0.08,
        small = i >= 4,
        scale = small ? 0.65 : 1,
        start = m.data.length;
      if (!dynamicInView(x, z, h, 1, 1)) continue;
      m.sphere(
        x,
        h,
        z,
        0.24 * scale,
        0.13 * scale,
        0.16 * scale,
        small ? '#d4b36d' : i % 2 ? '#9d8b6a' : '#b0a888',
        7,
        3,
      );
      const hx = x - Math.sin(a) * 0.19 * scale,
        hz = z + Math.cos(a) * 0.19 * scale;
      m.sphere(
        hx,
        h + 0.19 * scale,
        hz,
        0.1 * scale,
        0.13 * scale,
        0.1 * scale,
        small ? '#d5c27f' : i % 2 ? '#99886b' : '#476f4f',
        7,
        3,
      );
      m.sphere(
        hx - Math.sin(a) * 0.12 * scale,
        h + 0.17 * scale,
        hz + Math.cos(a) * 0.12 * scale,
        0.07 * scale,
        0.035 * scale,
        0.06 * scale,
        '#c79e51',
        5,
        3,
      );
      addTarget(start, { sight: context.sightById('ducks') });
    }
    if (context.currentInterior?.id === 'ai-lab')
      drawNeuralLabAnimation(
        m,
        context.currentInterior,
        requiredValue(
          requiredValue(context.currentInterior.object, 'Lab object').base,
          'Lab elevation',
        ) + 0.025,
        t,
        { reduced: context.reduced },
      );
    if (
      context.nightclub &&
      Math.hypot(context.player.x + 0.5 - NIGHTLIFE.x, context.player.y + 0.5 - NIGHTLIFE.z) < 65 &&
      dynamicInView(
        NIGHTLIFE.x,
        NIGHTLIFE.z,
        context.nightclub.base || context.characterGround(NIGHTLIFE.x, NIGHTLIFE.z),
        7,
        5,
      )
    ) {
      const start = m.data.length;
      drawNightlife(m, context.nightclub, context.signs, context.camera.eye, t, {
        inside: inNightlife(context.player.x + 0.5, context.player.y + 0.5),
        reduced: context.reduced,
      });
      addTarget(start, { sight: context.sightById('nightlife') });
    }
    context.streetTraffic?.draw(
      m,
      { x: context.player.x + 0.5, z: context.player.y + 0.5 },
      (start: number, car) => addTarget(start, { sight: car.sight }),
      (x: number, z: number, y: number) => dynamicInView(x, z, y, 2.5, 3),
    );
    if (context.slowBus) {
      if (context.slowBus.signals)
        drawTrafficSignalLights(
          m,
          context.slowBus.signals,
          context.slowBus.state.clock,
          { x: context.player.x + 0.5, z: context.player.y + 0.5 },
          (x: number, z: number, y: number) => dynamicInView(x, z, y, 1, 3),
        );
      const bus = context.slowBus.bus;
      if (
        Math.hypot(bus.x - context.player.x - 0.5, bus.z - context.player.y - 0.5) < 40 &&
        dynamicInView(bus.x, bus.z, requiredValue(bus.base, 'Bus elevation'), 3, 3)
      ) {
        const start = m.data.length;
        drawSlowBus(m, bus, t, context.signs);
        addTarget(start, { sight: bus.sight });
      }
    }
    if (
      context.deli?.state.pending &&
      Math.hypot(
        context.deli.state.position.x - context.player.x,
        context.deli.state.position.y - context.player.y,
      ) < 32
    )
      drawDeliveryCooler(m, context.deli.state, context.characterGround);
    context.cityLife.draw(
      m,
      t,
      [context.player.x + 0.5, context.player.y + 0.5] satisfies [number, number],
      context.reduced,
      (start: number, npc: Actor) => {
        addTarget(start, { npc });
        context.actorTags.push(npc);
      },
    );
    context.southernLife?.draw(
      m,
      t,
      [context.player.x + 0.5, context.player.y + 0.5] satisfies [number, number],
      context.reduced,
      (start: number, npc: Actor) => {
        addTarget(start, { npc });
        context.actorTags.push(npc);
      },
    );
    context.noeValleyLife?.draw(
      m,
      t,
      [context.player.x + 0.5, context.player.y + 0.5] satisfies [number, number],
      context.reduced,
      (start: number, npc: Actor) => {
        addTarget(start, { npc });
        context.actorTags.push(npc);
      },
    );
    context.squareLife?.draw(
      m,
      t,
      [context.player.x + 0.5, context.player.y + 0.5] satisfies [number, number],
      context.reduced,
      (start: number, npc: Actor) => {
        addTarget(start, { npc });
        context.actorTags.push(npc);
      },
    );
    context.esotericCampus?.life?.draw(
      m,
      t,
      [context.player.x + 0.5, context.player.y + 0.5] satisfies [number, number],
      context.reduced,
      (start: number, npc: Actor) => {
        addTarget(start, { npc });
        context.actorTags.push(npc);
      },
    );
    drawEstateResidents(
      m,
      context.southernNeighborhood?.residents || [],
      t,
      [context.player.x + 0.5, context.player.y + 0.5] satisfies [number, number],
      context.reduced,
      (start: number, npc: Actor) => {
        addTarget(start, { npc });
        context.actorTags.push(npc);
      },
      actorInView,
    );
    drawRestaurantDiners(
      m,
      context.restaurantDiners,
      t,
      [context.player.x + 0.5, context.player.y + 0.5] satisfies [number, number],
      context.reduced,
      (start: number, npc: Actor) => {
        addTarget(start, { npc });
        context.actorTags.push(npc);
      },
      actorInView,
    );
    if (
      Math.hypot(TWITTER_HQ.x - context.player.x - 0.5, TWITTER_HQ.z - context.player.y - 0.5) < 30
    )
      drawBottlePostAnimation(m, t, context.southernTerrain, context.merchants, {
        reduced: context.reduced,
        addTarget: (start: number, npc: Actor) => {
          addTarget(start, { npc });
          context.actorTags.push(npc);
        },
      });
    for (const npc of context.merchants) {
      if (npc.networked && !npc.networkVisible) continue;
      if (npc.interior && npc.interior !== context.currentInterior) continue;
      if (npc.kind === 'twitter-worker' || npc.kind === 'twitter-poster') continue;
      if (npc.expeditionDead) continue;
      if (
        context.quests.theyLive.isDefeated(npc.alienId) &&
        (!npc.defeatAt || t - npc.defeatAt > 750)
      )
        continue;
      if (
        Math.hypot(npc.x - context.player.x - 0.5, npc.z - context.player.y - 0.5) > 32 ||
        !actorInView(npc.x, npc.z, requiredValue(npc.base, 'NPC elevation'))
      )
        continue;
      const start = m.data.length,
        g = npc.gesture,
        gt = g ? (t - g.started) / g.duration : 1;
      if (context.npcRevealed(npc)) drawSpectre(m, npc, t);
      else
        drawHumanNPC(m, npc, t, {
          x: npc.x,
          z: npc.z,
          base: npc.base,
          angle: npc.angle,
          phase: typeof npc.phase === 'number' ? npc.phase : 0,
          seated: false,
          skin: npc.skin,
          shirt: npc.shirt,
          appearance: {
            sunglasses: !!npc.sunglasses,
            phone: npc.phone,
            alien: context.npcRevealed(npc),
            action: npc.defeatAt
              ? 'caught'
              : npc.thinking
                ? 'ponder'
                : gt < 1
                  ? g?.name || undefined
                  : undefined,
            actionT: npc.defeatAt ? 1 : gt,
            mode: npc.seated ? 'sit' : undefined,
            hat: npc.hat,
            cloakTop: npc.cloakTop,
            cloakBottom: npc.cloakBottom,
            female: !!npc.female,
            longHair: !!npc.longHair,
            hairstyle: npc.hairstyle,
            hair: npc.hair,
            motion: npc.motion || 0,
            ground: npc.roam ? context.characterGround : null,
            backpack: false,
            cap: npc.kind === 'crew' || !!npc.cap,
            uniform: npc.kind === 'crew',
            time: context.reduced ? 0 : t * 0.001,
            pants:
              npc.pants ||
              (npc.kind === 'tax' ? '#c7a752' : npc.kind === 'crew' ? '#35465c' : '#555e55'),
            coat: npc.kind === 'tax' || !!npc.coat,
            topHat: npc.kind === 'tax',
            chef: npc.kind === 'chef',
            gilded: npc.kind === 'tax',
          },
          reduced: context.reduced,
          draw: context.human,
        });
      if (npc.defeatAt)
        collapseCharacterMesh(
          m,
          start,
          npc.x,
          requiredValue(npc.base, 'NPC elevation'),
          npc.z,
          requiredValue(npc.angle, 'NPC facing'),
          Math.min(1, (t - npc.defeatAt) / 700),
        );
      else addTarget(start, { npc });
      if (npc.regional) context.actorTags.push(npc);
    }
    if (context.currentInterior === context.niaCitizen.interior)
      context.actorTags.push(context.niaCitizen);
    for (const npc of context.parrots) {
      if (
        Math.hypot(npc.x - context.player.x - 0.5, npc.z - context.player.y - 0.5) > 35 ||
        !dynamicInView(npc.x, npc.z, requiredValue(npc.base, 'Parrot elevation'), 1, 2)
      )
        continue;
      const start = m.data.length;
      drawParrot(m, npc, t, context.reduced);
      addTarget(start, { npc });
    }
    if (
      Math.hypot(NAVY_SHIP.x - context.player.x - 0.5, NAVY_SHIP.z - context.player.y - 0.5) <
        100 &&
      dynamicInView(NAVY_SHIP.x, NAVY_SHIP.z, 0, 15, 12)
    )
      drawNavyShip(m, t, context.reduced);
    for (const npc of context.jailStaff) {
      if (Math.hypot(npc.x - context.player.x - 0.5, npc.z - context.player.y - 0.5) > 25) continue;
      const start = m.data.length;
      npc.base = context.detention.terrain(npc.x, npc.z) + 0.07;
      drawHumanNPC(m, npc, t, {
        x: npc.x,
        z: npc.z,
        base: npc.base,
        angle: npc.angle,
        phase: 0,
        seated: false,
        skin: npc.skin,
        shirt: npc.shirt,
        appearance: {
          hair: npc.hair,
          coat: true,
          backpack: false,
          pants: npc.medical ? '#6c8693' : '#33353f',
          time: context.reduced ? 0 : t * 0.001,
        },
        reduced: context.reduced,
        draw: context.human,
      });
      if (npc.medical) {
        m.rod(
          [npc.x - 0.12, npc.base + 1.4, npc.z + 0.15],
          [npc.x + 0.12, npc.base + 1, npc.z + 0.15],
          0.015,
          '#496675',
          8,
        );
        m.sphere(npc.x + 0.12, npc.base + 1, npc.z + 0.15, 0.05, 0.05, 0.018, '#9daeb3', 12, 6);
      }
      addTarget(start, { npc });
    }
    const detained = context.chase.state.jailed && !context.capture.state.active;
    const officers = detained
      ? [
          {
            x: context.detention.x - 3.5,
            y: context.detention.z + 2.8,
            angle: -Math.PI / 2,
            index: 0,
            phase: 0,
          },
          {
            x: context.detention.x + 3,
            y: context.detention.z + 2.8,
            angle: -Math.PI / 2,
            index: 1,
            phase: 0,
          },
        ]
      : context.chase.state.officers;
    for (const o of officers) {
      if (Math.hypot(o.x - context.player.x, o.y - context.player.y) > 27) continue;
      const start = m.data.length,
        water = context.surf.water(o.x + 0.5, o.y + 0.5),
        base = water
          ? 0.06
          : detained
            ? context.detention.terrain(o.x + 0.5, o.y + 0.5) + 0.07
            : context.characterGround(o.x + 0.5, o.y + 0.5) + 0.025;
      if (water)
        drawWindsurfer(m, o.x + 0.5, o.y + 0.5, base, o.angle, t, {
          police: true,
          moving: !detained,
          reduced: context.reduced,
        });
      else
        drawHumanNPC(m, o, t, {
          x: o.x + 0.5,
          z: o.y + 0.5,
          base: base,
          angle: o.angle,
          phase: context.reduced ? 0 : (o.phase * Math.PI * 2) / (10 * CHARACTER_CLIPS.run.stride),
          seated: false,
          skin: '#ba9476',
          shirt: '#304b66',
          appearance: {
            pants: '#2d4055',
            cap: true,
            uniform: true,
            backpack: false,
            mode: 'move',
            motion: context.reduced || detained ? 0 : 1,
            run: 1,
            time: context.reduced ? 0 : t * 0.001,
            ground: detained
              ? (x: number, z: number) => context.detention.terrain(x, z) + 0.01
              : context.characterGround,
          },
          reduced: context.reduced,
          draw: context.human,
        });
      let officer = context.policeActors.get(o.index);
      if (!officer) {
        officer = {
          id: 'personal-police-' + o.index,
          x: o.x + 0.5,
          z: o.y + 0.5,
          label: contentText('world.rendering.makeActors.label-2', {}),
          police: true,
          kind: 'police',
          height: 1.95,
          description: contentText('world.rendering.makeActors.description-3', {}),
        };
        context.policeActors.set(o.index, officer);
      }
      Object.assign(officer, { x: o.x + 0.5, z: o.y + 0.5, base, angle: o.angle });
      addTarget(start, { npc: officer });
      const phrases = ['Stop!', 'You are under arrest!', 'Stop right there!'] satisfies [
          string,
          string,
          string,
        ],
        speaking = Math.floor(context.chase.state.elapsed / 2.8) % 3 === o.index,
        speech =
          !detained && speaking && context.chase.state.elapsed % 2.8 < 2.25
            ? phrases[Math.floor(context.chase.state.elapsed / 2.8) % phrases.length]
            : '';
      context.actorTags.push({
        x: o.x + 0.5,
        z: o.y + 0.5,
        base,
        height: water ? 3.3 : 1.95,
        label: contentText('world.rendering.makeActors.label-4', {}),
        police: true,
        chasing: context.chase.state.wanted && !detained && !context.capture.state.active,
        speech,
        speechUntil: Infinity,
      });
    }
    const travel = context.reduced ? 0.5 : (t * 0.000014) % 2,
      f = travel <= 1 ? travel : 2 - travel,
      car = requiredValue(context.alongStreet(context.market, f), 'The streetcar route is empty.'),
      next = requiredValue(
        context.alongStreet(
          context.market,
          Math.max(0.0001, Math.min(0.9999, f + (travel <= 1 ? 0.001 : -0.001))),
        ),
        'The streetcar route is empty.',
      ),
      angle = Math.atan2(next.y - car.y, next.x - car.x);
    if (dynamicInView(car.x, car.y, context.terrainHeight(car.x, car.y), 2, 3))
      drawStreetcar(m, car.x, context.terrainHeight(car.x, car.y) + 0.05, car.y, angle);
    context.drawHillsideLifts(m, t, context.reduced, actorInView);
    return m;
  }

  function drawCombatFeedback() {
    const entries = [],
      game = context.expeditions,
      target =
        context.alienCombat?.npc || context.multiplayerWorld?.combatTarget || game.state.target;
    if (context.alienCombat)
      entries.push({
        target: context.alienCombat.npc,
        hp: context.alienCombat.battle.state.hp,
        max: context.alienCombat.battle.state.max,
      });
    else if (target?.max)
      entries.push({
        target,
        hp: requiredValue(target.hp, 'Combat target hitpoints'),
        max: target.max,
      });
    if (
      game.raptor.phase === 'loose' &&
      game.raptor.prey?.isPlayer &&
      !entries.some((a) => a.target === game.raptor)
    )
      entries.push({ target: game.raptor, hp: game.raptor.hp, max: game.raptor.max });
    if (
      game.ship.aboard &&
      game.ship.phase === 'fighting' &&
      !entries.some((a) => a.target === game.kraken)
    )
      entries.push({ target: game.kraken, hp: game.kraken.hp, max: game.kraken.max });
    if (entries.length)
      entries.push({
        target: context.player,
        hp: context.health.state.hp,
        max: context.health.state.max,
      });
    context.combatFeedback.engage(entries);
    const visible = context.combatFeedback
      .entries()
      .map((a) =>
        a.target === context.player
          ? { ...a, hp: context.health.state.hp, max: context.health.state.max }
          : a,
      );
    context.combatOverlay!.draw(
      visible,
      (n) =>
        !('z' in n)
          ? {
              x: context.player.x + 0.5,
              y: context.playerGround() + context.playerRocketHop().height + 2.35,
              z: context.player.y + 0.5,
            }
          : {
              x: n.x,
              y:
                (n.base ?? context.characterGround(n.x, n.z)) +
                (n.height ??
                  (n.combatKind === 'kraken'
                    ? 3.4
                    : n.combatKind === 'cow'
                      ? 1.7
                      : n.combatKind === 'raptor'
                        ? 2
                        : 2.35)),
              z: n.z,
            },
      context.project,
      context.width,
      context.height,
    );
  }

  function drawActorLabels(t: number) {
    let used = 0;
    for (const actor of context.actorTags) {
      const marked = !!actor.chasing,
        speechText = actorSpeechText(actor, t);
      if (!marked && !actor.player && !speechText) continue;
      if (
        !marked &&
        Math.hypot(actor.x - context.player.x - 0.5, actor.z - context.player.y - 0.5) > 13
      )
        continue;
      const head = [
          actor.x,
          requiredValue(actor.base, 'Actor label height is missing.') +
            requiredValue(actor.height, 'Actor label size is missing.'),
          actor.z,
        ],
        p = context.project(head[0], head[1], head[2]);
      if (
        p.distance <= 0 ||
        p.depth > 1 ||
        p.x < 0 ||
        p.x > context.width ||
        p.y < 0 ||
        p.y > context.height
      )
        continue;
      if (!marked) {
        const ray = context.mouseRay(p.x, p.y),
          distance = Math.hypot(...head.map((v, i) => v - context.camera.eye[i]));
        if (
          (!context.secretWorld || context.secretWorld.kind === 'world') &&
          context.objects.some((o) => {
            if (
              o.sight?.id === context.activeInstituteRoom()?.id ||
              (o.sight?.id === 'pacifica-park' &&
                inPacificaPark(context.player.x + 0.5, context.player.y + 0.5)) ||
              (o.sight?.kind === 'nightlife' &&
                inNightlife(context.player.x + 0.5, context.player.y + 0.5)) ||
              (o.place && o.place === context.currentInterior) ||
              (!o.arch && !o.solid)
            )
              return false;
            if (!isPickTarget(o)) return false;
            const d = rayBox(ray, o.lo, o.hi);
            return d !== null && d < distance - 0.4;
          })
        )
          continue;
      }
      let tag = context.labelPool[used++];
      if (!tag) {
        const el = document.createElement('div'),
          speech = document.createElement('span'),
          arrow = document.createElement('span'),
          name = document.createElement('span');
        el.className = 'sf-actor-label';
        speech.className = 'sf-speech';
        arrow.className = 'sf-police-arrow';
        arrow.textContent = '▼';
        el.append(speech, arrow, name);
        context.$('sf-actor-labels').append(el);
        tag = { el, speech, arrow, name };
        context.labelPool.push(tag);
      }
      tag.el.hidden = false;
      tag.el.style.left = p.x + 'px';
      tag.el.style.top = p.y + 'px';
      tag.name.hidden = !actor.police && !actor.player;
      tag.name.textContent = actor.police || actor.player ? actor.label || '' : '';
      tag.name.className = actor.player ? 'sf-player-name' : '';
      tag.name.dataset.pvp = String(!!actor.pvp);
      tag.arrow.hidden = !marked;
      tag.speech.textContent = speechText;
    }
    for (let i = used; i < context.labelPool.length; i++) context.labelPool[i].el.hidden = true;
    const speech = context.$('sf-player-speech');
    speech.hidden = t >= context.playerSpeechUntil;
    if (!speech.hidden) {
      let head = {
        x: context.player.x + 0.5,
        y: context.playerGround() + context.playerRocketHop().height + 2.15,
        z: context.player.y + 0.5,
      };
      if (context.rocket.state.active)
        head = rocketFlightPoint(
          head,
          requiredValue(context.rocket.state.vehicle, 'Active rocket vehicle'),
          context.rocket.state,
        );
      const at = context.project(head.x, head.y, head.z);
      speech.hidden = at.distance <= 0 || at.depth > 1;
      if (!speech.hidden) {
        speech.style.left = at.x + 'px';
        speech.style.top = at.y + 'px';
      }
    }
  }

  function render(t: number, dt: number) {
    if (!context.active || !context.built || context.gl.isContextLost()) return;
    const renderStart = performance.now();
    context.frameMeter.sample(t);
    if (context.rocket.state.active && context.rocket.state.to)
      context.worldStream?.prefetch(context.rocket.state.to.x, context.rocket.state.to.z);
    context.connectionGate!.update();
    if (context.connectionGate!.blocked) return;
    context.combatFeedback.update(dt);
    context.update(dt, t);
    context.worldStream?.update(
      context.player.x + 0.5,
      context.player.y + 0.5,
      Math.max(18, 30 / context.zoom),
      context.secretWorld?.kind === 'world',
      context.camera.matrix,
    );
    context.bankMenu?.update();
    context.debugConsole!.update();
    context.frameID++;
    context.gpuStats.drawCalls = 0;
    const underground = context.secretWorld?.kind === 'illuminati',
      publicMap = context.secretWorld?.kind === 'world',
      nearCity =
        publicMap &&
        Math.hypot(context.player.x - context.N / 2, context.player.y - context.N / 2) < 220;
    if (nearCity) renderShadows();
    context.gl.viewport(0, 0, context.canvas.width, context.canvas.height);
    context.gl.clearColor(
      underground ? 0.12 : 0.56,
      underground ? 0.16 : 0.7,
      underground ? 0.14 : 0.73,
      1,
    );
    context.gl.clear(context.gl.COLOR_BUFFER_BIT | context.gl.DEPTH_BUFFER_BIT);
    context.gl.useProgram(context.program);
    context.gl.uniformMatrix4fv(context.program.vp, false, context.camera.matrix);
    context.gl.uniform3fv(context.program.eye, context.camera.eye);
    context.gl.uniform3fv(context.program.focus, context.camera.target);
    context.gl.uniform1f(context.program.time, context.reduced ? 0 : t * 0.001);
    context.gl.activeTexture(context.gl.TEXTURE0);
    context.gl.bindTexture(context.gl.TEXTURE_2D, context.atlasTexture);
    context.gl.activeTexture(context.gl.TEXTURE1);
    context.gl.bindTexture(context.gl.TEXTURE_2D, context.shadowTexture);
    context.gl.activeTexture(context.gl.TEXTURE2);
    context.gl.bindTexture(context.gl.TEXTURE_2D, context.materialTexture);
    for (const [i, texture] of context.alpineTextures.entries()) {
      context.gl.activeTexture(context.gl.TEXTURE3 + i);
      context.gl.bindTexture(context.gl.TEXTURE_2D, texture);
    }
    context.gl.activeTexture(context.gl.TEXTURE0);
    context.gl.uniformMatrix4fv(context.program.light, false, context.shadowMatrix);
    context.gl.uniform1f(context.program.shadows, publicMap && context.shadowFramebuffer ? 1 : 0);
    context.glazing.begin();
    context.gl.uniform1f(context.program.glassPass, 0);
    if (nearCity) {
      drawGPU(context.groundGPU);
      drawGPU(context.sceneGPU);
      drawBuildings();
    }
    if (publicMap && nearTahoe(context.player.x + 0.5, context.player.y + 0.5, 500))
      drawGPU(context.tahoeGPU);
    if (publicMap) drawGPU(context.highwayGPU);
    if (underground) {
      drawGPU(context.caveGPU);
      for (const w of requiredValue(context.caveGPU.walls, 'Cave wall buffers'))
        if (w.dx * context.camera.back[0] + w.dz * context.camera.back[2] < 0) drawGPU(w.gpu);
    }
    const actorStart = performance.now(),
      dynamic = makeActors(t);
    context.renderStats.actors =
      context.renderStats.actors * 0.9 + (performance.now() - actorStart) * 0.1;
    context.dynamicGPU.upload(dynamic.data);
    drawGPU(context.dynamicGPU);
    if (context.characterGPU) {
      context.characterGPU.draw();
      context.gpuStats.drawCalls += context.characterGPU.stats.draws;
    }
    drawGlazing();
    if (publicMap && context.lampGlow.draw(context.camera)) context.gpuStats.drawCalls++;
    drawActorLabels(t);
    drawCombatFeedback();
    context.drawPlaceMarkers(t);
    context.publishMultiplayerPose();
    context.renderStats.cpu =
      context.renderStats.cpu * 0.9 + (performance.now() - renderStart) * 0.1;
  }
  return { initGPU, upload, actorInView, render };
}
