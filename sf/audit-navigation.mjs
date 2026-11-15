import {createWorldModel} from './world.js';
import {auditWorldNavigation} from './navigation-audit.js';

const start=performance.now(),report=auditWorldNavigation(createWorldModel());
if(!report.ok){console.error(report.errors.join('\n'));process.exitCode=1;}
console.log(JSON.stringify({ok:report.ok,milliseconds:Math.round(performance.now()-start),walkableCells:report.graph.nodes,edges:report.graph.edges,components:report.graph.components,destinations:report.destinations,routes:report.routes.length},null,2));
