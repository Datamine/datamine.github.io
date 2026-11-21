/** Shared terrain/water shadow filter. Wider weighted taps soften angular
 * model silhouettes without adding texture samples to the main material pass. */
export const SF_SHADOW_GLSL = `
float sfShadow(vec4 coordinate,float bias){
    vec3 p=coordinate.xyz/coordinate.w*.5+.5;
    if(uShadows<.5||p.x<=0.||p.x>=1.||p.y<=0.||p.y>=1.)return 0.;
    float shade=0.;
    for(int x=0;x<3;x++){for(int y=0;y<3;y++){
        vec2 tap=vec2(float(x),float(y))-1.;
        float weight=(x==1?2.:1.)*(y==1?2.:1.);
        float depth=texture2D(uShadowMap,p.xy+tap*3./2048.).r;
        shade+=(p.z-bias>depth?1.:0.)*weight;
    }}
    return shade/16.;
}`;
