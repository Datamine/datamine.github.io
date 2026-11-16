/** Five coordinated southern architectural families; neighboring homes share
 * a palette while doors, roofs, and detailing vary within that family. */
export const SOUTHERN_PALETTES=Object.freeze({
    coastal:['#78aaa4','#dfad7c','#a1bad0','#c29eae','#d7c389'],
    garden:['#91af82','#d3997c','#aec3a4','#ccba8b','#8bafb0'],
    deco:['#8cb7b5','#d6b48a','#cb9294','#a4b3c9','#c7ba94'],
    craftsman:['#71918a','#bb8e68','#8c9a73','#a89a7c','#7f9ba3'],
    mediterranean:['#dfb68d','#d3a18c','#dabf99','#b7bf98','#d8af9c']
});
export function southernHousingStyle(p){
    if(p.x<27)return p.z<128?'coastal':'mediterranean';
    if(p.x>65)return 'deco';
    const block=Math.floor((p.x-28.5)/7)+Math.floor((p.z-99.5)/8)*3;
    return ['garden','craftsman','deco','mediterranean','coastal'][(block%5+5)%5];
}
