"use client";

/**
 * ShortsFeedClient — `/shorts` 페이지 클라 래퍼 (player-integrator)
 * ----------------------------------------------------------------------------
 * 정적 export 라 ?v= 딥링크는 클라에서 해석한다(서버 searchParams 없음).
 * 책임: 딥링크 v→index 해석, 닫기 ✕ chrome, 기본 메타 오버레이 슬롯 제공.
 *
 * 오버레이 메타·필터칩 고도화는 ui-craftsman(components/sections/) 영역 —
 * 여기서는 시청이 성립하는 최소 메타(제목·장르·조회) + 관련영상 진입만 제공하고,
 * renderOverlay/renderChrome 슬롯으로 교체 가능함을 명시한다.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ContentCard } from "@/types/content";
import { GENRE_LABEL, GENRE_COLOR, TYPE_LABEL, formatCountKo } from "@/lib/labels";
import { ShortsFeed } from "./ShortsFeed";

const DOT_COLOR: Record<string, string> = {
  honey: "var(--honey-400)",
  heat: "var(--heat-400)",
  sky: "var(--sky-400)",
  rose: "var(--rose-400)",
  muted: "var(--text-muted)",
};

export function ShortsFeedClient({ shorts }: { shorts: ContentCard[] }) {
  const router = useRouter();

  // 딥링크 ?v= → 인덱스. 정적 export: 마운트 후 location 에서 읽는다.
  const [initialIndex, setInitialIndex] = useState(0);
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("v");
    if (v) {
      const i = shorts.findIndex((s) => s.videoId === v);
      if (i >= 0) setInitialIndex(i);
    }
  }, [shorts]);

  const close = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <ShortsFeed
      shorts={shorts}
      initialIndex={initialIndex}
      renderChrome={() => (
        <div className="flex items-center justify-between p-4">
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--overlay-scrim)] text-[var(--text-primary)] backdrop-blur-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {/* 필터칩 슬롯 — ui-craftsman 고도화 지점 */}
        </div>
      )}
      renderOverlay={(card) => <ShortMeta card={card} />}
    />
  );
}

/** 최소 메타 오버레이 — thumb-veil 위 제목·장르·조회·(관련영상 보유 시) 진입. */
function ShortMeta({ card }: { card: ContentCard }) {
  const genreColor = card.genre ? DOT_COLOR[GENRE_COLOR[card.genre]] : undefined;
  const hasRelated = card.relatedIds.length > 0;
  return (
    <div
      className="absolute inset-x-0 bottom-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      style={{ background: "var(--thumb-veil)" }}
    >
      <div className="flex items-center gap-2 text-[length:var(--text-xs)] text-[var(--text-secondary)]">
        {card.genre ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: genreColor }}
              aria-hidden
            />
            {GENRE_LABEL[card.genre]}
          </span>
        ) : null}
        {card.type !== "uncurated" ? (
          <span>· {TYPE_LABEL[card.type]}</span>
        ) : null}
      </div>
      <p className="mt-1 line-clamp-1 text-[length:var(--text-base)] font-semibold text-[var(--text-primary)]">
        {card.title}
      </p>
      <p className="tabular mt-0.5 text-[length:var(--text-sm)] text-[var(--text-muted)]">
        조회 {formatCountKo(card.statistics.viewCount)}
      </p>
      {hasRelated ? (
        <Link
          href={`/watch/${card.relatedIds[0]}/`}
          className="mt-2 inline-flex items-center gap-1 text-[length:var(--text-sm)] text-[var(--text-link)]"
        >
          관련 영상 보기 →
        </Link>
      ) : null}
    </div>
  );
}
