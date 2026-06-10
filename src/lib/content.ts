/**
 * src/lib/content.ts — 데이터 접근 단일 진입점 (frontend-lead 소유)
 * ----------------------------------------------------------------------------
 * 모든 데이터 접근은 이 모듈을 통한다. 컴포넌트에서 data/*.json 직접 import 금지.
 * (병합·타입 보정·파생 필드 로직을 우회하면 런타임에서 터진다 — frontend-standards 규약)
 *
 * 3계층 조인 (01_schema.md):
 *   L1 RAW (videos.json/shorts.json/channel.json)
 *   ⨝ L2 ENRICHED (curated.json: items/tracks/stats)
 *   → L3 VIEW (ContentCard / TrackView / FeedView)
 *
 * 정적 빌드 타임 import → 타입 안전 + 트리셰이킹 + API 키 비노출.
 */
import channelRaw from "@/../data/channel.json";
import videosRaw from "@/../data/videos.json";
import shortsRaw from "@/../data/shorts.json";
import curatedRaw from "@/../data/curated.json";

import {
  resolveThumbnailUrl,
  CURATED_SCHEMA_VERSION,
  type Channel,
  type VideoItem,
  type VideoCollection,
  type CuratedContent,
  type CuratedItem,
  type ContentCard,
  type ContentType,
  type Genre,
  type Difficulty,
  type Track,
  type TrackView,
} from "@/types/content";

// 데이터-무관 순수 헬퍼·라벨·색·순서는 labels.ts 단일 출처(B1). 여기선 조인에 쓰고 re-export.
import { formatDuration, DIFFICULTY_LABEL, DIFFICULTY_ORDER } from "@/lib/labels";

// back-compat: 기존 `@/lib/content` 에서 라벨/포맷을 import 하던 서버/빌드타임 코드 지원.
// (단, 'use client' 컴포넌트는 @/lib/labels 에서 직접 import 할 것 — content.ts 는 JSON 동반)
export {
  formatDuration,
  formatCountKo,
  formatInt,
  TYPE_LABEL,
  GENRE_LABEL,
  DIFFICULTY_LABEL,
  GENRE_COLOR,
  DIFFICULTY_COLOR,
  LIBRARY_TYPE_ORDER,
  GENRE_ORDER,
  DIFFICULTY_ORDER,
} from "@/lib/labels";

/* ===========================================================================
 * 0. 원천 로드 + 스키마 가드
 * ======================================================================== */

/**
 * 단일 검증 경계(ingestion boundary). JSON은 빌드 타임에 import 되며 TS는 enum 필드를
 * 넓은 string 으로, 0건 enum 키(예: byGenre.kizomba)는 부재로 추론한다. 이는 구조적
 * 불일치가 아니라 추론 한계 + 데이터의 정당한 키 생략이다.
 * → 여기 한 곳에서만 unknown 경유 단언으로 계약 타입에 고정하고,
 *   아래 schemaVersion 가드로 런타임 정합을 검증한다. 컴포넌트단 `as` 는 여전히 금지.
 */
const channel = channelRaw as unknown as Channel;
const videosCollection = videosRaw as unknown as VideoCollection;
const shortsCollection = shortsRaw as unknown as VideoCollection;
const curated = curatedRaw as unknown as CuratedContent;

// schemaVersion 불일치 시 프론트가 거부한다(01_schema.md 규약). 빌드 타임에 즉시 실패.
if (curated.schemaVersion !== CURATED_SCHEMA_VERSION) {
  throw new Error(
    `[content] curated.json schemaVersion 불일치: ` +
      `expected ${CURATED_SCHEMA_VERSION}, got ${curated.schemaVersion}`
  );
}

/* ===========================================================================
 * 1. 파생 필드 유틸 (ContentCard 구성에 사용)
 * ======================================================================== */

/** publishedAt(ISO8601) → "2026" 연도 문자열. */
function yearOf(iso: string): string {
  return iso.slice(0, 4);
}

/* ===========================================================================
 * 2. 조인 — VideoItem ⨝ CuratedItem → ContentCard
 * ======================================================================== */

const curatedById = new Map<string, CuratedItem>(
  curated.items.map((c) => [c.videoId, c])
);

// 인기도(isPopular) 판정용 임계치: 전체 RAW viewCount 상위 25% 백분위.
const allViewCounts = [...videosCollection.items, ...shortsCollection.items]
  .map((v) => v.statistics.viewCount)
  .sort((a, b) => a - b);
const popularThreshold =
  allViewCounts.length > 0
    ? allViewCounts[Math.floor(allViewCounts.length * 0.75)]
    : 0;

/** 단일 VideoItem 을 ContentCard 로 조인. curation 누락 시 type="uncurated". */
function toCard(item: VideoItem): ContentCard {
  const c = curatedById.get(item.videoId);
  return {
    // --- RAW ---
    videoId: item.videoId,
    title: item.title,
    description: item.description,
    publishedAt: item.publishedAt,
    durationSeconds: item.durationSeconds,
    thumbnails: item.thumbnails,
    statistics: item.statistics,
    embeddable: item.embeddable,
    isShort: item.isShort,
    // --- 큐레이션 (누락 가능) ---
    type: c ? c.type : "uncurated",
    genre: c ? c.genre : null,
    subGenres: c?.subGenres,
    difficulty: c ? c.difficulty : null,
    song: c?.song,
    relatedIds: c?.relatedIds ?? [],
    // --- 파생 ---
    thumbnailUrl: resolveThumbnailUrl(item.thumbnails),
    publishedYear: yearOf(item.publishedAt),
    formattedDuration: formatDuration(item.durationSeconds),
    isPopular: item.statistics.viewCount >= popularThreshold,
  };
}

// 빌드 타임 1회 조인(메모이즈). videoId → ContentCard 룩업맵도 함께.
const videoCards: ContentCard[] = videosCollection.items.map(toCard);
const shortCards: ContentCard[] = shortsCollection.items.map(toCard);
const cardById = new Map<string, ContentCard>(
  [...videoCards, ...shortCards].map((card) => [card.videoId, card])
);

/* ===========================================================================
 * 3. 필터 · 정렬 타입
 * ======================================================================== */

export type SortKey = "popular" | "recent" | "duration";

export interface ContentFilter {
  /** type 다중 선택. 빈 배열/미지정이면 전체. */
  types?: ContentType[];
  /** genre 다중 선택. */
  genres?: Genre[];
  /** difficulty 다중 선택. */
  difficulties?: Difficulty[];
  /** 제목 키워드(부분일치, 대소문자 무시). */
  query?: string;
  /** unclassified 포함 여부. 기본 false(라이브러리 기본 숨김 — spec §3.4). */
  includeUnclassified?: boolean;
}

function matchesFilter(card: ContentCard, f: ContentFilter): boolean {
  if (!f.includeUnclassified && card.type === "unclassified") return false;
  if (f.types?.length && !f.types.includes(card.type as ContentType)) return false;
  if (f.genres?.length && (!card.genre || !f.genres.includes(card.genre))) return false;
  if (
    f.difficulties?.length &&
    (!card.difficulty || !f.difficulties.includes(card.difficulty))
  )
    return false;
  if (f.query) {
    const q = f.query.trim().toLowerCase();
    if (q && !card.title.toLowerCase().includes(q)) return false;
  }
  return true;
}

function sortCards(cards: ContentCard[], sort: SortKey): ContentCard[] {
  const arr = [...cards];
  switch (sort) {
    case "recent":
      return arr.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    case "duration":
      return arr.sort((a, b) => b.durationSeconds - a.durationSeconds);
    case "popular":
    default:
      return arr.sort(
        (a, b) => b.statistics.viewCount - a.statistics.viewCount
      );
  }
}

/* ===========================================================================
 * 4. 공개 API — 데이터 셀렉터 (모든 페이지·훅이 사용)
 * ======================================================================== */

/** 채널 메타. */
export function getChannel(): Channel {
  return channel;
}

/** 롱폼(isShort=false) ContentCard. 라이브러리·홈 학습 레일용. */
export function getVideos(
  filter: ContentFilter = {},
  sort: SortKey = "popular"
): ContentCard[] {
  return sortCards(videoCards.filter((c) => matchesFilter(c, filter)), sort);
}

/** 숏츠(isShort=true) ContentCard. 숏츠 피드·홈 레일용. */
export function getShorts(
  filter: ContentFilter = {},
  sort: SortKey = "popular"
): ContentCard[] {
  return sortCards(shortCards.filter((c) => matchesFilter(c, filter)), sort);
}

/** 롱폼+숏츠 통합(상세 페이지의 videoId 룩업 등 단건 조회는 getCard 사용 권장). */
export function getAllCards(): ContentCard[] {
  return [...videoCards, ...shortCards];
}

/** videoId 단건 조회. 없으면 undefined(상세 페이지에서 404 처리). */
export function getCard(videoId: string): ContentCard | undefined {
  return cardById.get(videoId);
}

/** 모든 videoId — generateStaticParams 용(롱폼+숏츠 전건 사전 생성). */
export function getAllVideoIds(): string[] {
  return [...cardById.keys()];
}

/* ===========================================================================
 * 5. 트랙 (커리큘럼)
 * ======================================================================== */

/** Track 메타 목록(steps 미해석). 학습 허브 카드용. */
export function getTracks(): Track[] {
  return curated.tracks;
}

export function getTrackIds(): string[] {
  return curated.tracks.map((t) => t.trackId);
}

/** trackId → TrackView (steps 를 ContentCard 로 해석). 없으면 undefined(404). */
export function getTrackView(trackId: string): TrackView | undefined {
  const track = curated.tracks.find((t) => t.trackId === trackId);
  if (!track) return undefined;
  const steps = track.steps
    .map((step) => {
      const card = cardById.get(step.videoId);
      return card ? { note: step.note, card } : null;
    })
    .filter((s): s is { note: string; card: ContentCard } => s !== null);
  const { steps: _omit, ...rest } = track;
  return { ...rest, steps };
}

/** 난이도 범위 표기. 예: "입문~고급". null 스텝 제외(copy_deck §B.5). */
export function getTrackDifficultyRange(track: TrackView): string {
  const order = DIFFICULTY_ORDER;
  const present = track.steps
    .map((s) => s.card.difficulty)
    .filter((d): d is Difficulty => d !== null);
  if (present.length === 0) return "";
  const indices = present.map((d) => order.indexOf(d));
  const min = Math.min(...indices);
  const max = Math.max(...indices);
  return min === max
    ? DIFFICULTY_LABEL[order[min]]
    : `${DIFFICULTY_LABEL[order[min]]}~${DIFFICULTY_LABEL[order[max]]}`;
}

/** 특정 videoId 가 소속된 트랙들(상세 페이지 "이 트랙 이어보기" 배너용). */
export function getTracksContaining(videoId: string): Track[] {
  return curated.tracks.filter((t) =>
    t.steps.some((s) => s.videoId === videoId)
  );
}

/* ===========================================================================
 * 6. 통계 (홈 통계 스트립 / 라이브러리 필터 카운트)
 * ======================================================================== */

/** curated.json 전역 stats(숏츠 포함 합산). 홈 분포 칩 등. */
export function getStats() {
  return curated.stats;
}

/**
 * 라이브러리(롱폼) 필터 옵션별 카운트 — isShort=false 부분집합에서 재계산.
 * 합산 stats 는 숏츠 포함이라 라이브러리 카운트와 불일치(spec §6.1, integration-qa 검증 항목).
 */
export function getLibraryFacets() {
  const byType: Partial<Record<ContentType | "uncurated", number>> = {};
  const byGenre: Partial<Record<Genre, number>> = {};
  const byDifficulty: Record<Difficulty | "none", number> = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
    none: 0,
  };
  for (const card of videoCards) {
    byType[card.type] = (byType[card.type] ?? 0) + 1;
    if (card.genre) byGenre[card.genre] = (byGenre[card.genre] ?? 0) + 1;
    byDifficulty[card.difficulty ?? "none"] += 1;
  }
  return { byType, byGenre, byDifficulty, total: videoCards.length };
}

/** 숏츠 피드 필터 옵션별 카운트(genre/type) — isShort=true 부분집합. */
export function getShortsFacets() {
  const byGenre: Partial<Record<Genre, number>> = {};
  const byType: Partial<Record<ContentType | "uncurated", number>> = {};
  for (const card of shortCards) {
    if (card.genre) byGenre[card.genre] = (byGenre[card.genre] ?? 0) + 1;
    byType[card.type] = (byType[card.type] ?? 0) + 1;
  }
  return { byGenre, byType, total: shortCards.length };
}

/* ===========================================================================
 * 7. enum → 한국어 라벨 사전 / 색 매핑 / 정렬 순서
 *    → src/lib/labels.ts 로 이전(B1, 데이터-무관 순수 모듈). 상단 re-export 참조.
 * ======================================================================== */
