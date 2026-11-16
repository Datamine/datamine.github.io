export const GPU_FACTORY=Object.freeze({x:78.3,z:170.7,w:4.8,d:4.6,base:1.6,entry:Object.freeze({x:77.8,y:174.4})});
export function inGPUFactoryGrounds(x,z,margin=0){const f=GPU_FACTORY;return Math.abs(x-f.x)<=f.w/2+.4+margin&&z>=f.z-f.d/2-.3-margin&&z<=175.6+margin;}
export const GPU_FACTORY_PATH=Object.freeze({name:'GPU Factory access',halfWidth:.35,points:[[75.5,175.5],[78.3,175.5],[78.3,173.5]]});
