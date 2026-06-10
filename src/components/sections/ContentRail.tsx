"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * 가로 스크롤 콘텐츠 레일 — wireframe §3.4.
 * 데스크탑: 좌우 ◀▶ 컨트롤 + scroll-snap. 모바일: 손가락 스와이프(컨트롤 숨김).
 * 자식 카드는 호출부가 children 으로 주입(VideoCard / ShortsCard / 트랙 카드 등).
 * scroll-snap 은 CSS. 컨트롤(스크롤 버튼)만 client 상호작용.
 */
export function ContentRail({
  children,
  /** 각 아이템 래퍼 폭/스타일(tailwind 클래스). 예: "w-[280px]". */
  itemClassName,
  className,
  ariaLabel,
}: {
  children: React.ReactNode;
  itemClassName?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  };

  const items = Array.isArray(children) ? children : [children];

  return (
    <div className={cn("relative", className)}>
      <RailButton dir={-1} onClick={() => scrollBy(-1)} />
      <RailButton dir={1} onClick={() => scrollBy(1)} />

      <ul
        ref={trackRef}
        aria-label={ariaLabel}
        className="flex snap-x snap-mandatory gap-[var(--space-4)] overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <li key={i} className={cn("shrink-0 snap-start", itemClassName)}>
            {child}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RailButton({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === 1 ? "다음" : "이전"}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-[var(--z-card-hover)] hidden -translate-y-1/2 md:grid",
        dir === 1 ? "-right-3" : "-left-3",
        "size-9 place-items-center rounded-full border border-[var(--stage-600)] bg-[var(--stage-850)] text-[var(--text-secondary)]",
        "transition-colors hover:border-[var(--honey-glow-strong)] hover:text-[var(--text-primary)]"
      )}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d={dir === 1 ? "M5 2.5L9.5 7L5 11.5" : "M9 2.5L4.5 7L9 11.5"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
