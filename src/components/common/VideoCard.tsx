import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatCountKo } from "@/lib/labels";
import { DifficultyBadge, TypeBadge } from "@/components/common/Badge";
import type { ContentCard } from "@/types/content";

interface VideoCardProps {
  card: ContentCard;
  /** 트랙 컨텍스트 유지용 쿼리(예: "bachata-starter"). 지정 시 /watch?track= 부착. */
  trackId?: string;
  className?: string;
  /** 첫 화면 LCP 후보면 false. 기본 lazy. */
  priority?: boolean;
}

/**
 * 영상 카드 (16:9) — design_system §5.1.
 * 표면 stage-800, radius card(16). 썸네일 radius thumb(12), 16:9 고정.
 * 좌상단 뱃지 1개(난이도 우선, 없으면 type), 우하단 재생시간 칩.
 * 호버 부상·글로우·썸네일 1.04 스케일은 CSS group-hover(GPU transform만).
 */
export function VideoCard({ card, trackId, className, priority }: VideoCardProps) {
  const href = trackId
    ? `/watch/${card.videoId}/?track=${trackId}`
    : `/watch/${card.videoId}/`;

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col rounded-[var(--radius-card)] bg-[var(--stage-800)]",
        "transition-[transform,box-shadow] duration-[var(--dur-micro)] ease-[var(--ease-hover)]",
        "hover:-translate-y-1 hover:shadow-[var(--glow-card-hover)] focus-visible:-translate-y-1",
        className
      )}
    >
      {/* 썸네일 */}
      <div className="relative aspect-video overflow-hidden rounded-[var(--radius-thumb)]">
        <img
          src={card.thumbnailUrl}
          alt={card.title || "꿀초아tv 영상"}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          width={1280}
          height={720}
          className="size-full object-cover transition-transform duration-[var(--dur-micro)] ease-[var(--ease-hover)] group-hover:scale-[1.04]"
        />
        {/* 좌상단 뱃지 슬롯 — 1개만 */}
        <div className="absolute left-2 top-2">
          {card.difficulty ? (
            <DifficultyBadge difficulty={card.difficulty} />
          ) : card.type !== "uncurated" ? (
            <TypeBadge type={card.type} />
          ) : null}
        </div>
        {/* 우하단 재생시간 칩 */}
        <span className="tabular absolute bottom-2 right-2 rounded-[var(--radius-badge)] bg-[color-mix(in_srgb,var(--stage-950)_70%,transparent)] px-1.5 py-0.5 text-[length:var(--text-xs)] text-[var(--text-primary)]">
          {card.formattedDuration}
        </span>
      </div>

      {/* 본문 */}
      <div className="flex flex-col gap-1 p-[var(--space-3)]">
        <h3 className="line-clamp-2 text-[length:var(--text-base)] font-bold text-[var(--text-primary)]">
          {card.title}
        </h3>
        <p className="tabular text-[length:var(--text-sm)] text-[var(--text-muted)]">
          조회 {formatCountKo(card.statistics.viewCount)} · {card.publishedYear}
        </p>
      </div>
    </Link>
  );
}
