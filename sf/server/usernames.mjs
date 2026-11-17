export const RENAME_COOLDOWN_MS=60_000;
// Kept server-side. Never use the rendered/escaped name as an identity key.
const forbidden=['fuck','fuk','fuc','fck','fuq','fook','fack','shit','shyt','shet','bitch','bich','biatch','cunt','kunt','cock','dick','pussy','pussie','asshole','arsehole','motherfucker','wanker','twat','bollock','bastard','douche','slut','whore','piss','prick','jizz','nigger','nigga','faggot','fag','retard','rape','rapist'];
const substitutions={'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','9':'g'};
export function normalizeUsername(value){
    if(typeof value!=='string')return {ok:false,message:'Choose a username with 1–12 letters, numbers, or underscores.'};
    const name=value.normalize('NFKC').trim();
    if(!/^[A-Za-z0-9_]{1,12}$/.test(name))return {ok:false,message:'Use 1–12 letters, numbers, or underscores.'};
    const canonical=name.toLowerCase(),letters=canonical.replace(/[01345789]/g,c=>substitutions[c]).replace(/_/g,'').replace(/ph/g,'f'),fold=s=>s.replace(/(.)\1+/g,'$1');
    // Check both spellings: digit substitutions must not hide ordinary text.
    const variants=[canonical.replace(/_/g,''),letters,letters.replace(/i/g,'l'),letters.replace(/v/g,'u')];
    const bad=variants.some(v=>['ass','arse','tit','tits','cum','sex'].includes(v)||forbidden.some(word=>v.includes(word)||fold(v).includes(fold(word))));
    if(bad||/^guest\d+$/i.test(name))return {ok:false,message:'That username is unavailable. Please choose another.'};
    return {ok:true,name,canonical};
}
export function renameDecision({name,owner,now,lastChanged=0,current=null,takenBy=null}){
    const result=normalizeUsername(name);if(!result.ok)return result;
    if(current?.toLowerCase()===result.canonical)return {ok:true,name:current,unchanged:true,retryAt:lastChanged+RENAME_COOLDOWN_MS};
    if(lastChanged&&now<lastChanged+RENAME_COOLDOWN_MS)return {ok:false,message:'Wait '+Math.ceil((lastChanged+RENAME_COOLDOWN_MS-now)/1000)+' seconds before changing your username.',retryAt:lastChanged+RENAME_COOLDOWN_MS};
    if(takenBy&&takenBy!==owner)return {ok:false,message:'That username is already taken.'};
    return {...result,retryAt:now+RENAME_COOLDOWN_MS};
}
