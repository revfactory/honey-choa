import { cn } from "@/lib/cn";
import {
  DIFFICULTY_LABEL,
  GENRE_LABEL,
  TYPE_LABEL,
  GENRE_COLOR,
} from "@/lib/labels";
import type { ContentType, Difficulty, Genre } from "@/types/content";

/* design_system §5.5 — 색은 토큰 변수. 임의 hex 금지. 색+텍스트 병기(색맹 대응). */

const COLOR_VAR: Record<string, string> = {
  honey: "var(--honey-400)",
  heat: "var(--heat-400)",
  sky: "var(--sky-400)",
  rose: "var(--rose-400)",
  mint: "var(--mint-400)",
  muted: "var(--text-muted)",
};

const BADGE_BASE =
  "inline-flex items-center gap-1.5 rounded-[var(--radius-badge)] " +
  "text-[var(--text-xs)] font-semibold leading-none px-2 py-1 whitespace-nowrap";

/** 난이도 뱃지 — 해당색 16% 틴트 배경 + 같은색 텍스트. */
export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  const color =
    difficulty === "beginner"
      ? COLOR_VAR.mint
      : difficulty === "intermediate"
        ? COLOR_VAR.honey
        : COLOR_VAR.heat;
  return (
    <span
      className={cn(BADGE_BASE, className)}
      style={{
        color,
        backgroundColor: "color-mix(in srgb, currentColor 16%, transparent)",
      }}
    >
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

/** 장르 뱃지 — 색 도트 + 라벨. 라인 스타일(채움 없음). */
export function GenreBadge({
  genre,
  className,
}: {
  genre: Genre;
  className?: string;
}) {
  const color = COLOR_VAR[GENRE_COLOR[genre]];
  return (
    <span
      className={cn(
        BADGE_BASE,
        "border border-[var(--stage-600)] text-[var(--text-secondary)]",
        className
      )}
    >
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {GENRE_LABEL[genre]}
    </span>
  );
}

/** type 뱃지 — 중립 무채색. battle만 heat 보더 허용(design_system §5.5). */
export function TypeBadge({
  type,
  className,
}: {
  type: ContentType;
  className?: string;
}) {
  if (type === "unclassified") return null; // 미분류는 뱃지 노출 안 함(copy_deck §A.2)
  const isBattle = type === "battle";
  return (
    <span
      className={cn(
        BADGE_BASE,
        "bg-[var(--stage-700)] text-[var(--text-secondary)]",
        isBattle && "border border-[var(--heat-400)]",
        className
      )}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}
