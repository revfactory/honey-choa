"use client";

import { cn } from "@/lib/cn";

interface FilterChipProps {
  label: string;
  /** 카운트 표기(copy_deck §172: "워크샵 28"). 미지정 시 숨김. */
  count?: number;
  active?: boolean;
  /** 장르칩 좌측 색 도트 색(CSS 변수 문자열). 미지정 시 도트 없음. */
  dotColor?: string;
  onClick?: () => void;
  /** 다중 선택 활성 시 ✕(초기화) 표시 여부. */
  removable?: boolean;
  className?: string;
}

/**
 * 필터칩 — design_system §5.3.
 * 기본: 투명 배경 + stage-600 보더 + text-secondary.
 * 활성: honey-400 배경 + text-on-honey + 보더 없음.
 * 높이 36px, 좌우 패딩 space-4.
 */
export function FilterChip({
  label,
  count,
  active = false,
  dotColor,
  onClick,
  removable = false,
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        // MINOR(2): 시각 칩 높이는 36px(design §5.3) 유지하되, 터치 타깃은 ≥44px 확보.
        //   ::before 로 클릭 영역만 세로로 확장(배경 pill 은 36px 그대로).
        "relative inline-flex items-center gap-2 h-9 px-[var(--space-4)] rounded-[var(--radius-chip)]",
        "before:absolute before:inset-x-0 before:top-1/2 before:h-[44px] before:-translate-y-1/2 before:content-['']",
        "text-[var(--text-sm)] leading-none transition-colors duration-[var(--dur-micro)]",
        active
          ? "bg-[var(--honey-400)] text-[var(--text-on-honey)] font-semibold"
          : "bg-transparent border border-[var(--stage-600)] text-[var(--text-secondary)] hover:border-[var(--honey-glow-strong)]",
        className
      )}
    >
      {dotColor && (
        <span
          aria-hidden
          className="inline-block size-1.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      <span>{label}</span>
      {typeof count === "number" && (
        <span className="tabular opacity-70">{count}</span>
      )}
      {active && removable && (
        <span aria-hidden className="ml-0.5 text-[length:var(--text-xs)]">
          ✕
        </span>
      )}
    </button>
  );
}
