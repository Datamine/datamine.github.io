import {WebSocket} from 'ws';
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {MP_PROTOCOL} from '../multiplayer-protocol.js';

const arg=(name,fallback)=>{const index=process.argv.indexOf('--'+name);return index<0?fallback:process.argv[index+1];};
const url=arg('url','ws://127.0.0.1:8787/ws'),count=Number(arg('players',2000)),seconds=Number(arg('seconds',30)),output=arg('output',null);
if(!Number.isInteger(count)||count<1||count>10000||!Number.isFinite(seconds)||seconds<5||seconds>600)throw Error('Use --players 1..10000 and --seconds 5..600');
const clients=[],gaps=[],latencies=[];let bytes=0,frames=0,unexpectedCloses=0,measuring=false,stopping=false,poseTimer,poseTicks=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function connect(index){
    const ws=new WebSocket(url),token=randomBytes(32).toString('hex'),client={ws,spawn:null,lastFrame:0,index};clients.push(client);
    await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(Error('Connection '+index+' timed out')),30000);
        ws.once('open',()=>ws.send(JSON.stringify({type:'hello',protocol:MP_PROTOCOL,token,privateState:{'sf-purse-v1':'{"coins":25}'}})));
        ws.on('error',reject);ws.on('close',()=>{if(!stopping)unexpectedCloses++;});
        ws.on('message',(data,binary)=>{
            if(binary){if(measuring){const current=performance.now();bytes+=data.length;frames++;if(client.lastFrame)gaps.push(current-client.lastFrame);client.lastFrame=current;const sent=data.readUInt32LE(8),latency=((Date.now()>>>0)-sent)>>>0;if(latency<60000)latencies.push(latency);}return;}
            if(measuring)bytes+=data.length;
            if(!client.spawn){const message=JSON.parse(data);if(message.type==='welcome'){client.spawn=message.position;clearTimeout(timeout);resolve();}}
        });
    });
}
try{
    for(let start=0;start<count;start+=100){await Promise.all(Array.from({length:Math.min(100,count-start)},(_,i)=>connect(start+i)));if(start%500===0)console.log('Connected',Math.min(start+100,count));}
    const begin=performance.now();
    poseTimer=setInterval(()=>{const time=(performance.now()-begin)/1000;poseTicks++;for(const c of clients){if(c.ws.readyState!==WebSocket.OPEN||c.ws.bufferedAmount>65536)continue;const phase=time+c.index*.01,p=c.spawn;c.ws.send(JSON.stringify({type:'pose',pose:{x:p.x+Math.sin(phase)*.12,z:p.z+Math.cos(phase)*.12,y:p.y,angle:phase,phase:time*3,motion:.3,moving:true,mode:'walk',hp:30}}));if(poseTicks%30===0)c.ws.send(JSON.stringify({type:'checkpoint',privateState:{'sf-purse-v1':'{"coins":25,"equity":0,"grain":0,"fuelCans":0,"sand":0,"ownedHats":[]}','sf-strength-v1':'{"xp":0,"funded":false}','sf-character-v1':'{"gender":"man","shirt":"#707b4b","pants":"#626955","skin":"#bd9369","cape":false}','sf-quests-v1':'{"monkey":"not-started"}','sf-expeditions-v1':'{"railgun":false,"raptor":"not-started"}'},awardsAck:[]}));}},100);
    console.log('Warming up',count,'simultaneous moving WebSocket clients…');await sleep(3000);measuring=true;const start=performance.now();await sleep(seconds*1000);const elapsed=(performance.now()-start)/1000;measuring=false;
    const percentile=(list,p)=>{list.sort((a,b)=>a-b);return +(list[Math.min(list.length-1,Math.floor(list.length*p))]||0).toFixed(2);};
    const healthURL=new URL(url);healthURL.protocol=healthURL.protocol==='wss:'?'https:':'http:';healthURL.pathname='/healthz';const server=await(await fetch(healthURL)).json();
    const report={players:count,seconds:+elapsed.toFixed(2),framesPerPlayerSecond:+(frames/count/elapsed).toFixed(2),frameGapP95Ms:percentile(gaps,.95),frameGapP99Ms:percentile(gaps,.99),snapshotLatencyP95Ms:percentile(latencies,.95),receivedMBPerSecond:+(bytes/elapsed/1e6).toFixed(2),unexpectedCloses,server};
    console.log(JSON.stringify(report,null,2));if(output)await writeFile(output,JSON.stringify(report,null,2)+'\n');
    if(unexpectedCloses||report.framesPerPlayerSecond<8||report.frameGapP99Ms>500)process.exitCode=1;
}finally{stopping=true;clearInterval(poseTimer);for(const c of clients)c.ws.terminate();}
