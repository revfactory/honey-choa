import Link from "next/link";
import { cn } from "@/lib/cn";
import { GenreBadge } from "@/components/common";
import { getTrackDifficultyRange } from "@/lib/content";
import type { TrackView } from "@/types/content";

/* copy_deck §4 트랙 카드 문구. 트랙별 다듬은 제목·설명을 코드 사전으로 보관(원본 description은 fallback). */
const TRACK_COPY: Record<
  string,
  { hubTitle: string; railTitle: string; description: string; subtitle: string }
> = {
  "bachata-starter": {
    hubTitle: "바차타 입문→마스터 트랙",
    railTitle: "바차타 입문",
    description:
      "기초 풋워크부터 고급 뮤지컬리티까지, 한 스텝씩 쌓아가는 바차타 학습 경로예요.",
    subtitle: "기초 풋워크부터 첫 소셜까지",
  },
  "salsa-starter": {
    hubTitle: "살사 입문 트랙",
    railTitle: "살사 입문",
    description: "살사 기본 무브부터 워크샵 패턴까지, 단계별로 차근차근 익혀요.",
    subtitle: "살사 기본 무브부터 워크샵 패턴까지",
  },
  "bachata-social-ready": {
    hubTitle: "바차타 소셜 실전 준비 트랙",
    railTitle: "소셜 준비",
    description: "기초→패턴→실제 소셜 현장까지, 소셜 데뷔를 위한 동선이에요.",
    subtitle: "기초부터 실제 소셜 현장까지",
  },
};

export function getTrackCopy(track: TrackView) {
  return (
    TRACK_COPY[track.trackId] ?? {
      hubTitle: track.title,
      railTitle: track.title,
      description: track.description,
      subtitle: track.description,
    }
  );
}

interface TrackCardProps {
  track: TrackView;
  /** "rail" = 홈 요약형(작게), "hub" = 학습 허브형(배너+설명+CTA). */
  variant?: "rail" | "hub";
  className?: string;
}

/**
 * 트랙 카드 — wireframe §4.3(홈 rail) / §5.2(학습 허브 hub).
 * 배너 썸네일은 첫 스텝 videoId 의 thumbnailUrl. 난이도 범위는 null 스텝 제외(copy_deck §B.5).
 * 카드 전체 클릭 → /learn/[trackId].
 */
export function TrackCard({ track, variant = "rail", className }: TrackCardProps) {
  const copy = getTrackCopy(track);
  const range = getTrackDifficultyRange(track);
  const banner = track.steps[0]?.card.thumbnailUrl ?? "";
  const meta = `${track.steps.length}스텝${range ? ` · ${range}` : ""}`;

  return (
    <Link
      href={`/learn/${track.trackId}/`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-[var(--stage-800)]",
        "transition-[transform,box-shadow] duration-[var(--dur-micro)] ease-[var(--ease-hover)]",
        "hover:-translate-y-1 hover:shadow-[var(--glow-card-hover)] focus-visible:-translate-y-1",
        className
      )}
    >
      {/* 배너 썸네일 */}
      <div className="relative aspect-video overflow-hidden">
        {banner ? (
          <img
            src={banner}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="size-full object-cover opacity-90 transition-transform duration-[var(--dur-micro)] ease-[var(--ease-hover)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="size-full bg-[var(--stage-750)]" />
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "var(--thumb-veil)" }}
        />
        <div className="absolute left-3 top-3">
          <GenreBadge genre={track.genre} />
        </div>
      </div>

      {/* 본문 */}
      <div className="flex flex-1 flex-col gap-[var(--space-2)] p-[var(--space-4)]">
        <h3 className="text-[length:var(--text-h3)] font-bold text-[var(--text-primary)]">
          {variant === "hub" ? copy.hubTitle : copy.railTitle}
        </h3>
        <p className="tabular text-[length:var(--text-sm)] text-[var(--text-secondary)]">
          {meta}
        </p>
        {variant === "hub" && (
          <>
            <p className="mt-1 line-clamp-3 text-[length:var(--text-sm)] text-[var(--text-muted)]">
              {copy.description}
            </p>
            <span className="mt-auto pt-[var(--space-3)] text-[length:var(--text-sm)] font-semibold text-[var(--honey-300)]">
              트랙 시작 →
            </span>
          </>
        )}
      </div>
    </Link>
  );
}
