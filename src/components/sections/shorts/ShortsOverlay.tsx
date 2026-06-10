"use client";

import Link from "next/link";
import { GENRE_LABEL, GENRE_COLOR, TYPE_LABEL, formatCountKo } from "@/lib/labels";
import type { ContentCard } from "@/types/content";

const DOT_COLOR: Record<string, string> = {
  honey: "var(--honey-400)",
  heat: "var(--heat-400)",
  sky: "var(--sky-400)",
  rose: "var(--rose-400)",
  muted: "var(--text-muted)",
};

/**
 * 숏츠 메타 오버레이 — wireframe §7.1/7.3 / copy_deck §7 (ui-craftsman 영역).
 * thumb-veil 위 장르 도트 + 유형 + 제목 + 조회 + (relatedIds 보유 시) 관련영상.
 * ShortsFeed.renderOverlay 슬롯에 주입(player-integrator 엔진).
 */
export function ShortsOverlay({ card }: { card: ContentCard }) {
  const genreColor = card.genre ? DOT_COLOR[GENRE_COLOR[card.genre]] : undefined;
  const hasRelated = card.relatedIds.length > 0;

  return (
    <div
      className="absolute inset-x-0 bottom-0 p-[var(--space-4)] pb-[max(var(--space-4),env(safe-area-inset-bottom))]"
      style={{ background: "var(--thumb-veil)" }}
    >
      <div className="flex items-center gap-2 text-[length:var(--text-xs)] font-semibold text-[var(--text-secondary)]">
        {card.genre && (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: genreColor }}
            />
            {GENRE_LABEL[card.genre]}
          </span>
        )}
        {card.type !== "uncurated" && <span>· {TYPE_LABEL[card.type]}</span>}
      </div>
      <p className="mt-1.5 line-clamp-2 text-[length:var(--text-base)] font-semibold text-[var(--text-primary)]">
        {card.title}
      </p>
      <p className="tabular mt-1 text-[length:var(--text-sm)] text-[var(--text-muted)]">
        조회 {formatCountKo(card.statistics.viewCount)}
      </p>
      {hasRelated && (
        <Link
          href={`/watch/${card.relatedIds[0]}/`}
          className="mt-2 inline-flex items-center gap-1 text-[length:var(--text-sm)] font-semibold text-[var(--text-link)]"
        >
          관련 영상 보기 →
        </Link>
      )}
    </div>
  );
}
