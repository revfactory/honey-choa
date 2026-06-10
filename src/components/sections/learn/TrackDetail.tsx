import Link from "next/link";
import { Section, Button, DifficultyBadge, GenreBadge } from "@/components/common";
import { Reveal } from "@/components/motion";
import { getTrackCopy } from "@/components/sections/TrackCard";
import {
  getTrackDifficultyRange,
  formatDuration,
  GENRE_LABEL,
} from "@/lib/content";
import type { TrackView } from "@/types/content";

/** 예상 분량 표기 — copy_deck §5.4. durationSeconds 합. 1시간 미만이면 "예상 N분". */
function formatEstimate(totalSeconds: number): string {
  const totalMin = Math.round(totalSeconds / 60);
  if (totalMin < 60) return `예상 ${totalMin}분`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `예상 ${h}시간 ${m}분` : `예상 ${h}시간`;
}

/**
 * 트랙 상세 — wireframe §6 / copy_deck §5.
 * 세로 스텝 타임라인(좌) + 트랙 요약 사이드(우, 데스크탑). 모바일은 세로 스택 + 좌측 honey 라인.
 * 스텝 클릭 → /watch/[videoId]?track=[trackId] (트랙 컨텍스트 유지).
 * 스텝 영상 누락은 content.ts 가 사전 필터 → 여기서는 비활성 카드 분기만 방어적으로 유지.
 */
export function TrackDetail({ track }: { track: TrackView }) {
  const copy = getTrackCopy(track);
  const range = getTrackDifficultyRange(track);
  const totalSeconds = track.steps.reduce(
    (sum, s) => sum + s.card.durationSeconds,
    0
  );
  const firstStepId = track.steps[0]?.card.videoId;

  return (
    <Section>
      {/* 뒤로 */}
      <Link
        href="/learn/"
        className="mb-[var(--space-6)] inline-flex items-center gap-1 text-[length:var(--text-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <span aria-hidden>←</span> 학습 허브
      </Link>

      {/* 트랙 헤더 */}
      <header className="mb-[var(--space-8)] flex flex-col gap-[var(--space-3)]">
        <div className="flex flex-wrap items-center gap-[var(--space-3)]">
          <GenreBadge genre={track.genre} />
          <span className="tabular text-[length:var(--text-sm)] text-[var(--text-secondary)]">
            {GENRE_LABEL[track.genre]} · {track.steps.length}스텝
          </span>
          {range && (
            <span className="text-[length:var(--text-sm)] text-[var(--text-muted)]">
              {range}
            </span>
          )}
        </div>
        <h1 className="text-[length:var(--text-h1)] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
          {copy.hubTitle}
        </h1>
        <p className="max-w-2xl text-[length:var(--text-lg)] text-[var(--text-secondary)]">
          {copy.subtitle}
        </p>
        {firstStepId && (
          <div className="mt-[var(--space-2)]">
            <Button href={`/watch/${firstStepId}/?track=${track.trackId}`} variant="primary">
              트랙 처음부터 시작
            </Button>
          </div>
        )}
      </header>

      <div className="grid gap-[var(--space-8)] lg:grid-cols-[1fr_300px]">
        {/* 스텝 타임라인 */}
        <ol className="relative flex flex-col gap-[var(--space-6)]">
          {track.steps.map((step, i) => (
            <StepRow
              key={`${step.card.videoId}-${i}`}
              index={i}
              total={track.steps.length}
              step={step}
              trackId={track.trackId}
            />
          ))}
        </ol>

        {/* 트랙 요약 사이드 */}
        <aside className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius-card)] border border-[var(--stage-700)] bg-[var(--stage-850)] p-[var(--space-6)]">
            <SummaryRow label="총" value={`${track.steps.length}스텝`} />
            <SummaryRow label="예상 분량" value={formatEstimate(totalSeconds).replace("예상 ", "")} />
            {range && <SummaryRow label="난이도" value={range} />}
            {firstStepId && (
              <Button
                href={`/watch/${firstStepId}/?track=${track.trackId}`}
                variant="secondary"
                className="mt-[var(--space-2)] w-full"
              >
                트랙 처음부터 시작
              </Button>
            )}
          </div>
        </aside>
      </div>
    </Section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[length:var(--text-sm)] text-[var(--text-muted)]">{label}</span>
      <span className="tabular text-[length:var(--text-base)] font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

function StepRow({
  index,
  total,
  step,
  trackId,
}: {
  index: number;
  total: number;
  step: TrackView["steps"][number];
  trackId: string;
}) {
  const { card, note } = step;
  const stepNo = String(index + 1).padStart(2, "0");
  const isLast = index === total - 1;

  return (
    <Reveal as="li" index={index} className="relative flex gap-[var(--space-4)] pl-[var(--space-8)]">
      {/* 타임라인 라인 + 노드 */}
      <span aria-hidden className="absolute left-[11px] top-0 flex h-full flex-col items-center">
        <span className="size-3 rounded-full bg-[var(--honey-400)] shadow-[var(--glow-honey)]" />
        {!isLast && <span className="w-px flex-1 bg-[var(--stage-700)]" />}
      </span>

      {/* 스텝 콘텐츠 */}
      <div className="flex flex-1 flex-col gap-[var(--space-2)]">
        <div className="flex items-center gap-[var(--space-3)]">
          <span className="tabular text-[length:var(--text-sm)] font-bold tracking-wide text-[var(--honey-300)]">
            STEP {stepNo}
          </span>
          {card.difficulty && <DifficultyBadge difficulty={card.difficulty} />}
        </div>

        <Link
          href={`/watch/${card.videoId}/?track=${trackId}`}
          className="group flex gap-[var(--space-3)] rounded-[var(--radius-card)] bg-[var(--stage-800)] p-[var(--space-3)] transition-[transform,box-shadow] duration-[var(--dur-micro)] ease-[var(--ease-hover)] hover:-translate-y-1 hover:shadow-[var(--glow-card-hover)] focus-visible:-translate-y-1"
        >
          <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-[var(--radius-thumb)]">
            <img
              src={card.thumbnailUrl}
              alt={card.title || "꿀초아tv 영상"}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-[var(--dur-micro)] group-hover:scale-[1.04]"
            />
            <span className="tabular absolute bottom-1 right-1 rounded-[var(--radius-badge)] bg-[color-mix(in_srgb,var(--stage-950)_70%,transparent)] px-1.5 py-0.5 text-[length:var(--text-xs)] text-[var(--text-primary)]">
              {formatDuration(card.durationSeconds)}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="line-clamp-2 text-[length:var(--text-base)] font-bold text-[var(--text-primary)]">
              {card.title}
            </h3>
          </div>
        </Link>

        {note && (
          <p className="text-[length:var(--text-sm)] text-[var(--text-muted)]">{note}</p>
        )}
      </div>
    </Reveal>
  );
}
