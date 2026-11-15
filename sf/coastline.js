/** One shared outline for terrain, navigation, water partitions, and the map. */
const COAST_REFERENCE=[[8,70],[8,58],[8.1,49],[8.2,41],[8.3,34],[8,29],[7.4,27],[5.5,26],[4.8,24.5],[5.6,23.2],[5.2,22],[6.5,20.3],[7.2,19],[8.8,18.4],[10,17],[11.3,16.3],[12.5,14.5],[14,12.4],[15,11.5],[16.1,9.6],[17.6,8.8],[18.2,6.5],[19.8,6.2],[21.1,7.7],[22.6,8.3],[24.8,9],[27.8,9.7],[30,10],[32.6,10.5],[35,10.1],[37.8,9.3],[39.6,9.5],[41.7,9.1],[43.2,9.6],[44.6,9.3],[46,10.3],[47.4,11.7],[48.6,13.3],[49.8,14.6],[51.2,16.2],[52.6,18],[54,20.2],[54.6,20.8],[55.4,20],[57.2,21.8],[55.7,23.2],[55.9,25],[55.8,27.8],[55.1,30.6],[55.8,32.2],[55.2,33.7],[56.3,35],[56.5,37.7],[57.2,40],[57,42.2],[58,43.3],[57.2,45.5],[58.7,47],[60.6,47.8],[61.6,49.6],[60.4,51.2],[58.8,51.5],[58.5,53],[59.4,54.8],[58.3,56.5],[56.7,57.1],[56,59.4],[56,70]];
const coastSmooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
export function createSFCoast(scale=1.5){
    return COAST_REFERENCE.map(([x,z])=>{
        const northeast=coastSmooth((x-40)/6)*(1-coastSmooth((z-19)/5));
        return [x*scale+2*northeast,z*scale-2*northeast*(1-coastSmooth((z-15)/7))];
    });
}
/** Split at terrain grid edges AND triangle diagonals. Every curtain top is
 * then exactly on one linear terrain face; no exposed holes over the sea. */
export function shorelineSegments(outline,step=.25){
    const segments=[];
    for(let i=0;i<outline.length;i++){
        const a=outline[i],b=outline[(i+1)%outline.length],cuts=[0,1];
        for(const project of [p=>p[0],p=>p[1],p=>p[0]-p[1]]){
            const lo=project(a),hi=project(b),delta=hi-lo;if(Math.abs(delta)<1e-10)continue;
            for(let k=Math.floor(Math.min(lo,hi)/step)+1;k*step<Math.max(lo,hi)-1e-9;k++)cuts.push((k*step-lo)/delta);
        }
        const values=[...new Set(cuts.map(t=>Math.round(t*1e10)/1e10))].sort((a,b)=>a-b),at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
        for(let j=1;j<values.length;j++)segments.push([at(values[j-1]),at(values[j])]);
    }return segments;
}
