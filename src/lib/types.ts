/**
 * honey-choa 콘텐츠 데이터 타입 정의
 * ----------------------------------------------------------------------------
 * 계약 문서: _workspace/01_schema.md (v1.0.0)
 * 근거 실데이터: data/channel.json, data/videos.json(179), data/shorts.json(1425)
 *
 * 3계층:
 *   L1 RAW       — Channel / VideoItem (youtube-data-pipeline 생산)
 *   L2 ENRICHED  — CuratedContent / CuratedItem (content-curator 생산)
 *   L3 VIEW      — ContentCard / TrackView / FeedView (프론트 런타임 조인)
 *
 * 불일치 시 실데이터가 정답이다. 임의로 필드를 추가/제거하지 말 것.
 */

/* ===========================================================================
 * 공통
 * ======================================================================== */

/** ISO8601 타임스탬프 문자열 (예: "2026-04-20T12:57:59Z") */
export type ISO8601 = string;

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

/** 실측에서 관측된 썸네일 키. maxres/standard는 결측 가능 → 폴백 체인 사용. */
export type ThumbnailKey = "default" | "medium" | "high" | "standard" | "maxres";

export type Thumbnails = Partial<Record<ThumbnailKey, Thumbnail>>;

/** 썸네일 폴백 우선순위. 단일 키 직접 접근 금지 — 항상 이 함수를 통한다. */
export const THUMBNAIL_FALLBACK_ORDER: ThumbnailKey[] = [
  "maxres",
  "standard",
  "high",
  "medium",
  "default",
];

export function resolveThumbnailUrl(thumbnails: Thumbnails): string {
  for (const key of THUMBNAIL_FALLBACK_ORDER) {
    const t = thumbnails[key];
    if (t?.url) return t.url;
  }
  return "";
}

/* ===========================================================================
 * L1 — 원천 RAW (data/channel.json, data/videos.json, data/shorts.json)
 * ======================================================================== */

export interface ChannelStatistics {
  subscriberCount: number;
  /** 채널 통계상 총 영상 수. 수집 건수보다 클 수 있음(비공개/멤버십). */
  videoCount: number;
  viewCount: number;
}

/** data/channel.json — 단일 객체. 식별자 키는 channelId (id 아님). */
export interface Channel {
  channelId: string;
  title: string;
  handle: string;
  description: string;
  publishedAt: ISO8601;
  thumbnails: Thumbnails;
  statistics: ChannelStatistics;
  fetchedAt: ISO8601;
}

export interface VideoStatistics {
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

/**
 * data/videos.json / data/shorts.json의 item 스키마. 두 파일 동일 구조.
 * 일반영상/숏츠 구분은 isShort 필드로만 한다(길이로 판별 금지 — 숏길이 영상 존재).
 */
export interface VideoItem {
  videoId: string;
  title: string;
  description: string;
  publishedAt: ISO8601;
  /** ISO8601 duration (예: "PT9M4S") */
  duration: string;
  durationSeconds: number;
  thumbnails: Thumbnails;
  /** 실측상 87~99%가 빈 배열. 분류 근거로 신뢰하지 말 것. 없으면 [] (undefined 아님). */
  tags: string[];
  statistics: VideoStatistics;
  /** false면 임베드 플레이어 대신 새 탭 폴백. 실측 전건 true이나 방어적 처리 유지. */
  embeddable: boolean;
  /** null = 숏츠 판별 미확정(추측 금지). */
  isShort: boolean | null;
}

/** ShortItem은 VideoItem과 동일 스키마 (isShort=true). 의미 구분용 별칭. */
export type ShortItem = VideoItem;

/** RAW 컬렉션 파일 래퍼 ({ fetchedAt, count, items }). */
export interface VideoCollection {
  fetchedAt: ISO8601;
  count: number;
  items: VideoItem[];
}

/* ===========================================================================
 * L2 — 큐레이션 ENRICHED (data/curated.json) ★ 핵심 계약
 * content-curator 생산 / frontend-lead 소비
 * enum 값은 라틴댄스 실데이터에 맞춰 보정됨 (dance-curriculum-taxonomy 구조 준수).
 * ======================================================================== */

export type ContentType =
  | "workshop"
  | "performance"
  | "social"
  | "battle"
  | "fancam"
  | "music_mix"
  | "challenge"
  | "tutorial"
  | "basics"
  | "vlog_etc"
  | "unclassified";

export type Genre =
  | "bachata"
  | "salsa"
  | "zouk"
  | "kizomba"
  | "latin_pop"
  | "etc";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Song {
  title: string;
  artist?: string;
}

export interface CuratedItem {
  /** L1 VideoItem.videoId 참조 (조인 키). RAW에 존재하는 id만 허용. */
  videoId: string;
  type: ContentType;
  /** 주 장르 (단일값). */
  genre: Genre;
  /** 멀티장르 보조 (실측 87건). 없으면 생략. */
  subGenres?: Genre[];
  /** workshop/tutorial/basics/practice에만 부여, 그 외 null. */
  difficulty: Difficulty | null;
  /** 제목에서 추출 가능할 때만. 추측 금지(불확실 시 생략). */
  song?: Song;
  /** 영상↔숏츠 매칭 videoId 목록. 양방향 기록. 없으면 []. */
  relatedIds: string[];
  /** 분류 근거(필수). 예: "제목에 '(바차타)' + '워크샵'". */
  evidence: string;
  /** true=사람 보정. 자동 재분류가 절대 덮어쓰지 않는다. */
  manual: boolean;
}

export interface TrackStep {
  videoId: string;
  /** 이 스텝을 넣은 사유. */
  note: string;
}

export interface Track {
  trackId: string;
  title: string;
  description: string;
  /** 트랙은 같은 장르 내에서 구성. */
  genre: Genre;
  /** 순서 있는 학습 경로. 첫 스텝 beginner, 난이도 단조 증가, 5건 이상. */
  steps: TrackStep[];
}

export interface CuratedStats {
  byType: Record<ContentType, number>;
  byGenre: Record<Genre, number>;
  /** beginner/intermediate/advanced/none 키. */
  byDifficulty: Record<string, number>;
  unclassified: number;
  total: number;
}

/** data/curated.json 루트. schemaVersion 불일치 시 프론트가 거부해야 한다. */
export interface CuratedContent {
  schemaVersion: string;
  generatedAt: ISO8601;
  items: CuratedItem[];
  tracks: Track[];
  stats: CuratedStats;
}

/** content-curator가 생산해야 하는 schemaVersion. */
export const CURATED_SCHEMA_VERSION = "1.0.0";

/* ===========================================================================
 * L3 — 프론트 VIEW MODEL (런타임 조인 산출, 정적 파일 아님)
 * 프론트 데이터 훅이 VideoItem ⨝ CuratedItem 으로 구성.
 * ======================================================================== */

/**
 * 카드/피드 1차 소비 단위. RAW + 큐레이션 + 파생 필드.
 * curation 누락 시 category="uncurated"로 노출(콘텐츠 소실 방지).
 */
export interface ContentCard {
  // --- RAW에서 (VideoItem) ---
  videoId: string;
  title: string;
  description: string;
  publishedAt: ISO8601;
  durationSeconds: number;
  thumbnails: Thumbnails;
  statistics: VideoStatistics;
  embeddable: boolean;
  isShort: boolean | null;

  // --- 큐레이션에서 (CuratedItem, 누락 가능) ---
  type: ContentType | "uncurated";
  genre: Genre | null;
  subGenres?: Genre[];
  difficulty: Difficulty | null;
  song?: Song;
  relatedIds: string[];

  // --- 파생 (선제 정의) ---
  /** 폴백 적용된 단일 썸네일 URL. */
  thumbnailUrl: string;
  /** publishedAt 연도 (예: "2026"). 연도 필터용. */
  publishedYear: string;
  /** durationSeconds → "9:04" 표기. */
  formattedDuration: string;
  /** viewCount 상위 백분위 여부(인기순 정렬용). */
  isPopular: boolean;
}

/** Track의 steps를 ContentCard로 해석한 뷰. */
export interface TrackView extends Omit<Track, "steps"> {
  steps: Array<{ note: string; card: ContentCard }>;
}

/** 프론트 최상위 피드 컴포지트. */
export interface FeedView {
  channel: Channel;
  videos: ContentCard[];
  shorts: ContentCard[];
  tracks: TrackView[];
}
