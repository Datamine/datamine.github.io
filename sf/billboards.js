// Original, editable vector ads. The standalone build embeds these files;
// development loads them directly. They share the sign atlas and draw calls.
const billboardAssetURL=name=>new URL('../textures/billboards/'+name,import.meta.url).href;
export const BILLBOARD_ART=Object.freeze([
    {id:'ts-cola',message:'CONSUME',file:'loeb-cola.svg',color:'#d71f42'},
    {id:'ts-broadway',message:'CONFORM',file:'broadway.svg',color:'#5f256b'},
    {id:'ts-market',message:'OBEY',file:'loebdaq.svg',color:'#126eb7'},
    {id:'ts-think',message:'DO NOT\nQUESTION',file:'think-big.svg',color:'#7050ba'},
    {id:'ts-moonshot',message:'STAY\nASLEEP',file:'moonshot.svg',color:'#177582'},
    {id:'ts-night',message:'SUBMIT',file:'late-nights.svg',color:'#bc4a9d'},
    {id:'ai-openai',message:'BUY',file:'ai-openai.svg',color:'#42746b'},
    {id:'ai-anthropic',message:"DON'T\nTHINK",file:'ai-anthropic.svg',color:'#c07d60'},
    {id:'ai-xai',message:'BELIEVE',file:'ai-xai.svg',color:'#263444'},
    {id:'beach-getaway',message:'OBEY',file:'pacific-holidays.svg',color:'#548e99'},
    {id:'green-bank-roof',message:'OBEY',file:'green-bank.svg',color:'#245a43'}
].map(a=>Object.freeze({...a,src:billboardAssetURL(a.file)})));


/** The hidden layer is stark typography, generated once per equipment change.
 * It occupies the same atlas cells and uses the same UVs as the colorful ads. */
export function drawRevealedBillboard(ctx,art,x,y,size=256){
    const pad=size*.045,lines=art.message.split('\n'),lineHeight=size*.67/lines.length;
    ctx.fillStyle='#f1f0e9';ctx.fillRect(x,y,size,size);
    ctx.fillStyle='#111512';ctx.fillRect(x+pad,y+pad,size-pad*2,size*.035);ctx.fillRect(x+pad,y+size-pad-size*.035,size-pad*2,size*.035);
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=`900 ${Math.min(size*.37,lineHeight)}px Impact, 'Arial Black', sans-serif`;
    for(const [i,line] of lines.entries())ctx.fillText(line,x+size/2,y+size/2+(i-(lines.length-1)/2)*lineHeight,size*.89);
}
