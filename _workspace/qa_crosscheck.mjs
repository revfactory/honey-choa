// QA cross-check: data <-> front boundary. Run with: node _workspace/qa_crosscheck.mjs
import fs from "node:fs";
const read = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const channel = read("../data/channel.json");
const videos = read("../data/videos.json");
const shorts = read("../data/shorts.json");
const curated = read("../data/curated.json");

const out = [];
const log = (...a) => out.push(a.join(" "));
const FAIL = [];
const fail = (sev, msg) => { FAIL.push(`[${sev}] ${msg}`); log(`  !! [${sev}] ${msg}`); };

log("=== 1. COUNTS ===");
log(`channel.statistics.videoCount = ${channel.statistics.videoCount}`);
log(`videos: wrapper.count=${videos.count} items=${videos.items.length}`);
log(`shorts: wrapper.count=${shorts.count} items=${shorts.items.length}`);
const vIsShortFalse = videos.items.filter(v => v.isShort === false).length;
const vIsShortTrue = videos.items.filter(v => v.isShort === true).length;
const vIsShortNull = videos.items.filter(v => v.isShort === null).length;
const sIsShortTrue = shorts.items.filter(v => v.isShort === true).length;
const sIsShortFalse = shorts.items.filter(v => v.isShort === false).length;
const sIsShortNull = shorts.items.filter(v => v.isShort === null).length;
log(`videos.json isShort: false=${vIsShortFalse} true=${vIsShortTrue} null=${vIsShortNull}`);
log(`shorts.json isShort: true=${sIsShortTrue} false=${sIsShortFalse} null=${sIsShortNull}`);
if (videos.items.length !== 179) fail("MAJOR", `videos.json item count ${videos.items.length} != expected 179`);
if (shorts.items.length !== 1425) fail("MAJOR", `shorts.json item count ${shorts.items.length} != expected 1425`);
if (vIsShortTrue > 0) fail("MAJOR", `videos.json contains ${vIsShortTrue} items with isShort=true (should be longform only)`);
if (sIsShortFalse > 0) fail("MAJOR", `shorts.json contains ${sIsShortFalse} items with isShort=false`);
if (vIsShortNull > 0) fail("MINOR", `videos.json has ${vIsShortNull} isShort=null`);
if (sIsShortNull > 0) fail("MINOR", `shorts.json has ${sIsShortNull} isShort=null`);

log("\n=== 2. RAW PK uniqueness + cross-file overlap ===");
const vIds = videos.items.map(v=>v.videoId), sIds = shorts.items.map(v=>v.videoId);
const allIds = [...vIds, ...sIds];
const idSet = new Set(allIds);
if (idSet.size !== allIds.length) fail("MAJOR", `duplicate videoIds across raw: ${allIds.length - idSet.size} dupes`);
const overlap = vIds.filter(id => sIds.includes(id));
if (overlap.length) fail("MAJOR", `videoId in BOTH videos & shorts: ${overlap.slice(0,5).join(",")} (n=${overlap.length})`);
log(`total unique raw ids = ${idSet.size} (videos ${vIds.length} + shorts ${sIds.length})`);

log("\n=== 3. CURATED schemaVersion + dangling refs (boundary #2) ===");
log(`curated.schemaVersion = ${JSON.stringify(curated.schemaVersion)}`);
if (curated.schemaVersion !== "1.0.0") fail("BLOCKER", `schemaVersion ${curated.schemaVersion} != 1.0.0 -> content.ts throws at build`);
log(`curated.items = ${curated.items.length}, tracks = ${curated.tracks.length}`);
const rawIdSet = idSet;
const danglingItems = curated.items.filter(c => !rawIdSet.has(c.videoId));
if (danglingItems.length) fail("BLOCKER", `curated.items reference ${danglingItems.length} videoIds NOT in raw (dropped+warn per schema). e.g. ${danglingItems.slice(0,5).map(d=>d.videoId).join(",")}`);
else log("  all curated.items.videoId exist in raw ✓");
// duplicate curated items
const curIdCounts = {};
curated.items.forEach(c => curIdCounts[c.videoId] = (curIdCounts[c.videoId]||0)+1);
const curDupes = Object.entries(curIdCounts).filter(([,n])=>n>1);
if (curDupes.length) fail("MAJOR", `curated.items has duplicate videoId entries: ${curDupes.slice(0,5).map(([k,n])=>k+"x"+n).join(",")}`);

log("\n=== 4. relatedIds integrity (boundary: orphan refs) ===");
let relTotal=0, relOrphan=0; const relOrphanEx=[];
curated.items.forEach(c => {
  (c.relatedIds||[]).forEach(rid => {
    relTotal++;
    if (!rawIdSet.has(rid)) { relOrphan++; if(relOrphanEx.length<8) relOrphanEx.push(`${c.videoId}->${rid}`); }
  });
});
log(`relatedIds total=${relTotal}, orphan(not in raw)=${relOrphan}`);
if (relOrphan) fail("MAJOR", `relatedIds orphan refs ${relOrphan}: ${relOrphanEx.join(", ")}`);

log("\n=== 5. TRACK step integrity (boundary #4) ===");
const curatedByIdMap = new Map(curated.items.map(c=>[c.videoId,c]));
curated.tracks.forEach(t => {
  const stepIds = t.steps.map(s=>s.videoId);
  const orphanSteps = stepIds.filter(id => !rawIdSet.has(id));
  const uncuratedSteps = stepIds.filter(id => !curatedByIdMap.has(id));
  const card0 = curatedByIdMap.get(stepIds[0]);
  log(`track ${t.trackId} (genre=${t.genre}): steps=${t.steps.length}, firstDifficulty=${card0?card0.difficulty:"<uncurated>"}`);
  if (t.steps.length < 5) fail("MAJOR", `track ${t.trackId} has ${t.steps.length} steps (<5 required)`);
  if (orphanSteps.length) fail("BLOCKER", `track ${t.trackId} step videoId NOT in raw -> getTrackView drops silently: ${orphanSteps.join(",")}`);
  if (uncuratedSteps.length) fail("MINOR", `track ${t.trackId} references uncurated videoId (card exists but no difficulty): ${uncuratedSteps.join(",")}`);
  // monotonic difficulty
  const order={beginner:0,intermediate:1,advanced:2};
  const diffs = stepIds.map(id=>{const c=curatedByIdMap.get(id); return c?c.difficulty:undefined;});
  const known = diffs.filter(d=>d!=null);
  for(let i=1;i<known.length;i++){ if(order[known[i]]<order[known[i-1]]){ fail("MINOR",`track ${t.trackId} difficulty not monotonic at step ${i} (${known[i-1]}->${known[i]})`); break; } }
  // genre consistency
  const offGenre = stepIds.filter(id=>{const c=curatedByIdMap.get(id); return c && c.genre!==t.genre;});
  if (offGenre.length) fail("MINOR", `track ${t.trackId} (genre ${t.genre}) has off-genre steps: ${offGenre.length}`);
});

log("\n=== 6. ENUM domain validation (boundary: enum->label) ===");
const TYPES=["workshop","performance","social","battle","fancam","music_mix","challenge","tutorial","basics","vlog_etc","unclassified"];
const GENRES=["bachata","salsa","zouk","kizomba","latin_pop","etc"];
const DIFFS=["beginner","intermediate","advanced"];
const badType=new Set(),badGenre=new Set(),badDiff=new Set(),badSub=new Set();
curated.items.forEach(c=>{
  if(!TYPES.includes(c.type)) badType.add(c.type);
  if(!GENRES.includes(c.genre)) badGenre.add(c.genre);
  if(c.difficulty!==null && c.difficulty!==undefined && !DIFFS.includes(c.difficulty)) badDiff.add(c.difficulty);
  (c.subGenres||[]).forEach(g=>{ if(!GENRES.includes(g)) badSub.add(g); });
});
if(badType.size) fail("MAJOR",`unknown ContentType enum values (raw enum would show as label-miss): ${[...badType].join(",")}`);
if(badGenre.size) fail("MAJOR",`unknown Genre enum values: ${[...badGenre].join(",")}`);
if(badDiff.size) fail("MAJOR",`unknown Difficulty enum values: ${[...badDiff].join(",")}`);
if(badSub.size) fail("MINOR",`unknown subGenre enum values: ${[...badSub].join(",")}`);
if(!badType.size&&!badGenre.size&&!badDiff.size&&!badSub.size) log("  all enum values within declared domain ✓");
// difficulty rule: only on workshop/tutorial/basics/practice
const diffOnWrong = curated.items.filter(c=>c.difficulty!=null && !["workshop","tutorial","basics"].includes(c.type));
if(diffOnWrong.length) log(`  note: ${diffOnWrong.length} items have difficulty on type not in {workshop,tutorial,basics} (e.g. ${diffOnWrong.slice(0,3).map(c=>c.type).join(",")})`);

log("\n=== 7. THUMBNAIL fallback (boundary #6) ===");
const FB=["maxres","standard","high","medium","default"];
const resolve=(t)=>{for(const k of FB){if(t[k]&&t[k].url)return t[k].url;}return "";};
let noMaxresV=0,noMaxresS=0,emptyThumb=0; const emptyEx=[];
videos.items.forEach(v=>{ if(!v.thumbnails.maxres)noMaxresV++; if(!resolve(v.thumbnails)){emptyThumb++; if(emptyEx.length<5)emptyEx.push(v.videoId);} });
shorts.items.forEach(v=>{ if(!v.thumbnails.maxres)noMaxresS++; if(!resolve(v.thumbnails)){emptyThumb++; if(emptyEx.length<5)emptyEx.push(v.videoId);} });
log(`videos missing maxres = ${noMaxresV}, shorts missing maxres = ${noMaxresS}`);
log(`items where fallback chain yields EMPTY string = ${emptyThumb}`);
if(emptyThumb) fail("MAJOR",`thumbnail fallback empty for ${emptyThumb} items (broken img): ${emptyEx.join(",")}`);
else log("  fallback chain resolves a url for every item ✓");

log("\n=== 8. STATS cross-check (boundary: stats vs recompute) ===");
// recompute library facets (longform isShort=false)
const libByType={},libByGenre={},libByDiff={beginner:0,intermediate:0,advanced:0,none:0};
videos.items.forEach(v=>{const c=curatedByIdMap.get(v.videoId);const type=c?c.type:"uncurated";libByType[type]=(libByType[type]||0)+1;const g=c?c.genre:null;if(g)libByGenre[g]=(libByGenre[g]||0)+1;const d=c?c.difficulty:null;libByDiff[d||"none"]++;});
const libTotal=videos.items.length;
log(`getLibraryFacets recompute: total=${libTotal} (should equal longform 179)`);
log(`  library byType: ${JSON.stringify(libByType)}`);
log(`  library byGenre: ${JSON.stringify(libByGenre)}`);
log(`  library byDifficulty: ${JSON.stringify(libByDiff)}`);
// curated.stats.total vs items
log(`curated.stats.total=${curated.stats.total}, curated.items.length=${curated.items.length}`);
if(curated.stats.total!==curated.items.length) fail("MINOR",`curated.stats.total ${curated.stats.total} != items ${curated.items.length}`);
// stats byType sum
const sumByType=Object.values(curated.stats.byType).reduce((a,b)=>a+b,0);
log(`curated.stats byType sum=${sumByType}`);
// stats keys must be valid enums (Record<ContentType,number> typed but data could have stray)
const statTypeKeys=Object.keys(curated.stats.byType||{});
const strayStatType=statTypeKeys.filter(k=>!TYPES.includes(k));
if(strayStatType.length) fail("MINOR",`curated.stats.byType has stray keys: ${strayStatType.join(",")}`);
// is library total != stats total (the spec warns against using合算 stats for library)
log(`  NOTE: library longform total ${libTotal} vs合算 stats total ${curated.stats.total} -> must NOT use stats for library chips`);

log("\n=== 9. EMBEDDABLE (boundary #5 player fallback) ===");
const notEmbedV=videos.items.filter(v=>v.embeddable===false).length;
const notEmbedS=shorts.items.filter(v=>v.embeddable===false).length;
const missEmbed=[...videos.items,...shorts.items].filter(v=>typeof v.embeddable!=="boolean").length;
log(`embeddable=false: videos=${notEmbedV} shorts=${notEmbedS}; non-boolean embeddable=${missEmbed}`);
if(missEmbed) fail("MAJOR",`${missEmbed} items have non-boolean embeddable`);

log("\n=== 10. CHANNEL shape (boundary #1) ===");
const reqCh=["channelId","title","handle","description","publishedAt","thumbnails","statistics","fetchedAt"];
const missCh=reqCh.filter(k=>!(k in channel));
if(missCh.length) fail("MAJOR",`channel missing fields: ${missCh.join(",")}`);
if(!("id" in channel) && "channelId" in channel) log("  channel uses channelId (not id) ✓");
const reqStat=["subscriberCount","videoCount","viewCount"];
const missStat=reqStat.filter(k=>!(k in (channel.statistics||{})));
if(missStat.length) fail("MAJOR",`channel.statistics missing: ${missStat.join(",")}`);
log(`  subs=${channel.statistics.subscriberCount} videoCount=${channel.statistics.videoCount} views=${channel.statistics.viewCount}`);

log("\n=== 11. REQUIRED item fields type check (boundary #1, sample all) ===");
const checkItem=(v,src)=>{
  const errs=[];
  if(typeof v.videoId!=="string")errs.push("videoId");
  if(typeof v.title!=="string")errs.push("title");
  if(typeof v.description!=="string")errs.push("description");
  if(typeof v.durationSeconds!=="number")errs.push("durationSeconds");
  if(!Array.isArray(v.tags))errs.push("tags");
  if(typeof v.statistics?.viewCount!=="number")errs.push("statistics.viewCount");
  if(typeof v.statistics?.likeCount!=="number")errs.push("statistics.likeCount");
  if(typeof v.statistics?.commentCount!=="number")errs.push("statistics.commentCount");
  return errs;
};
let typeErrCount=0; const typeErrEx=[];
[...videos.items.map(v=>[v,"v"]),...shorts.items.map(v=>[v,"s"])].forEach(([v,src])=>{const e=checkItem(v,src);if(e.length){typeErrCount++;if(typeErrEx.length<5)typeErrEx.push(`${v.videoId}:${e.join("/")}`);}});
if(typeErrCount) fail("MAJOR",`${typeErrCount} items have type mismatches: ${typeErrEx.join(" ; ")}`);
else log("  all items match declared required field types ✓");

log("\n=== SUMMARY ===");
log(`Total defects flagged by data crosscheck: ${FAIL.length}`);
FAIL.forEach(f=>log("  "+f));
console.log(out.join("\n"));
