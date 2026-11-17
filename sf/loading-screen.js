/** Percentages describe completed initialization stages, never a timer. */
export const nextLoadingPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
export function createLoadingScreen(element){
    let percent=0;
    function report(value,label){percent=Math.max(percent,Math.min(100,Math.round(value)));element.querySelector('[data-loading-percent]').textContent=percent+'% loaded';element.querySelector('[data-loading-stage]').textContent=label;element.querySelector('progress').value=percent;}
    return {show(){percent=0;element.hidden=false;report(0,'Preparing San Francisco…');},report,async stage(value,label){report(value,label);await nextLoadingPaint();},async done(){report(100,'Ready to play');await nextLoadingPaint();element.hidden=true;},fail(error){element.hidden=false;element.dataset.failed='true';element.querySelector('[data-loading-stage]').textContent='Loading failed. Reload to try again.';element.querySelector('[data-loading-error]').textContent=error?.message||String(error);}};
}
