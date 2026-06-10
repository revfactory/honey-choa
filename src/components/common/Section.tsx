import { cn } from "@/lib/cn";

/**
 * 페이지 섹션 래퍼 — 최대폭(content-max) + gutter + 섹션 수직 패딩.
 * ui-craftsman 의 sections 컴포넌트가 본문을 감싸는 공통 컨테이너.
 */
export function Section({
  children,
  className,
  as: Tag = "section",
  bleed = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  /** true면 max-width 제한 없이 가로 풀블리드(숏츠 피드 등). */
  bleed?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "py-[var(--section-py-mobile)] md:py-[var(--section-py-desktop)]",
        className
      )}
    >
      <div
        className={cn(
          "px-[var(--gutter)]",
          !bleed && "mx-auto w-full max-w-[var(--content-max)]"
        )}
      >
        {children}
      </div>
    </Tag>
  );
}

/** 섹션 헤더(타이틀 + 서브카피 + 우측 액션). */
export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-[var(--space-6)] flex items-end justify-between gap-4",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[length:var(--text-h2)] font-bold text-[var(--text-primary)]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[length:var(--text-base)] text-[var(--text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
