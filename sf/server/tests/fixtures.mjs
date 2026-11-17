import {MP_PROTOCOL} from '../../multiplayer-protocol.js';
import {createMemoryStore} from '../store.mjs';
import {createGame} from '../game.mjs';
import {createAirship} from '../../airship.js';
export function fixtureGeometry(){return {spawn:{x:91.7,y:119.5},hospital:{x:74.7,y:89.5},merchants:[],airship:createAirship(),landClearAt:(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>-100&&x<200&&y>-100&&y<200,characterGround:()=>1.15,canTravel:()=>true,pathTo:(x,y)=>[{x,y}],nearestGround:(x,z)=>({x,z})};}
export async function fixture(){let time=1000000;const store=createMemoryStore(),game=await createGame({geometry:fixtureGeometry(),store,now:()=>time,random:()=>.5,allowDebug:true});return {game,store,advance:ms=>time+=ms};}
export async function player(game,number,privateState={}){const messages=[],transport={open:true,bufferedAmount:0,send:value=>messages.push(typeof value==='string'?JSON.parse(value):value),close(code,reason){this.open=false;messages.push({closed:code,reason});}};const token=number.toString(16).padStart(64,'0');const p=await game.connect({type:'hello',protocol:MP_PROTOCOL,token,privateState:{'sf-purse-v1':JSON.stringify({coins:25}),'sf-expeditions-v1':JSON.stringify({railgun:true}),...privateState}},transport);return {p,messages,transport,token};}
export async function command(game,p,action,args={}){game.receive(p,{type:'command',request:Math.random(),action,args});await p.queue;}
export const latestResult=messages=>messages.filter(m=>m.type==='result').at(-1);
