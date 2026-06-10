import { cn } from "@/lib/cn";

/** 기본 스켈레톤 블록. reduced-motion에서 펄스 정지(globals 전역 폴백). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-[var(--radius-thumb)] bg-[var(--stage-800)]",
        className
      )}
    />
  );
}

/** 영상 카드 스켈레톤(16:9 + 2줄). */
export function VideoCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

/** 숏츠 카드 스켈레톤(9:16). */
export function ShortsCardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("aspect-[9/16] w-full rounded-[var(--radius-card)]", className)} />;
}

/** 그리드형 스켈레톤 — count개. variant로 카드 종류 선택. */
export function CardGridSkeleton({
  count = 8,
  variant = "video",
}: {
  count?: number;
  variant?: "video" | "shorts";
}) {
  return (
    <div
      className={cn(
        "grid gap-[var(--space-4)]",
        variant === "video"
          ? "grid-cols-[repeat(auto-fill,minmax(240px,1fr))]"
          : "grid-cols-[repeat(auto-fill,minmax(160px,1fr))]"
      )}
    >
      {Array.from({ length: count }).map((_, i) =>
        variant === "video" ? (
          <VideoCardSkeleton key={i} />
        ) : (
          <ShortsCardSkeleton key={i} />
        )
      )}
    </div>
  );
}
