"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Section,
  FilterChip,
  VideoCard,
  EmptyState,
} from "@/components/common";
import { Reveal } from "@/components/motion";
import { cn } from "@/lib/cn";
import {
  TYPE_LABEL,
  GENRE_LABEL,
  DIFFICULTY_LABEL,
  GENRE_COLOR,
  LIBRARY_TYPE_ORDER,
  GENRE_ORDER,
  formatInt,
} from "@/lib/labels";
import type { SortKey } from "@/lib/content";
import type {
  ContentCard,
  ContentType,
  Genre,
  Difficulty,
} from "@/types/content";

const GENRE_DOT_COLOR: Record<string, string> = {
  honey: "var(--honey-400)",
  heat: "var(--heat-400)",
  sky: "var(--sky-400)",
  rose: "var(--rose-400)",
  muted: "var(--text-muted)",
};

const DIFFICULTY_ORDER: Difficulty[] = ["beginner", "intermediate", "advanced"];

const SORT_LABEL: Record<SortKey, string> = {
  popular: "인기순",
  recent: "최신순",
  duration: "길이순",
};

const PAGE_SIZE = 24;

type Facets = {
  byType: Partial<Record<ContentType | "uncurated", number>>;
  byGenre: Partial<Record<Genre, number>>;
  byDifficulty: Record<Difficulty | "none", number>;
  total: number;
};

interface LibraryBrowserProps {
  /** 롱폼 전건(isShort=false). 클라에서 필터/정렬/검색. */
  cards: ContentCard[];
  facets: Facets;
}

/**
 * 라이브러리 — wireframe §8 / copy_deck §6.
 * type 1차 + genre/difficulty 보조 + 미분류 토글 + 검색 + 정렬. AND 결합.
 * 칩 카운트는 롱폼 부분집합(facets) — 합산 stats 미사용(spec §6.1).
 * 필터 상태 ↔ URL 쿼리 동기화(공유·딥링크). 0건 빈상태 + 난이도 완화 제안.
 */
export function LibraryBrowser({ cards, facets }: LibraryBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- URL → 초기 상태 ---
  const [type, setType] = useState<ContentType | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [includeUnclassified, setIncludeUnclassified] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = useState(false);

  // 최초 마운트 시 URL 쿼리 반영(딥링크 — 홈 장르칩/about 막대/전체보기 진입).
  useEffect(() => {
    const t = searchParams.get("type");
    if (t && (LIBRARY_TYPE_ORDER as string[]).includes(t)) setType(t as ContentType);
    const g = searchParams.get("genre");
    if (g && (GENRE_ORDER as string[]).includes(g)) setGenres([g as Genre]);
    const d = searchParams.get("difficulty");
    if (d && (DIFFICULTY_ORDER as string[]).includes(d)) setDifficulties([d as Difficulty]);
    const s = searchParams.get("sort");
    if (s === "popular" || s === "recent" || s === "duration") setSort(s);
    const q = searchParams.get("q");
    if (q) setQuery(q);
    // 최초 1회만.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 상태 → URL 동기화 ---
  useEffect(() => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (genres.length === 1) params.set("genre", genres[0]);
    if (difficulties.length === 1) params.set("difficulty", difficulties[0]);
    if (sort !== "popular") params.set("sort", sort);
    if (query.trim()) params.set("q", query.trim());
    const qs = params.toString();
    router.replace(qs ? `/library/?${qs}` : "/library/", { scroll: false });
  }, [type, genres, difficulties, sort, query, router]);

  // --- 필터 적용 ---
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = cards.filter((c) => {
      if (!includeUnclassified && c.type === "unclassified") return false;
      if (type && c.type !== type) return false;
      if (genres.length && (!c.genre || !genres.includes(c.genre))) return false;
      if (difficulties.length && (!c.difficulty || !difficulties.includes(c.difficulty)))
        return false;
      if (q && !c.title.toLowerCase().includes(q)) return false;
      return true;
    });
    const sorted = [...result];
    if (sort === "recent")
      sorted.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    else if (sort === "duration")
      sorted.sort((a, b) => b.durationSeconds - a.durationSeconds);
    else sorted.sort((a, b) => b.statistics.viewCount - a.statistics.viewCount);
    return sorted;
  }, [cards, type, genres, difficulties, includeUnclassified, query, sort]);

  // 필터 변경 시 더보기 페이지 리셋.
  useEffect(() => setVisible(PAGE_SIZE), [type, genres, difficulties, includeUnclassified, query, sort]);

  // 난이도 완화 제안 — 0건일 때 난이도만 해제하면 몇 편?(copy_deck §10.3)
  const relaxedCount = useMemo(() => {
    if (filtered.length > 0 || difficulties.length === 0) return 0;
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (!includeUnclassified && c.type === "unclassified") return false;
      if (type && c.type !== type) return false;
      if (genres.length && (!c.genre || !genres.includes(c.genre))) return false;
      if (q && !c.title.toLowerCase().includes(q)) return false;
      return true;
    }).length;
  }, [filtered.length, cards, type, genres, difficulties, includeUnclassified, query]);

  const reset = useCallback(() => {
    setType(null);
    setGenres([]);
    setDifficulties([]);
    setIncludeUnclassified(false);
    setQuery("");
    setSort("popular");
  }, []);

  const toggleGenre = (g: Genre) =>
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  const toggleDifficulty = (d: Difficulty) =>
    setDifficulties((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const shown = filtered.slice(0, visible);

  return (
    <Section>
      {/* 헤더 + 검색 */}
      <header className="mb-[var(--space-6)] flex flex-col gap-[var(--space-3)]">
        <div className="flex flex-wrap items-end justify-between gap-[var(--space-4)]">
          <div className="flex flex-col gap-1">
            <h1 className="text-[length:var(--text-h1)] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
              영상 라이브러리
            </h1>
            <p className="text-[length:var(--text-base)] text-[var(--text-secondary)]">
              워크샵·튜토리얼·퍼포먼스 {formatInt(facets.total)}편을 골라 보세요
            </p>
          </div>
          <SearchInput value={query} onChange={setQuery} className="w-full sm:w-72" />
        </div>
      </header>

      {/* type 1차 칩(가로 스크롤) */}
      <div className="-mx-[var(--gutter)] mb-[var(--space-3)] overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-[var(--space-2)]">
          <FilterChip
            label="전체"
            count={facets.total}
            active={type === null}
            onClick={() => setType(null)}
          />
          {LIBRARY_TYPE_ORDER.map((t) => {
            const count = facets.byType[t] ?? 0;
            if (count === 0) return null;
            return (
              <FilterChip
                key={t}
                label={TYPE_LABEL[t]}
                count={count}
                active={type === t}
                onClick={() => setType(type === t ? null : t)}
              />
            );
          })}
        </div>
      </div>

      {/* 보조 필터(데스크탑 인라인) */}
      <div className="mb-[var(--space-4)] hidden flex-wrap items-center gap-x-[var(--space-6)] gap-y-[var(--space-3)] md:flex">
        <FilterGroup label="장르">
          {GENRE_ORDER.map((g) => {
            const count = facets.byGenre[g] ?? 0;
            if (count === 0) return null;
            return (
              <FilterChip
                key={g}
                label={GENRE_LABEL[g]}
                count={count}
                dotColor={GENRE_DOT_COLOR[GENRE_COLOR[g]]}
                active={genres.includes(g)}
                onClick={() => toggleGenre(g)}
              />
            );
          })}
        </FilterGroup>
        <FilterGroup label="난이도">
          {DIFFICULTY_ORDER.map((d) => {
            const count = facets.byDifficulty[d] ?? 0;
            return (
              <FilterChip
                key={d}
                label={DIFFICULTY_LABEL[d]}
                count={count}
                active={difficulties.includes(d)}
                onClick={() => count > 0 && toggleDifficulty(d)}
                className={count === 0 ? "pointer-events-none opacity-40" : undefined}
              />
            );
          })}
        </FilterGroup>
        <label className="flex cursor-pointer items-center gap-2 text-[length:var(--text-sm)] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={includeUnclassified}
            onChange={(e) => setIncludeUnclassified(e.target.checked)}
            className="accent-[var(--honey-400)]"
          />
          미분류 포함
        </label>
      </div>

      {/* 결과 카운트 + 정렬 + 초기화 + 모바일 필터 버튼 */}
      <div className="mb-[var(--space-4)] flex items-center justify-between gap-[var(--space-3)]">
        <div className="flex items-center gap-[var(--space-3)]">
          <span className="tabular text-[length:var(--text-sm)] text-[var(--text-secondary)]">
            결과 {formatInt(filtered.length)}편
          </span>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-1 rounded-[var(--radius-chip)] border border-[var(--stage-600)] px-[var(--space-3)] py-1.5 text-[length:var(--text-sm)] text-[var(--text-secondary)] md:hidden"
          >
            필터 ▾
          </button>
        </div>
        <div className="flex items-center gap-[var(--space-3)]">
          <SortSelect value={sort} onChange={setSort} />
          <button
            type="button"
            onClick={reset}
            className="text-[length:var(--text-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            초기화
          </button>
        </div>
      </div>

      {/* difficulty 활성 안내 */}
      {difficulties.length > 0 && (
        <p className="mb-[var(--space-3)] text-[length:var(--text-sm)] text-[var(--text-muted)]">
          난이도 표기가 있는 영상만 보여드려요
        </p>
      )}

      {/* 그리드 / 빈상태 */}
      {filtered.length === 0 ? (
        <EmptyState
          title="이 조건에 맞는 영상이 없어요"
          description={
            relaxedCount > 0
              ? `난이도를 해제하면 ${formatInt(relaxedCount)}편을 볼 수 있어요`
              : "조건을 바꾸거나 초기화해 보세요"
          }
          actionLabel="초기화"
          onAction={reset}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-[var(--space-4)] md:grid-cols-3 lg:grid-cols-4">
            {shown.map((card, i) => (
              <Reveal key={card.videoId} index={i}>
                <VideoCard card={card} />
              </Reveal>
            ))}
          </div>
          {visible < filtered.length && (
            <div className="mt-[var(--space-8)] flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="inline-flex min-h-[44px] items-center rounded-[var(--radius-chip)] border border-[var(--honey-400)] px-[var(--space-8)] text-[length:var(--text-base)] text-[var(--honey-300)] transition-colors hover:bg-[var(--honey-glow)]"
              >
                더 보기
              </button>
            </div>
          )}
        </>
      )}

      {/* 모바일 필터 바텀시트 */}
      {sheetOpen && (
        <FilterSheet
          facets={facets}
          genres={genres}
          difficulties={difficulties}
          includeUnclassified={includeUnclassified}
          resultCount={filtered.length}
          onToggleGenre={toggleGenre}
          onToggleDifficulty={toggleDifficulty}
          onToggleUnclassified={setIncludeUnclassified}
          onReset={reset}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </Section>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[var(--space-2)]">
      <span className="text-[length:var(--text-sm)] text-[var(--text-muted)]">{label}</span>
      <div className="flex flex-wrap gap-[var(--space-2)]">{children}</div>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      type="search"
      inputMode="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="제목으로 검색"
      aria-label="영상 제목 검색"
      className={cn(
        "h-11 rounded-[var(--radius-input)] border border-[var(--stage-600)] bg-[var(--stage-850)] px-[var(--space-4)] text-[length:var(--text-base)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--honey-400)] focus:outline-none",
        className
      )}
    />
  );
}

function SortSelect({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[length:var(--text-sm)] text-[var(--text-secondary)]">
      정렬
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label="정렬 기준"
        className="h-9 rounded-[var(--radius-input)] border border-[var(--stage-600)] bg-[var(--stage-850)] px-[var(--space-3)] text-[var(--text-primary)] focus:border-[var(--honey-400)] focus:outline-none"
      >
        {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
          <option key={k} value={k}>
            {SORT_LABEL[k]}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterSheet({
  facets,
  genres,
  difficulties,
  includeUnclassified,
  resultCount,
  onToggleGenre,
  onToggleDifficulty,
  onToggleUnclassified,
  onReset,
  onClose,
}: {
  facets: Facets;
  genres: Genre[];
  difficulties: Difficulty[];
  includeUnclassified: boolean;
  resultCount: number;
  onToggleGenre: (g: Genre) => void;
  onToggleDifficulty: (d: Difficulty) => void;
  onToggleUnclassified: (v: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col justify-end md:hidden">
      <button
        type="button"
        aria-label="필터 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--overlay-scrim)]"
      />
      <div className="relative flex flex-col gap-[var(--space-4)] rounded-t-[var(--radius-card)] border-t border-[var(--stage-700)] bg-[var(--stage-900)] p-[var(--space-6)] pb-[calc(var(--space-6)+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <span className="text-[length:var(--text-h3)] font-bold text-[var(--text-primary)]">
            필터
          </span>
          <button
            type="button"
            aria-label="필터 닫기"
            onClick={onClose}
            className="text-[var(--text-muted)]"
          >
            ✕
          </button>
        </div>

        <FilterGroup label="장르">
          {GENRE_ORDER.map((g) => {
            const count = facets.byGenre[g] ?? 0;
            if (count === 0) return null;
            return (
              <FilterChip
                key={g}
                label={GENRE_LABEL[g]}
                count={count}
                dotColor={GENRE_DOT_COLOR[GENRE_COLOR[g]]}
                active={genres.includes(g)}
                onClick={() => onToggleGenre(g)}
              />
            );
          })}
        </FilterGroup>
        <FilterGroup label="난이도">
          {DIFFICULTY_ORDER.map((d) => {
            const count = facets.byDifficulty[d] ?? 0;
            return (
              <FilterChip
                key={d}
                label={DIFFICULTY_LABEL[d]}
                count={count}
                active={difficulties.includes(d)}
                onClick={() => count > 0 && onToggleDifficulty(d)}
                className={count === 0 ? "pointer-events-none opacity-40" : undefined}
              />
            );
          })}
        </FilterGroup>
        <label className="flex cursor-pointer items-center gap-2 text-[length:var(--text-sm)] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={includeUnclassified}
            onChange={(e) => onToggleUnclassified(e.target.checked)}
            className="accent-[var(--honey-400)]"
          />
          미분류 포함
        </label>

        <div className="mt-[var(--space-2)] flex items-center gap-[var(--space-3)]">
          <button
            type="button"
            onClick={onReset}
            className="text-[length:var(--text-sm)] text-[var(--text-muted)]"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex min-h-[44px] items-center rounded-[var(--radius-chip)] bg-[var(--honey-400)] px-[var(--space-8)] font-semibold text-[var(--text-on-honey)]"
          >
            {formatInt(resultCount)}편 보기
          </button>
        </div>
      </div>
    </div>
  );
}
