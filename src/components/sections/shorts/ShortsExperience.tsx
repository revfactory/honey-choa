"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShortsFeed } from "@/components/player";
import { ShortsOverlay } from "@/components/sections/shorts/ShortsOverlay";
import { FilterChip, EmptyState } from "@/components/common";
import { cn } from "@/lib/cn";
import { GENRE_LABEL, GENRE_COLOR, GENRE_ORDER } from "@/lib/labels";
import type { ContentCard, Genre } from "@/types/content";

const DOT_COLOR: Record<string, string> = {
  honey: "var(--honey-400)",
  heat: "var(--heat-400)",
  sky: "var(--sky-400)",
  rose: "var(--rose-400)",
  muted: "var(--text-muted)",
};

/** 랜덤 재생 초기/추가 공급 배치 크기. */
const RANDOM_INIT = 40;
const RANDOM_MORE = 40;

/**
 * pool 에서 n개를 무작위로 뽑아 잇는다(바로 앞 영상 즉시 반복만 회피).
 * 무한 랜덤 피드 공급용 — 매번 진짜 무작위, 중복 허용(끝없이 이어짐).
 */
function pickRandomBatch(
  pool: ContentCard[],
  n: number,
  avoidId: string | null
): ContentCard[] {
  if (pool.length === 0) return [];
  const out: ContentCard[] = [];
  let last = avoidId;
  for (let i = 0; i < n; i++) {
    let pick = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && pick.videoId === last) {
      pick = pool[Math.floor(Math.random() * pool.length)];
    }
    out.push(pick);
    last = pick.videoId;
  }
  return out;
}

interface ShortsExperienceProps {
  /** isShort=true 전건(인기순). 필터는 클라에서 부분집합. */
  shorts: ContentCard[];
  /** 숏츠 부분집합 genre 카운트(0건 칩 비활성용). */
  genreFacets: Partial<Record<Genre, number>>;
}

/**
 * 숏츠 경험 셸 — wireframe §7 (ui-craftsman 오버레이/chrome 영역).
 * player-integrator ShortsFeed(엔진: 가상스크롤·동시임베드≤2·점진로드)를 그대로 사용하고,
 * renderChrome(닫기 ✕ + genre 필터칩)·renderOverlay(메타)·emptyState 슬롯만 ui-craftsman 이 채운다.
 * 경계: 피드 코어·임베드는 건드리지 않는다(정책 3).
 * 딥링크 ?v= → 시작 인덱스 해석(정적 export: 마운트 후 location).
 */
export function ShortsExperience({ shorts, genreFacets }: ShortsExperienceProps) {
  const router = useRouter();
  const [genre, setGenre] = useState<Genre | null>(null);
  // 숏츠는 항상 무한 랜덤 재생. 끝없이 이어지는 무작위 시퀀스.
  const [randomSeq, setRandomSeq] = useState<ContentCard[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get("genre");
    if (g && (GENRE_ORDER as string[]).includes(g)) setGenre(g as Genre);
  }, []);

  // genre 필터 적용분.
  const filtered = useMemo(
    () => (genre ? shorts.filter((s) => s.genre === genre) : shorts),
    [shorts, genre]
  );

  // 풀(장르) 변경 또는 마운트 시 새 무작위 시퀀스로 시드(첫 배치).
  useEffect(() => {
    setRandomSeq(pickRandomBatch(filtered, RANDOM_INIT, null));
  }, [filtered]);

  // 끝 근처 도달 시 호출(엔진) → 새 무작위 영상을 계속 이어붙여 무한 재생.
  const appendRandom = useCallback(() => {
    setRandomSeq((prev) =>
      prev.length === 0
        ? prev
        : [
            ...prev,
            ...pickRandomBatch(filtered, RANDOM_MORE, prev[prev.length - 1].videoId),
          ]
    );
  }, [filtered]);

  // 무작위 시퀀스(아직 비었으면 첫 프레임만 인기순 폴백).
  const ordered = randomSeq.length ? randomSeq : filtered;

  // 장르 "교체"에만 첫 슬라이드로 리셋. 이어붙이기(길이 증가)는 키가 고정이라 리셋 안 함.
  const resetKey = `${genre ?? "all"}::rnd`;

  const close = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };

  const noResults = genre !== null && filtered.length === 0;

  return (
    <>
      {/* a11y: 풀스크린 피드라 시각적 헤딩이 없으므로 스크린리더용 h1 제공(Phase 4 결함 수정). */}
      <h1 className="sr-only">숏츠</h1>
      <ShortsFeed
        shorts={ordered}
        resetKey={resetKey}
        onNearEnd={appendRandom}
      renderChrome={() => (
        <div className="flex items-start justify-between gap-[var(--space-3)] p-[var(--space-4)] pt-[max(var(--space-4),env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--overlay-scrim)] text-[var(--text-primary)] backdrop-blur-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* genre 필터칩(가로 스크롤) */}
          <div className="flex max-w-[70vw] gap-[var(--space-2)] overflow-x-auto rounded-[var(--radius-chip)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterChip
              label="전체"
              active={genre === null}
              onClick={() => setGenre(null)}
              className={cn(
                "backdrop-blur-sm",
                genre === null ? undefined : "bg-[var(--overlay-scrim)]"
              )}
            />
            {GENRE_ORDER.map((g) => {
              const count = genreFacets[g] ?? 0;
              if (count === 0) return null;
              return (
                <FilterChip
                  key={g}
                  label={GENRE_LABEL[g]}
                  dotColor={DOT_COLOR[GENRE_COLOR[g]]}
                  active={genre === g}
                  onClick={() => setGenre(genre === g ? null : g)}
                  className={cn(
                    "backdrop-blur-sm",
                    genre === g ? undefined : "bg-[var(--overlay-scrim)]"
                  )}
                />
              );
            })}
          </div>
        </div>
      )}
      renderOverlay={(card) => <ShortsOverlay card={card} />}
      emptyState={
        noResults ? (
          <EmptyState
            title="이 조건의 숏츠가 없어요"
            actionLabel="필터 초기화"
            onAction={() => setGenre(null)}
          />
        ) : undefined
      }
      />
    </>
  );
}
