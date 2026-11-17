import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {Script} from 'node:vm';
import {renderMaterialAssets,writeMaterialAssets} from './build-materials.mjs';
import {createWorldModel} from './world.js';
import {auditWorldNavigation} from './navigation-audit.js';
import {BILLBOARD_ART} from './billboards.js';
import {RESEARCH_ART} from './research-art.js';

const root=new URL('../',import.meta.url);
const entry=/<!-- SF-ENTRY:START -->[\s\S]*?<!-- SF-ENTRY:END -->/;
const modules=['billboards.js','material-catalog.mjs','materials.js','alpine-materials.js','glazing.js','static-batches.js','geometry.js','wall-openings.js','neighborhood-palette.js','southern-house-details.js','hat-catalog.js','hat-models.js','street-ground.js','shadows.js','windows.js','rooftops.js','city-hall.js','offices.js','tiles.js','navigation.js','regional-navigation.js','minimap-navigation.js','water-tiles.js','geography.js','city-edge.js','map-colors.js','institute-interiors.js','research-layout.js','fitness-layout.js','jurassic-layout.js','gpu-layout.js','airport-billboards.js','salt-layout.js','haberdasher-layout.js','tech-layout.js','square-construction-layout.js','coastline.js','social-layout.js','runoff-surface.js','southern-greenways.js','peninsula-urbanism.js','southern-expansion.js','times-square-layout.js','southern-layout.js','estate-layout.js','southern-terrain.js','economy.js','salt-mail.js','haberdashery.js','tech-ventures.js','strength.js','forward-roll.js','ai-lab-interior.js','ai-lab.js','ai-interview-ui.js','combat.js','combat-feedback.js','deli.js','traffic-signals.js','street-traffic.js','slow-bus.js','transit-models.js','dialogue.js','debug-console.js','banking.js','bank-models.js','bank-ui.js','guild.js','map-instances.js','stealth-bomber.js','illuminati-models.js','secret-adventures.js','guild-models.js','levels.js','player-follow.js','multiplayer-protocol.js','multiplayer-client.js','multiplayer-inventory.js','multiplayer-world.js','they-live.js','quests.js','quest-menu.js','building-interactions.js','descriptions.js','wildlife.js','bunny.js','skate-dog.js','downtown.js','transamerica.js','soma-pyramid.js','housing.js','sutro.js','environment.js','lighting.js','characters.js','character-config.js','sunglasses.js','capture-animation.js','inebriation.js','sales-conference.js','bottle-post.js','social-buildings.js','rehabilitation.js','fishing.js','companions.js','life.js','western-coast-details.js','npc-roaming.js','restaurants.js','shipping.js','nightlife.js','airship-basket.js','airship.js','airship-rope.js','commerce-world.js','rocket.js','southern-district.js','southern-craft-layout.js','southern-craft.js','southern-street-gardens.js','rail-works.js','square-construction.js','times-square.js','times-square-life.js','research-dialogue.js','research-art.js','research-architecture.js','research-campuses.js','street-light-layout.js','peninsula-details.js','woodland-park.js','estate-design.js','estate-homes.js','estate-life.js','estate-architecture.js','southern-neighborhood.js','zoo-encounter.js','monkey-escape.js','motorcycle.js','zoo.js','zoo-animals.js','tahoe.js','regional-road.js','ferrari.js','fuel.js','adventure-sites.js','berkeley-campus.js','alien-sites.js','shipyard.js','parrots.js','skateboard.js','gym-exercises.js','prometheus.js','windsurfing.js','surfing.js','jurassic.js','jurassic-models.js','gpu-factory.js','salt-flats.js','haberdasher-shop.js','tech-buildings.js','encounters.js','wayfinding.js','models.js','world.js'];

function replaceEntry(html,runtime){
    if(!entry.test(html))throw new Error('index.html is missing its SF-ENTRY markers');
    if(!html.includes('<html lang="en">'))throw new Error('Cannot mark the Explore SF document');
    return html.replace('<html lang="en">','<html lang="en" data-sf-entry="explore">').replace(entry,()=>runtime);
}

/** The development page uses the original modules and separately loaded SVG. */
export function renderDevelopment(html){
    return replaceEntry(html,'<script type="module" src="./sf/world.js"></script>');
}

/** Flatten the small, explicit module graph without a dependency or build tool. */
export async function renderExplore(html,materialAtlas=null){
    const artwork=materialAtlas||(await renderMaterialAssets()).atlas;
    // Keep labels and formatting in the source assets and developer reference,
    // while embedding a compact copy of the same image in the production page.
    const svg=artwork.replace(/<!--[\s\S]*?-->/g,'').replace(/>\s+</g,'><').trim();
    const alpineArtwork=await readFile(new URL('textures/alpine-materials.svg',root),'utf8');
    const billboardFiles=BILLBOARD_ART.map(art=>art.file);
    const embeddedBillboards=Object.fromEntries(await Promise.all(billboardFiles.map(async file=>[file,await readFile(new URL('textures/billboards/'+file,root),'utf8')])));
    const embeddedResearchArt=Object.fromEntries(await Promise.all(RESEARCH_ART.map(async art=>[art.file,await readFile(new URL('textures/research/'+art.file,root),'utf8')])));
    const sources=await Promise.all(modules.map(name=>readFile(new URL('sf/'+name,root),'utf8')));
    const bundled=sources.map((source,i)=>{
        if(modules[i]==='billboards.js'){
            source=source.replace("const billboardAssetURL=name=>new URL('../textures/billboards/'+name,import.meta.url).href;",()=>`const embeddedBillboards=${JSON.stringify(embeddedBillboards)};\nconst billboardAssetURL=name=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(embeddedBillboards[name]);`);
        }
        if(modules[i]==='research-art.js'){
            source=source.replace("const researchAssetURL=name=>new URL('../textures/research/'+name,import.meta.url).href;",()=>`const embeddedResearchArt=${JSON.stringify(embeddedResearchArt)};\nconst researchAssetURL=name=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(embeddedResearchArt[name]);`);
        }
        if(modules[i]==='alpine-materials.js'){
            const alpine=alpineArtwork;
            source=source.replace("const alpineAtlasURL=new URL('../textures/alpine-materials.svg',import.meta.url);",()=>`const alpineAtlasURL={href:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(${JSON.stringify(alpine)})};`);
        }
        if(modules[i]==='materials.js'){
            const declaration="const atlasURL=new URL('../textures/sf-materials.svg',import.meta.url);";
            if(!source.includes(declaration))throw new Error('Material atlas URL changed; update the standalone build');
            source=source.replace(declaration,()=>`const atlasURL={href:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(${JSON.stringify(svg)})};`);
        }
        return `// Source: sf/${modules[i]}\n`+source
            .replace(/^import [^\n]+;\r?\n/gm,'')
            .replace(/^export\s*\{[^}]*\};?\s*$/gm,'')
            .replace(/^export (?=(?:const|let|function|class|async function)\b)/gm,'');
    }).join('\n\n');
    const runtime=`'use strict';\n(() => {\n${bundled}\n})();\n`.replace(/<\/script/gi,'<\\/script');
    // Fail before writing if a future import/export cannot be flattened safely.
    new Script(runtime,{filename:'explore.html'});
    return replaceEntry(html,`<!-- Generated by node sf/build.mjs. Edit sf sources and textures/materials/*.svg. -->\n<script>\n${runtime}</script>`);
}

export async function build(){
    const navigation=auditWorldNavigation(createWorldModel());
    if(!navigation.ok)throw new Error('World navigation validation failed:\n'+navigation.errors.join('\n'));
    const html=await readFile(new URL('index.html',root),'utf8');
    const assets=await renderMaterialAssets();
    const output=await renderExplore(html,assets.atlas);
    await writeMaterialAssets(assets);
    await writeFile(new URL('explore.html',root),output);
    return {file:'explore.html',bytes:Buffer.byteLength(output),navigation:{destinations:navigation.destinations,routes:navigation.routes.length}};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    const result=await build();
    console.log(`Built ${result.file} (${result.bytes.toLocaleString()} bytes); works with file:// and static hosting.`);
    console.log(`Navigation verified: ${result.navigation.destinations} destinations, ${result.navigation.routes} routes.`);
}
