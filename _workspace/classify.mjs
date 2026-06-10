/**
 * honey-choa 콘텐츠 결정적 분류 스크립트 (content-curator)
 * --------------------------------------------------------------------------
 * 입력: data/videos.json (179), data/shorts.json (1425)
 * 출력: data/curated.json (계약 _workspace/01_schema.md v1.0.0 준수)
 *
 * 원칙(taxonomy + schema 보정 enum):
 *  - 태그 신뢰 불가 → 제목을 1차 단서로 규칙 기반 분류
 *  - 모든 항목에 evidence 기록
 *  - 단서 불충분 시 type:"unclassified" (억지 분류 금지)
 *  - isShort 필드만 신뢰 (길이로 숏츠 판별 금지)
 *  - 재호출 시 manual:true 항목 보존 (이 스크립트는 manual 미덮어쓰기)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const ROOT = new URL("../", import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(ROOT + p, "utf8"));

const videos = read("data/videos.json").items;
const shorts = read("data/shorts.json").items;
const all = [...videos, ...shorts];

// 기존 curated.json의 manual 항목 보존 (증분 재분류)
const prevManual = new Map();
if (existsSync(ROOT + "data/curated.json")) {
  try {
    const prev = read("data/curated.json");
    for (const it of prev.items || []) if (it.manual) prevManual.set(it.videoId, it);
  } catch { /* noop */ }
}

const T = (t) => t || "";

/* ============================ GENRE ============================ */
function classifyGenre(title) {
  const t = T(title);
  const sub = [];
  let genre = null;
  const tests = [
    ["bachata", /바차타|bachata|센슈얼|sensual|도미니칸|dominican|바차주크/i],
    ["salsa", /살사|salsa|맘보|mambo|아프로쿠반|쿠반|cuban/i],
    ["zouk", /주크|zouk/i],
    ["kizomba", /키좀바|kizomba|키좀|kiz\b/i],
    ["latin_pop", /라틴팝|latin ?pop|lo-?fi latin/i],
  ];
  for (const [g, re] of tests) if (re.test(t)) sub.push(g);
  if (sub.length) {
    genre = sub[0];
    return { genre, subGenres: sub.length > 1 ? sub.slice(1) : undefined };
  }
  return { genre: null, subGenres: undefined };
}

/* ============================ TYPE ============================ */
// 우선순위 순서대로 첫 매칭 채택 (학습/식별 가치 높은 마커 우선)
const TYPE_RULES = [
  ["tutorial", /배우기|강좌|튜토리얼|tutorial|거울모드|느리게|따라하기|배워보|배운|원포인트|총정리|핵심 ?포인트|백과사전|파헤쳐|핵심 ?패턴|노하우|어떻게 ?써|이렇게 ?써|이렇게 ?쓰|디테일 ?쏙쏙|tip\b|꿀팁|how ?to|스타일링|styling|뮤지컬리티|musicality|테크닉|technique|시크릿|secret|장착|총망라|정리해|알랴줌|알려|진화|핵심 ?공식|레벨업|level ?up|바디리드|무브먼트|movement|커넥션|connection|결정적 ?한 ?수|기본기를/i],
  ["basics", /기초|스트레칭|웜업|풋워크|베이직|basic|왕초보|입문|펀더멘털|fundamental|기본 ?무브|기본편|기본 ?스텝/i],
  ["battle", /배틀|battle|대회|잭앤질|jack ?n ?jill|콘테스트|contest|결승|준결승|\d+강|\b우승|챔피언|champion|kbsl|라틴컵|빅매치|샤인 ?배틀/i],
  ["challenge", /챌린지|challenge/i],
  ["workshop", /워크샵|workshop|클래스|class\b|레슨|lesson|부트캠프|붓캠|bootcamp|마스터클래스|masterclass|붓캠프|부캠|마스터 ?클래스|masterclass|초급반|중급반|고급반/i],
  ["fancam", /직캠|fancam/i],
  ["performance", /데모|demo|공연|쇼케이스|showcase|performance|콘서트|컨서트|concert|앵콜|스타일링 ?데모|스타일 ?컬렉션|style collection|한곡반|풀버전|풀영상|하이라이트|highlight/i],
  ["social", /소셜|social|페스티벌|festival|파티|party|\b잼\b|salsa ?jam|살사잼|소셜 ?실전/i],
  ["music_mix", /믹스|music ?mix| mix\b|playlist|플레이리스트|플리\b|노동요|pllist|캐롤|music ?con|music ?2025|music ?202\d|bachata ?music|bchta|hot ?picks|hot ?&|무한재생|순삭|신곡|띵곡|명곡 ?\d|음악 ?\d|가사번역|가사 ?자막|remix|리믹스|매시업|mashup/i],
  ["vlog_etc", /여행|일기|온천|폭포|여행기|브이로그|vlog|숏터뷰|인터뷰|interview|비하인드|behind|공지|리뷰|콜라보|취재|잠입|투어|tour|스케치|12문 ?12답/i],
];

// 장르 마커는 있으나 type 키워드가 없을 때의 보조 휴리스틱 (isShort + 길이 + 인명패턴)
// schema: 길이로 '숏츠 판별'은 금지이나, type 추론의 보조 단서로는 사용 가능(판별 아님)
function classifyType(item) {
  const t = T(item.title);
  for (const [type, re] of TYPE_RULES) if (re.test(t)) return { type, soft: false };
  // 곡/아티스트 위주의 긴 영상 = 음악 콘텐츠일 가능성 (라틴 곡명 다수 + 장르)
  if (item.isShort === false && item.durationSeconds >= 600 && /music|música|musica|2024|2025|2026/i.test(t))
    return { type: "music_mix", soft: true };
  return { type: null, soft: false };
}

/* ===================== 비댄스/테스트 컷오프 ===================== */
// 댄스/라틴 신호가 전혀 없는 짧은 테스트성/개인 영상 → unclassified
const NON_DANCE = /골프|golf|magisto|injected|숯가마|버디펏|나이쓰샷|kenya|christmas day|chrismas|office|test\b|siwon|griselle|candles|도림천 ?프리덤|^h$|^bk$|루안 마스터|tiguere|ania|korke$|zepeda/i;

/* ===================== DIFFICULTY ===================== */
// workshop/tutorial/basics 에만 부여. 그 외 null.
function classifyDifficulty(type, title) {
  if (!["workshop", "tutorial", "basics"].includes(type)) return null;
  const t = T(title);
  if (/왕초보|초보|초급|기초|입문|쉽고|쉬운|easy|beginner|편한 ?패턴|부담없|기본편/i.test(t)) return "beginner";
  if (/고급|고난도|advanced|마스터클래스|masterclass|극한|잭앤질 ?워크샵|딥다이브|고점|마스터 ?클래스|마스터편|심화/i.test(t)) return "advanced";
  if (type === "basics") return "beginner"; // 명시 없는 기초성 콘텐츠는 입문
  return "intermediate"; // 일반 워크샵/튜토리얼 기본값
}

/* ===================== SONG 추출 ===================== */
// 「」, [], (), - 뒤 곡명 / "Artist - Title" / Romeo Santos 등 아티스트
// 보수적 추출: 잘 알려진 아티스트명 + 깨끗한 곡명만. 불확실하면 생략(추측 금지).
const ARTIST_RE = /(Romeo Santos|Prince Royce|Aventura|Luis y Andrea|Dani ?J|Marc Anthony|ROSAL[IÍ]A|Daniel Santacruz|Juan Luis Guerra|Bruno Mars|Shakira|Manny Cruz|Ozuna|Maluma)/i;
// 곡명으로 받아들일 깨끗한 문자열인지 검증: 이모지/한글 섞임/과도한 길이/꼬리표 배제
function cleanSongTitle(raw) {
  if (!raw) return null;
  let s = raw.trim().replace(/\s+/g, " ");
  // 이모지·특수 잡음 제거
  if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}💯💖💛💕😘🤓]/u.test(s)) return null;
  // 한글이 섞이면 곡명 아닌 설명일 확률↑ → 배제
  if (/[가-힣]/.test(s)) return null;
  if (s.length < 2 || s.length > 35) return null;
  if (!/[A-Za-z]/.test(s)) return null;
  // powered by / by / feat 등 꼬리표 제거
  s = s.replace(/\b(powered by|by|feat\.?|w\/).*$/i, "").trim();
  if (s.length < 2 || s.length > 35) return null;
  // 곡명이 아니라 워크샵/기법 설명 어구일 가능성이 높은 단어 배제(추측 금지)
  if (/workshop|technique|demo|styling|sensual|fundamentals?|structure|class|musicality|movement|basic|pattern|lead|turn|footwork|bootcamp|mechanism|메카니즘/i.test(s)) return null;
  return s;
}
function extractSong(title) {
  const t = T(title);
  const am = t.match(ARTIST_RE);
  // 1) 따옴표/괄호 안 곡명
  const bracket = t.match(/[「『]([^」』]+)[」』]/) || t.match(/['"]([^'"]{2,35})['"]/);
  let songTitle = bracket ? cleanSongTitle(bracket[1]) : null;
  // 2) "Artist - Title" 패턴 (둘 다 라틴 알파벳)
  if (!songTitle) {
    const dash = t.match(/-\s*([A-Z][A-Za-zÀ-ÿ' ]{2,34}?)(?:\s*[|(]|$)/);
    if (dash) songTitle = cleanSongTitle(dash[1]);
  }
  if (am && songTitle) {
    // 곡명이 아티스트명과 동일하면 곡명 미상 → 아티스트만으로는 song 생략
    if (songTitle.toLowerCase() === am[1].toLowerCase()) return undefined;
    return { title: songTitle, artist: am[1] };
  }
  if (songTitle) return { title: songTitle };
  return undefined; // 불확실 → 생략
}

/* ===================== 분류 실행 ===================== */
const items = [];
for (const v of all) {
  // manual 보존
  if (prevManual.has(v.videoId)) {
    items.push(prevManual.get(v.videoId));
    continue;
  }
  const title = v.title;
  const { genre: gMarker, subGenres } = classifyGenre(title);
  const { type: tMarker, soft } = classifyType(v);

  let type = tMarker;
  let genre = gMarker;
  let evidenceParts = [];

  // type 결정
  if (type) {
    evidenceParts.push(soft ? `type='${type}'(길이·음악 단서 보조 추론)` : `type='${type}'(제목 마커 매칭)`);
  } else if (gMarker) {
    // 장르 마커는 있으나 type 키워드 없음. 보조 단서로 추론:
    //  - 숏츠(isShort=true) + 인명/팀명 위주 = 현장 클립(fancam/performance 성격) → performance
    //  - 그 외 장르 마커 댄스 클립 = performance(데모/공연 성격 기본)
    // 2차 신호로 분배(억지 아님, 제목 내 부수 단서):
    const tt = T(title);
    if (/소셜|social|파티|party|페스티벌|festival|현장|난입|즉흥|축공|기념/i.test(tt)) {
      type = "social";
      evidenceParts.push(`type 키워드 없음; 소셜/파티 부수 단서→social(장르 '${gMarker}')`);
    } else if (/팀|team|군단|전사|여신|크루|crew|코레오|안무|cover|커버/i.test(tt)) {
      type = "performance";
      evidenceParts.push(`type 키워드 없음; 팀/안무 showcase→performance(장르 '${gMarker}')`);
    } else if (v.isShort === true) {
      type = "fancam";
      evidenceParts.push(`type 키워드 없음; 숏폼 인물 댄스 클립→fancam 보조 추론(장르 '${gMarker}')`);
    } else {
      type = "performance";
      evidenceParts.push(`type 키워드 없음; 장르 마커 '${gMarker}' 댄스 영상→performance 기본 추론`);
    }
  } else if (NON_DANCE.test(T(title))) {
    type = "unclassified";
    evidenceParts.push(`비댄스/테스트성 콘텐츠 — 단서 불충분`);
  } else {
    type = "unclassified";
    evidenceParts.push(`제목 단서 불충분`);
  }

  // genre 결정 (마커 없으면, 댄스 type일 때 주력 장르 bachata 보정 — schema §3.3 근거)
  if (!genre) {
    const danceType = ["workshop", "performance", "social", "battle", "fancam", "tutorial", "basics"].includes(type);
    if (danceType) {
      genre = "bachata";
      evidenceParts.push(`장르 마커 없음→주력 장르 bachata 보정(댄스 type='${type}')`);
    } else if (type === "music_mix") {
      genre = "etc";
      evidenceParts.push(`믹스/플리, 장르 마커 없음→etc`);
    } else {
      genre = "etc";
      evidenceParts.push(`장르 마커 없음→etc`);
    }
  } else {
    evidenceParts.push(`genre='${genre}'(제목 마커)`);
  }

  const difficulty = classifyDifficulty(type, title);
  if (difficulty) evidenceParts.push(`difficulty='${difficulty}'`);

  const song = extractSong(title);

  items.push({
    videoId: v.videoId,
    type,
    genre,
    ...(subGenres ? { subGenres } : {}),
    difficulty,
    ...(song ? { song } : {}),
    relatedIds: [],
    evidence: evidenceParts.join("; "),
    manual: false,
  });
}

/* ===================== relatedIds 매칭 ===================== */
// 단서: 곡/아티스트 일치 또는 제목 핵심 토큰(강사·이벤트명) 일치 + 게시일 근접(±14일)
// 보수적: 강한 토큰(고유명사 2글자 이상 + 이벤트명) 교집합 충분할 때만 연결
const byId = new Map(all.map((v) => [v.videoId, v]));
const STOP = new Set(["바차타", "살사", "주크", "워크샵", "데모", "직캠", "소셜", "공연", "한곡반", "데니스", "the", "and", "in", "by", "vs", "feat", "mix", "music", "korea", "bachata", "salsa"]);

function tokens(title) {
  return new Set(
    T(title)
      .replace(/[()\[\]{}「」『』"'!?.,~🔥💯💛💖🏆⭐️@#|]/g, " ")
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2 && !STOP.has(w.toLowerCase()))
  );
}
function dateClose(a, b) {
  const da = new Date(a.publishedAt).getTime(), db = new Date(b.publishedAt).getTime();
  return Math.abs(da - db) <= 21 * 86400 * 1000; // ±21일
}
const tokCache = new Map(all.map((v) => [v.videoId, tokens(v.title)]));

// 숏츠 ↔ 영상 매칭 (숏츠로 발견→풀영상 학습 동선). 강사명/이벤트명 토큰 3개 이상 교집합 + 날짜 근접
const relMap = new Map(all.map((v) => [v.videoId, new Set()]));
const longs = all.filter((v) => v.isShort === false);
const shrt = all.filter((v) => v.isShort === true);
for (const s of shrt) {
  const st = tokCache.get(s.videoId);
  if (st.size < 3) continue;
  let best = null, bestScore = 0;
  for (const l of longs) {
    if (!dateClose(s, l)) continue;
    const lt = tokCache.get(l.videoId);
    let inter = 0;
    for (const w of st) if (lt.has(w)) inter++;
    if (inter >= 3 && inter > bestScore) { bestScore = inter; best = l; }
  }
  if (best) {
    relMap.get(s.videoId).add(best.videoId);
    relMap.get(best.videoId).add(s.videoId);
  }
}
// 영상 항목에 relatedIds 반영
for (const it of items) {
  const set = relMap.get(it.videoId);
  if (set && set.size) it.relatedIds = [...set];
}

/* ===================== STATS ===================== */
const stats = {
  byType: {}, byGenre: {}, byDifficulty: { beginner: 0, intermediate: 0, advanced: 0, none: 0 },
  unclassified: 0, total: items.length,
};
for (const it of items) {
  stats.byType[it.type] = (stats.byType[it.type] || 0) + 1;
  stats.byGenre[it.genre] = (stats.byGenre[it.genre] || 0) + 1;
  stats.byDifficulty[it.difficulty || "none"]++;
  if (it.type === "unclassified") stats.unclassified++;
}

/* ===================== TRACKS ===================== */
// 입문→중급→고급 학습 경로. 첫 스텝 beginner, 난이도 단조 증가, 트랙당 5건+, 같은 장르.
function pick(genre, type, diff, n, used) {
  return items
    .filter((it) => it.genre === genre && (type ? it.type === type : true) && (diff ? it.difficulty === diff : true) && !used.has(it.videoId))
    .map((it) => ({ it, v: byId.get(it.videoId) }))
    .sort((a, b) => (b.v.statistics.viewCount || 0) - (a.v.statistics.viewCount || 0))
    .slice(0, n);
}
function buildLearningTrack(trackId, title, description, genre) {
  const used = new Set();
  const steps = [];
  const add = (rows, noteFn) => rows.forEach(({ it, v }) => { used.add(it.videoId); steps.push({ videoId: it.videoId, note: noteFn(it, v) }); });
  // 1) 기초/입문
  add(pick(genre, "basics", "beginner", 2, used), () => "기초 동작·풋워크부터 — 몸풀기 단계");
  add(pick(genre, "tutorial", "beginner", 2, used), () => "입문 튜토리얼 — 핵심 무브 익히기");
  add(pick(genre, "workshop", "beginner", 2, used), () => "입문 워크샵 — 패턴 입문");
  // 2) 중급
  add(pick(genre, "tutorial", "intermediate", 2, used), () => "중급 튜토리얼 — 패턴 확장");
  add(pick(genre, "workshop", "intermediate", 3, used), () => "중급 워크샵 — 소셜 적용 패턴");
  // 3) 고급
  add(pick(genre, "workshop", "advanced", 2, used), () => "고급 워크샵 — 뮤지컬리티·고난도");
  add(pick(genre, "tutorial", "advanced", 1, used), () => "고급 테크닉 정리");
  return { trackId, title, description, genre, steps };
}

const tracks = [];
const bachataLearn = buildLearningTrack("bachata-starter", "바차타 입문→마스터 트랙", "기초 풋워크부터 고급 뮤지컬리티까지, 단계적 바차타 학습 경로", "bachata");
if (bachataLearn.steps.length >= 5) tracks.push(bachataLearn);

const salsaLearn = buildLearningTrack("salsa-starter", "살사 입문 트랙", "살사 기본 무브부터 워크샵 패턴까지 단계별 학습", "salsa");
if (salsaLearn.steps.length >= 5) tracks.push(salsaLearn);

const zoukLearn = buildLearningTrack("zouk-starter", "주크 입문 트랙", "주크 기본기와 핵심 패턴 학습 경로", "zouk");
if (zoukLearn.steps.length >= 5) tracks.push(zoukLearn);

// 장르 트랙이 부족하면 type 기반 보조 트랙(소셜 입문 동선) 구성
function buildTypeTrack(trackId, title, description, genre, types, n) {
  const used = new Set();
  const steps = [];
  for (const ty of types) {
    pick(genre, ty, null, n, used).forEach(({ it, v }) => {
      used.add(it.videoId);
      steps.push({ videoId: it.videoId, note: `${ty} — ${T(v.title).slice(0, 24)}` });
    });
  }
  return { trackId, title, description, genre, steps };
}

// 바차타 소셜 실전 트랙 (basics/tutorial → social/workshop)
const bachataSocial = (() => {
  const used = new Set();
  const steps = [];
  pick("bachata", "basics", "beginner", 1, used).forEach(({ it, v }) => { used.add(it.videoId); steps.push({ videoId: it.videoId, note: "기초 다지기" }); });
  pick("bachata", "tutorial", "beginner", 2, used).forEach(({ it, v }) => { used.add(it.videoId); steps.push({ videoId: it.videoId, note: "소셜에 바로 쓰는 패턴 익히기" }); });
  pick("bachata", "workshop", "intermediate", 2, used).forEach(({ it, v }) => { used.add(it.videoId); steps.push({ videoId: it.videoId, note: "워크샵 패턴을 소셜에 적용" }); });
  pick("bachata", "social", null, 2, used).forEach(({ it, v }) => { used.add(it.videoId); steps.push({ videoId: it.videoId, note: "실제 소셜·파티 현장 감각 익히기" }); });
  return { trackId: "bachata-social-ready", title: "바차타 소셜 실전 준비 트랙", description: "기초→패턴→실제 소셜 현장까지, 소셜 데뷔를 위한 동선", genre: "bachata", steps };
})();
if (bachataSocial.steps.length >= 5) tracks.push(bachataSocial);

/* ===================== 산출 ===================== */
const out = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  items,
  tracks,
  stats,
};
writeFileSync(ROOT + "data/curated.json", JSON.stringify(out, null, 2));

// 콘솔 리포트
console.log("=== 분류 완료 ===");
console.log("total:", stats.total);
console.log("byType:", JSON.stringify(stats.byType));
console.log("byGenre:", JSON.stringify(stats.byGenre));
console.log("byDifficulty:", JSON.stringify(stats.byDifficulty));
console.log("unclassified:", stats.unclassified, `(${(stats.unclassified / stats.total * 100).toFixed(1)}%)`);
const linked = items.filter((i) => i.relatedIds.length).length;
console.log("relatedIds linked items:", linked, "| total links:", items.reduce((a, i) => a + i.relatedIds.length, 0));
console.log("tracks:", tracks.length, tracks.map((t) => `${t.trackId}(${t.steps.length})`).join(", "));
