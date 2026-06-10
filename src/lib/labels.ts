/**
 * src/lib/labels.ts — 데이터-무관 순수 모듈 (frontend-lead 소유)
 * ----------------------------------------------------------------------------
 * data/*.json 을 import 하지 않는다. 라벨 사전·색 매핑·포맷 헬퍼·필터 정렬 순서 등
 * "콘텐츠 데이터와 무관한" 순수 상수·함수만 둔다.
 *
 * 분리 이유(Phase 4 B1): content.ts 는 JSON(1.9MB)을 모듈 최상위 import 한다.
 * 'use client' 컴포넌트가 라벨/포맷만 쓰려고 content.ts 를 import 하면 번들러가
 * 데이터 전체를 client 청크로 끌어온다. → 데이터-무관 심볼은 이 모듈에서 가져온다.
 *
 * 'use client' 컴포넌트는 반드시 @/lib/labels 에서 import 할 것 (content.ts 금지).
 * 서버/빌드타임 코드는 content.ts 의 re-export 로도 접근 가능(back-compat).
 */
import type { ContentType, Difficulty, Genre } from "@/types/content";

/* ===========================================================================
 * 포맷 헬퍼 (순수 함수)
 * ======================================================================== */

/** durationSeconds → "9:04" / "1:02:33" 표기. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/**
 * 조회수 등 정수 → 한글 만/천 축약. 예: 5237615 → "523만", 19600 → "1.96만".
 * copy_deck §1.4.
 * MINOR fix(Phase 4): 9999 → "10천"(만단위 미승급, 10천=10000 오인) 버그 수정.
 *   반올림이 아니라 내림(truncate)으로 표기해 단위를 넘기지 않는다. 9999 → "9.9천".
 */
export function formatCountKo(n: number): string {
  const trunc1 = (x: number) => (Math.floor(x * 10) / 10).toFixed(1).replace(/\.0$/, "");
  if (n >= 100_000_000) return `${trunc1(n / 100_000_000)}억`;
  if (n >= 10_000) {
    const man = n / 10_000;
    // 100만 이상은 정수 반올림(523만), 미만은 소수 2자리 내림(1.96만)
    return man >= 100
      ? `${Math.round(man)}만`
      : `${(Math.floor(man * 100) / 100).toFixed(2).replace(/\.?0+$/, "")}만`;
  }
  if (n >= 1_000) return `${trunc1(n / 1_000)}천`;
  return n.toLocaleString("ko-KR");
}

/** 천 단위 구분 정수 표기. 예: 1604 → "1,604". */
export function formatInt(n: number): string {
  return n.toLocaleString("ko-KR");
}

/**
 * watch 메타 description 합성 (M2, Phase 4).
 * 실데이터의 87.5% 가 description 빈 영상 → meta/og description 누락(SEO 손실).
 * 빈 경우 제목·장르·유형·채널명으로 폴백 문장을 합성한다.
 * 원본 description 이 있으면 그대로(120자 컷) 사용.
 */
export function buildWatchDescription(input: {
  title: string;
  description: string;
  genre: Genre | null;
  type: ContentType | "uncurated";
}): string {
  const original = input.description.trim();
  if (original) return original.slice(0, 120);

  const genrePart = input.genre ? GENRE_LABEL[input.genre] : "라틴댄스";
  const typePart =
    input.type !== "uncurated" && input.type !== "unclassified"
      ? ` ${TYPE_LABEL[input.type]}`
      : "";
  // 예: "꿀초아tv 바차타 워크샵 · {제목} | 라틴댄스를 순서대로 배우다, 꿀초아tv(@youzin)"
  return `꿀초아tv ${genrePart}${typePart} · ${input.title} | 라틴댄스를 순서대로 배우다, 꿀초아tv(@youzin) 비공식 큐레이션`.slice(
    0,
    155
  );
}

/* ===========================================================================
 * enum → 한국어 라벨 사전 (copy_deck §A — UI는 이 사전만 사용, 인라인 금지)
 * ======================================================================== */

export const TYPE_LABEL: Record<ContentType, string> = {
  tutorial: "튜토리얼",
  workshop: "워크샵",
  basics: "기초",
  performance: "퍼포먼스",
  fancam: "직캠",
  social: "소셜",
  battle: "배틀",
  music_mix: "음악",
  challenge: "챌린지",
  vlog_etc: "일상",
  unclassified: "기타",
};

export const GENRE_LABEL: Record<Genre, string> = {
  bachata: "바차타",
  salsa: "살사",
  zouk: "주크",
  kizomba: "키좀바",
  latin_pop: "라틴팝",
  etc: "기타",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "입문",
  intermediate: "중급",
  advanced: "고급",
};

/** 장르 → 디자인 토큰 색 키(design_system §5.3 매핑). 배지/도트 색 결정에 사용. */
export const GENRE_COLOR: Record<Genre, "honey" | "heat" | "sky" | "rose" | "muted"> = {
  bachata: "honey",
  salsa: "heat",
  zouk: "sky",
  latin_pop: "rose",
  kizomba: "muted",
  etc: "muted",
};

/** 난이도 → 디자인 토큰 색 키(design_system §5.5). */
export const DIFFICULTY_COLOR: Record<Difficulty, "mint" | "honey" | "heat"> = {
  beginner: "mint",
  intermediate: "honey",
  advanced: "heat",
};

/** 라이브러리 필터칩으로 노출하는 type 순서(unclassified 제외 — 토글로만). */
export const LIBRARY_TYPE_ORDER: ContentType[] = [
  "tutorial",
  "workshop",
  "basics",
  "performance",
  "fancam",
  "social",
  "battle",
  "music_mix",
  "challenge",
  "vlog_etc",
];

/** 필터칩 노출 장르 순서(latin_pop 1건은 호출부에서 카운트로 판단). */
export const GENRE_ORDER: Genre[] = ["bachata", "salsa", "zouk", "latin_pop", "etc"];

/** 난이도 정렬 순서(범위 계산용). */
export const DIFFICULTY_ORDER: Difficulty[] = ["beginner", "intermediate", "advanced"];
