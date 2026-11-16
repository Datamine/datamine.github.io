/** A small residential lane finishes the southwest edge without extending the
 * traffic grid into the cow pasture or the technology campuses. */
export const SOUTHERN_GREENWAYS=Object.freeze([
    {name:'Coastal garden lane',halfWidth:.3,points:[[18,167.5],[18,169.1],[38,169.1],[38,167.5]]},
    {name:'Coastal orchard walk',halfWidth:.3,points:[[18,169.1],[18,175],[30.3,175],[30.3,172.7],[38.7,172.7],[38.7,169.1],[38,169.1]]}
]);
export const COASTAL_GARDEN_HOMES=Object.freeze([20,23.5,27,30.5,34,37].map((x,i)=>Object.freeze({x,z:170.85,w:i===5?2.5:3.05,d:2.4,rotation:Math.PI,district:i%2?'craftsman':'coastal',seed:.16+i*.127,street:'Coastal garden lane'})));
