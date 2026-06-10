import { cn } from "@/lib/cn";
import { Button } from "@/components/common/Button";

/* 빈/에러 상태 — copy_deck §7. 톤: 해요체 + 다음 행동 제시(A.3). */

interface EmptyStateProps {
  /** 기본: "찾는 무대가 비어 있어요" */
  title?: string;
  /** 안내 본문. */
  description?: string;
  /** 복구 동선 버튼(예: 초기화). */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** 빈 상태(필터 0건 등). */
export function EmptyState({
  title = "찾는 무대가 비어 있어요",
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-[var(--space-3)] py-[var(--space-16)] text-center",
        className
      )}
    >
      <p className="text-[length:var(--text-h3)] font-bold text-[var(--text-primary)]">
        {title}
      </p>
      {description && (
        <p className="max-w-md text-[length:var(--text-base)] text-[var(--text-secondary)]">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  /** 기본: "콘텐츠를 불러오지 못했어요" */
  message?: string;
  /** 재시도 콜백. 지정 시 [다시 시도] 버튼 노출. */
  onRetry?: () => void;
  className?: string;
}

/** 에러 상태 — 항상 [다시 시도] 동반(copy_deck §7 규칙). */
export function ErrorState({
  message = "콘텐츠를 불러오지 못했어요",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-[var(--space-3)] py-[var(--space-16)] text-center",
        className
      )}
    >
      <p className="text-[length:var(--text-base)] text-[var(--text-secondary)]">
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}
