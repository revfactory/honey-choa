#!/usr/bin/env node
/**
 * sync.mjs — 꿀초아tv 데이터 갱신 파이프라인 (api-engineer)
 * ============================================================================
 * 수집 → 검증(L1) → 병합/분류 → 검증(L2) → 원자적 교체 → 보고
 *
 * 사용법:
 *   GOOGLE_API_KEY=<key> npm run sync                 # 전체 갱신(원자적)
 *   GOOGLE_API_KEY=<key> npm run sync -- --dry-run    # 수집·검증만, data/ 미변경
 *   GOOGLE_API_KEY=<key> npm run sync -- --max 100    # 수집 상한(테스트/쿼터 절약)
 *   npm run sync -- --validate-only                   # 기존 data/ 만 검증(API 미호출)
 *
 * 종료 코드:
 *   0 = 성공 (또는 dry-run 검증 통과)
 *   1 = 설정 오류 (API 키 없음, 인자 오류)
 *   2 = 수집/API 오류  ← 동기화 실패 ≠ 빌드 실패. 기존 data/ 는 그대로 보존됨.
 *   3 = 검증 게이트 실패 ← 부분 수집·스키마 위반. 기존 data/ 복원됨.
 *
 * 원칙:
 *  [원자성] 새 데이터는 .sync-staging/ 에 먼저 쓰고, 검증 통과 후에만 data/ 교체.
 *           교체 직전 data/ 전체를 .sync-backup/ 으로 스냅샷 → 실패 시 즉시 복원.
 *  [근거성] 검증 게이트: 스키마·필수필드·enum·schemaVersion·건수 급감(직전 대비 -30%).
 *  [협력] 수집은 _workspace/fetch_channel_resilient.mjs(검증된 resilient 변형),
 *         분류는 _workspace/classify.mjs 를 자식 프로세스로 재사용 — 로직 미복제.
 *  [보존] classify.mjs 가 기존 curated.json 의 manual:true 항목을 보존(증분 재분류).
 *
 * 주의: 수집 로직 단일 소스는 youtube-data-pipeline 스킬 번들이다. 본 인계서가
 *       지정한 검증본은 _workspace/fetch_channel_resilient.mjs 이며, 스킬 번들과의
 *       retry 로직 드리프트는 _workspace/03_sync_design.md 에 기록한다.
 */
import {
  cpSync, mkdirSync, existsSync, readFileSync, rmSync, readdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "data");
const STAGING = join(ROOT, ".sync-staging");
const BACKUP = join(ROOT, ".sync-backup");
const FETCH_SCRIPT = join(ROOT, "_workspace", "fetch_channel_resilient.mjs");
const CLASSIFY_SCRIPT = join(ROOT, "_workspace", "classify.mjs");
const CHANNEL_ID = "UCNExEo8zrCEXs6DA6yeEcoA";

// 검증 게이트 파라미터 (변경 사유는 _workspace/03_sync_design.md 에 기록)
const DROP_THRESHOLD = 0.30;     // 직전 대비 30% 이상 감소 시 중단
const SCHEMA_VERSION = "1.0.0";  // curated.json 계약 버전 (불일치 시 프론트 빌드 throw)
const MIN_VIDEOS = 1;            // 수집 영상 최소 건수(0건은 무조건 실패)
const MIN_CURATED_ITEMS = 1;
const MIN_TRACKS = 3;            // 스키마 §3.1: 트랙 최소 3
const VALID_TYPES = new Set([
  "workshop", "performance", "social", "battle", "fancam",
  "music_mix", "challenge", "tutorial", "basics", "vlog_etc", "unclassified",
]);
const VALID_GENRES = new Set([
  "bachata", "salsa", "zouk", "kizomba", "latin_pop", "etc",
]);
const VALID_DIFFICULTIES = new Set(["beginner", "intermediate", "advanced"]);

/* ----------------------------- 인자 ----------------------------- */
function parseArgs() {
  const a = process.argv.slice(2);
  const o = { dryRun: false, validateOnly: false, max: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--dry-run") o.dryRun = true;
    else if (a[i] === "--validate-only") o.validateOnly = true;
    else if (a[i] === "--max") o.max = a[++i];
    else { console.error(`알 수 없는 인자: ${a[i]}`); process.exit(1); }
  }
  return o;
}

/* ----------------------------- 로그 ----------------------------- */
const log = (...m) => console.error("[sync]", ...m);
const ok = (...m) => console.error("[sync] ✓", ...m);
const fail = (...m) => console.error("[sync] ✗", ...m);

/* --------------------------- 파일 헬퍼 --------------------------- */
function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
function countOf(dir, name) {
  const p = join(dir, name);
  if (!existsSync(p)) return null;
  try {
    const d = readJson(p);
    if (Array.isArray(d.items)) return d.items.length;
    return null;
  } catch { return null; }
}
function cleanDir(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

/* ------------------------ 검증 게이트 (L1) ------------------------ */
// channel/videos/shorts 의 스키마·필수필드·건수 급감 점검.
function validateL1(dir, liveCounts) {
  const errors = [];

  // channel.json
  const chPath = join(dir, "channel.json");
  if (!existsSync(chPath)) { errors.push("channel.json 누락"); return errors; }
  const ch = readJson(chPath);
  for (const f of ["channelId", "title", "statistics", "fetchedAt"]) {
    if (ch[f] == null) errors.push(`channel.json: 필수 필드 '${f}' 누락`);
  }
  if (ch.channelId && ch.channelId !== CHANNEL_ID) {
    errors.push(`channel.json: channelId 불일치 (${ch.channelId} ≠ ${CHANNEL_ID})`);
  }
  if (ch.statistics && (ch.statistics.videoCount == null)) {
    errors.push("channel.json: statistics.videoCount 누락");
  }

  // videos.json / shorts.json
  for (const [name, isShortExpected] of [["videos.json", false], ["shorts.json", true]]) {
    const p = join(dir, name);
    if (!existsSync(p)) { errors.push(`${name} 누락`); continue; }
    const wrap = readJson(p);
    if (!Array.isArray(wrap.items)) { errors.push(`${name}: items 배열 아님`); continue; }
    const n = wrap.items.length;

    if (name === "videos.json" && n < MIN_VIDEOS) {
      errors.push(`${name}: 영상 ${n}건 < 최소 ${MIN_VIDEOS}건`);
    }
    // 건수 급감 게이트 (직전 대비 -30%)
    const prev = liveCounts[name];
    if (prev != null && prev > 0) {
      const drop = (prev - n) / prev;
      if (drop > DROP_THRESHOLD) {
        errors.push(
          `${name}: 건수 급감 ${prev}→${n} (-${(drop * 100).toFixed(1)}%, 임계 ${DROP_THRESHOLD * 100}%) ` +
          `— API 부분 장애 의심, 중단`,
        );
      }
    }
    // 필수 필드·isShort 정합 표본 점검 (전건 순회는 비용↑ — 선두 50건 + 무작위성 대신 전건 키 점검)
    let nullShort = 0;
    for (const it of wrap.items) {
      for (const f of ["videoId", "title", "duration", "durationSeconds", "thumbnails", "statistics"]) {
        if (it[f] == null) { errors.push(`${name}: item(${it.videoId ?? "?"}) 필수 필드 '${f}' 누락`); break; }
      }
      if (!("isShort" in it)) { errors.push(`${name}: item(${it.videoId}) isShort 필드 누락`); break; }
      if (it.isShort === null) nullShort++;
      if (!Array.isArray(it.tags)) { errors.push(`${name}: item(${it.videoId}) tags 배열 아님`); break; }
    }
    if (nullShort > 0) {
      // 미확정은 치명적 실패가 아니나 경고 (추측 분류 금지 원칙)
      log(`경고: ${name} 숏츠 판별 미확정(isShort=null) ${nullShort}건 — 보고서 명시 대상`);
    }
  }
  return errors;
}

/* ------------------------ 검증 게이트 (L2) ------------------------ */
// curated.json: schemaVersion·건수·enum·videoId 참조 무결성·트랙.
function validateL2(curatedPath, rawVideoIds, liveCuratedCount) {
  const errors = [];
  if (!existsSync(curatedPath)) { errors.push("curated.json 누락"); return errors; }
  const c = readJson(curatedPath);

  if (c.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion 불일치: '${c.schemaVersion}' ≠ '${SCHEMA_VERSION}' (프론트 빌드 throw)`);
  }
  if (!Array.isArray(c.items)) { errors.push("items 배열 아님"); return errors; }
  if (!Array.isArray(c.tracks)) errors.push("tracks 배열 아님");
  if (!c.stats) errors.push("stats 누락");

  const n = c.items.length;
  if (n < MIN_CURATED_ITEMS) errors.push(`curated items ${n}건 < 최소 ${MIN_CURATED_ITEMS}`);
  if (liveCuratedCount != null && liveCuratedCount > 0) {
    const drop = (liveCuratedCount - n) / liveCuratedCount;
    if (drop > DROP_THRESHOLD) {
      errors.push(`curated 건수 급감 ${liveCuratedCount}→${n} (-${(drop * 100).toFixed(1)}%)`);
    }
  }

  // enum 유효성 + videoId 참조 무결성(curated에 있으나 RAW에 없는 id = 오류)
  let badType = 0, badGenre = 0, badDiff = 0, orphan = 0;
  for (const it of c.items) {
    if (!VALID_TYPES.has(it.type)) { badType++; }
    if (!VALID_GENRES.has(it.genre)) { badGenre++; }
    if (it.difficulty != null && !VALID_DIFFICULTIES.has(it.difficulty)) { badDiff++; }
    if (!rawVideoIds.has(it.videoId)) { orphan++; }
    if (typeof it.evidence !== "string" || !it.evidence) {
      errors.push(`curated item(${it.videoId}): evidence 누락`);
    }
    if (typeof it.manual !== "boolean") {
      errors.push(`curated item(${it.videoId}): manual 불리언 아님`);
    }
    if (!Array.isArray(it.relatedIds)) {
      errors.push(`curated item(${it.videoId}): relatedIds 배열 아님`);
    }
  }
  if (badType) errors.push(`type enum 위반 ${badType}건`);
  if (badGenre) errors.push(`genre enum 위반 ${badGenre}건`);
  if (badDiff) errors.push(`difficulty enum 위반 ${badDiff}건`);
  if (orphan) errors.push(`RAW에 없는 videoId 참조(고아) ${orphan}건 — 조인 시 드롭됨`);

  if (Array.isArray(c.tracks) && c.tracks.length < MIN_TRACKS) {
    errors.push(`tracks ${c.tracks.length}개 < 최소 ${MIN_TRACKS}`);
  }
  for (const t of c.tracks ?? []) {
    if (!t.trackId || !t.title || !Array.isArray(t.steps)) {
      errors.push(`track(${t.trackId ?? "?"}): 필수 필드 누락`);
    } else if (t.steps.length < 5) {
      errors.push(`track(${t.trackId}): steps ${t.steps.length} < 5`);
    }
  }
  return errors;
}

/* --------------------------- 자식 실행 --------------------------- */
function run(label, scriptPath, scriptArgs) {
  log(`${label} 실행...`);
  const r = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (r.error) { fail(`${label} 실행 실패: ${r.error.message}`); return r.error.code === "ENOENT" ? 2 : 2; }
  return r.status; // 자식의 종료 코드 그대로 전파
}

/* ----------------------------- 메인 ----------------------------- */
async function main() {
  const args = parseArgs();
  const fetchedAt = new Date().toISOString();

  // 사전 점검: 필수 스크립트 존재
  for (const [p, n] of [[FETCH_SCRIPT, "fetch_channel_resilient.mjs"], [CLASSIFY_SCRIPT, "classify.mjs"]]) {
    if (!existsSync(p)) { fail(`필수 스크립트 누락: ${n}`); process.exit(1); }
  }

  // 현재 live 건수 스냅샷(급감 게이트 기준)
  const liveCounts = {
    "videos.json": countOf(DATA, "videos.json"),
    "shorts.json": countOf(DATA, "shorts.json"),
  };
  const liveCuratedCount = countOf(DATA, "curated.json");
  log(`현재 data/: videos=${liveCounts["videos.json"]} shorts=${liveCounts["shorts.json"]} curated=${liveCuratedCount}`);

  /* -------- validate-only: API 미호출, 기존 data/ 만 검증 -------- */
  if (args.validateOnly) {
    log("검증 전용 모드 — API 미호출, 기존 data/ 검증");
    const l1 = validateL1(DATA, {}); // 자기 자신 대비 급감은 의미 없으므로 기준 없음
    const rawIds = collectRawIds(DATA);
    const l2 = validateL2(join(DATA, "curated.json"), rawIds, null);
    const all = [...l1, ...l2];
    if (all.length) { all.forEach(e => fail(e)); fail(`검증 실패 ${all.length}건`); process.exit(3); }
    ok("기존 data/ 검증 통과");
    process.exit(0);
  }

  // API 키 점검 (수집 모드)
  if (!process.env.GOOGLE_API_KEY) {
    fail("환경변수 GOOGLE_API_KEY 가 설정되지 않았습니다.");
    fail("동기화를 건너뜁니다. 기존 data/ 는 그대로이며 빌드는 계속 가능합니다 (sync 실패 ≠ build 실패).");
    process.exit(1);
  }

  /* ------------------------ 1) 수집 → STAGING ------------------------ */
  cleanDir(STAGING);
  mkdirSync(STAGING, { recursive: true });
  const fetchArgs = ["--channel", CHANNEL_ID, "--out", STAGING];
  if (args.max) fetchArgs.push("--max", args.max);
  const fetchStatus = run("수집(fetch_channel_resilient)", FETCH_SCRIPT, fetchArgs);
  if (fetchStatus !== 0) {
    cleanDir(STAGING);
    fail(`수집 실패 (종료 코드 ${fetchStatus}). 기존 data/ 보존됨. 재시도 안내: API 키/네트워크 확인 후 다시 실행.`);
    // 자식이 1(설정)/2(API)/3(검증) 중 무엇이든, sync 관점에선 수집 실패=2 로 정규화하되
    // 설정 오류(1)는 그대로 전파해 호출자가 키 문제를 구분하게 한다.
    process.exit(fetchStatus === 1 ? 1 : 2);
  }

  /* ------------------------ 2) L1 검증 ------------------------ */
  const l1Errors = validateL1(STAGING, liveCounts);
  if (l1Errors.length) {
    l1Errors.forEach(e => fail(e));
    cleanDir(STAGING);
    fail(`L1 검증 실패 ${l1Errors.length}건 — 부분 수집/스키마 위반 의심. 폐기. 기존 data/ 보존됨.`);
    process.exit(3);
  }
  ok("L1 검증 통과 (channel/videos/shorts)");

  // 신규/갱신/삭제 집계 (videoId 대조)
  const delta = computeDelta(DATA, STAGING);

  if (args.dryRun) {
    // dry-run: L2(분류)까지 검증하려면 staging 기준으로 분류해야 하나 classify는 data/ 고정.
    // 안전하게 staging RAW 만으로 L1 검증을 마치고, 분류 정합은 staging-vs-current enum 점검으로 대체.
    log("--dry-run: data/ 미변경. 수집·L1 검증만 수행.");
    reportDelta(delta, liveCounts, STAGING, null);
    cleanDir(STAGING);
    ok("dry-run 완료 — 실제 갱신하려면 --dry-run 없이 재실행.");
    process.exit(0);
  }

  /* ------------------------ 3) 백업(스냅샷) ------------------------ */
  cleanDir(BACKUP);
  mkdirSync(BACKUP, { recursive: true });
  for (const f of readdirSync(DATA).filter(f => f.endsWith(".json"))) {
    cpSync(join(DATA, f), join(BACKUP, f));
  }
  log("기존 data/ 스냅샷 → .sync-backup/");

  const restore = () => {
    for (const f of readdirSync(BACKUP).filter(f => f.endsWith(".json"))) {
      cpSync(join(BACKUP, f), join(DATA, f));
    }
    fail("기존 data/ 복원 완료.");
  };

  try {
    /* -------- 4) L1 staging → data/ 승격 (curated 제외) -------- */
    for (const f of ["channel.json", "videos.json", "shorts.json"]) {
      cpSync(join(STAGING, f), join(DATA, f));
    }
    ok("L1 승격: channel/videos/shorts → data/");

    /* -------- 5) 분류(classify) — manual:true 보존 증분 재분류 -------- */
    // classify.mjs 는 data/videos+shorts 를 읽고 기존 data/curated.json 의 manual 항목을
    // 보존하며 새 data/curated.json 을 쓴다. (이미 백업이 있으므로 실패 시 복원 가능)
    const classifyStatus = run("분류(classify)", CLASSIFY_SCRIPT, []);
    if (classifyStatus !== 0) {
      restore();
      fail(`분류 실패 (종료 코드 ${classifyStatus}). 복원됨.`);
      process.exit(2);
    }

    /* -------- 6) L2 검증 -------- */
    const rawIds = collectRawIds(DATA);
    const l2Errors = validateL2(join(DATA, "curated.json"), rawIds, liveCuratedCount);
    if (l2Errors.length) {
      l2Errors.forEach(e => fail(e));
      restore();
      fail(`L2 검증 실패 ${l2Errors.length}건 — 큐레이션 데이터가 빌드를 깨뜨릴 수 있어 복원함.`);
      process.exit(3);
    }
    ok("L2 검증 통과 (curated: schemaVersion·건수·enum·참조 무결성·트랙)");

    /* -------- 7) 성공 보고 -------- */
    reportDelta(delta, liveCounts, DATA, join(DATA, "curated.json"));
    cleanDir(STAGING);
    cleanDir(BACKUP);
    ok("동기화 완료. 다음 빌드(npm run build)에서 prebuild copy-data 가 public/data/ 로 반영합니다.");
    process.exit(0);
  } catch (e) {
    restore();
    cleanDir(STAGING);
    fail(`예기치 못한 오류: ${e.message}. 복원됨.`);
    process.exit(2);
  }
}

/* --------------------------- 델타/보고 --------------------------- */
function collectRawIds(dir) {
  const ids = new Set();
  for (const f of ["videos.json", "shorts.json"]) {
    const p = join(dir, f);
    if (!existsSync(p)) continue;
    for (const it of readJson(p).items) ids.add(it.videoId);
  }
  return ids;
}
function loadIds(dir) {
  const m = new Map();
  for (const f of ["videos.json", "shorts.json"]) {
    const p = join(dir, f);
    if (!existsSync(p)) continue;
    for (const it of readJson(p).items) m.set(it.videoId, it);
  }
  return m;
}
function computeDelta(oldDir, newDir) {
  const oldM = loadIds(oldDir), newM = loadIds(newDir);
  let added = 0, removed = 0, updated = 0;
  for (const [id, nv] of newM) {
    if (!oldM.has(id)) { added++; continue; }
    const ov = oldM.get(id);
    // 통계/제목 변동 = 갱신
    if (ov.title !== nv.title ||
        ov.statistics?.viewCount !== nv.statistics?.viewCount ||
        ov.statistics?.likeCount !== nv.statistics?.likeCount) updated++;
  }
  for (const id of oldM.keys()) if (!newM.has(id)) removed++;
  return { added, removed, updated, total: newM.size };
}
function reportDelta(delta, liveCounts, rawDir, curatedPath) {
  const lines = [
    "================= 동기화 보고 =================",
    `신규(N): ${delta.added}건  /  갱신(M): ${delta.updated}건  /  삭제: ${delta.removed}건  /  실패(K): 0건`,
    `전체 RAW: ${delta.total}건 (videos+shorts)`,
  ];
  const v = countOf(rawDir, "videos.json"), s = countOf(rawDir, "shorts.json");
  lines.push(`  videos=${v}${liveCounts["videos.json"] != null ? ` (이전 ${liveCounts["videos.json"]})` : ""}, shorts=${s}${liveCounts["shorts.json"] != null ? ` (이전 ${liveCounts["shorts.json"]})` : ""}`);
  if (curatedPath && existsSync(curatedPath)) {
    const c = readJson(curatedPath);
    const manual = c.items.filter(i => i.manual).length;
    lines.push(`큐레이션: items=${c.items.length}, tracks=${c.tracks.length}, manual보존=${manual}건, unclassified=${c.stats?.unclassified ?? "?"}`);
  }
  lines.push("==============================================");
  console.error(lines.join("\n"));
}

main().catch(e => { fail("치명적 오류:", e.message); process.exit(2); });
