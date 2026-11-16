// Building meshes, context menus and hover text share this rule. A building
// may describe its service; selecting it never selects the person providing it.
const buildingNPCsByID=Object.freeze({
    cityhall:'clerk','lucindas-deli':'deli',cotogna:'chef','shanghai-kelly':'bartender','ai-lab':'recruiter'
});
const buildingNPCsByKind=Object.freeze({
    'apple-campus':'tim-apple','robotaxi-dealer':'robotaxi-sales',haberdasher:'haberdasher','salt-flats':'salt-activist','gpu-factory':'gpu-buyer',
    'industrial-center':'armorer','esoteric-institute':'esoteric','research-institute':'researcher',
    'tax-hq':'tax',startup:'founder',capital:'capital',spaceport:'crew','ski-rental':'lift',
    fuel:'fuel-attendant',dealership:'fuel-attendant'
});
export function buildingNPCService(site){return site?(buildingNPCsByID[site.id]||buildingNPCsByKind[site.kind]||null):null;}

/** Staff stand on an actual reachable surface beside their service. The
 * caller supplies the world's native navigation, including highway and Tahoe. */
export function serviceStaffPosition(entry,{walkable,canTravel}){
    for(const [dx,dy] of [[.25,.125],[-.25,.125],[0,.25],[0,-.25],[.125,0],[-.125,0],[0,0]]){
        const p={x:entry.x+dx,y:entry.y+dy};if(walkable(p)&&canTravel(entry,p))return p;
    }
    throw new Error('Service needs a reachable staff position at '+JSON.stringify(entry));
}
