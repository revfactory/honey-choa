import Link from "next/link";
import { cn } from "@/lib/cn";
import { GENRE_COLOR } from "@/lib/labels";
import type { ContentCard } from "@/types/content";

interface ShortsCardProps {
  card: ContentCard;
  className?: string;
  priority?: boolean;
}

const GENRE_DOT_COLOR: Record<string, string> = {
  honey: "var(--honey-400)",
  heat: "var(--heat-400)",
  sky: "var(--sky-400)",
  rose: "var(--rose-400)",
  muted: "var(--text-muted)",
};

/**
 * 숏츠 카드 (9:16, 세로) — design_system §5.2.
 * 썸네일이 카드 전면을 채우고 하단 thumb-veil 그라데이션 위 제목 오버레이.
 * 우상단 ▶ 라인 아이콘, 좌하단 장르 도트.
 * 목록은 이미지 lazy-load + decoding=async (대량 1,425건 성능).
 */
export function ShortsCard({ card, className, priority }: ShortsCardProps) {
  const dot = card.genre ? GENRE_DOT_COLOR[GENRE_COLOR[card.genre]] : undefined;

  return (
    <Link
      href={`/watch/${card.videoId}/`}
      className={cn(
        "group relative block aspect-[9/16] overflow-hidden rounded-[var(--radius-card)] bg-[var(--stage-800)]",
        "transition-transform duration-[var(--dur-micro)] ease-[var(--ease-hover)] hover:-translate-y-1",
        className
      )}
    >
      <img
        src={card.thumbnailUrl}
        alt={card.title || "꿀초아tv 숏츠"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        width={720}
        height={1280}
        className="size-full object-cover transition-transform duration-[var(--dur-micro)] group-hover:scale-[1.04]"
      />
      {/* 가독 그라데이션 */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "var(--thumb-veil)" }}
      />
      {/* 우상단 재생 아이콘(라인 SVG) */}
      <span
        aria-hidden
        className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-[color-mix(in_srgb,var(--stage-950)_55%,transparent)]"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 2.5v7l6-3.5-6-3.5z" stroke="var(--text-primary)" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </span>
      {/* 좌하단 장르 도트 + 제목 오버레이 */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-[var(--space-3)]">
        {dot && (
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full"
            style={{ backgroundColor: dot }}
          />
        )}
        <h3 className="line-clamp-2 text-[length:var(--text-sm)] font-semibold text-[var(--text-primary)]">
          {card.title}
        </h3>
      </div>
    </Link>
  );
}
