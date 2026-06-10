"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface TrackContextData {
  trackId: string;
  trackTitle: string;
  /** 이 트랙 내 스텝 videoId 순서(현재 위치 계산용). */
  stepIds: string[];
}

interface WatchTrackContextProps {
  currentVideoId: string;
  /** 이 영상이 속한 트랙들(getTracksContaining 결과를 직렬화). 다중소속이면 첫 트랙 사용. */
  tracks: TrackContextData[];
}

/**
 * 트랙 컨텍스트 배너 — wireframe §9.1 / copy_deck §8.1.
 * ?track= 쿼리가 있을 때만 노출(없으면 null). 쿼리 트랙이 영상 소속 트랙 중 하나여야 함.
 * 현재 STEP n/total + 이전/다음 스텝. 마지막은 "트랙 완주 → 허브로".
 * 쿼리 의존이라 client 컴포넌트(정적 export — 서버는 쿼리 모름).
 */
export function WatchTrackContext({ currentVideoId, tracks }: WatchTrackContextProps) {
  const searchParams = useSearchParams();
  const trackId = searchParams.get("track");
  if (!trackId) return null;

  const track = tracks.find((t) => t.trackId === trackId) ?? null;
  if (!track) return null;

  const idx = track.stepIds.indexOf(currentVideoId);
  if (idx < 0) return null;

  const total = track.stepIds.length;
  const prevId = idx > 0 ? track.stepIds[idx - 1] : null;
  const nextId = idx < total - 1 ? track.stepIds[idx + 1] : null;
  const q = `?track=${track.trackId}`;

  return (
    <div className="mb-[var(--space-4)] flex flex-col gap-[var(--space-3)] rounded-[var(--radius-card)] border border-[var(--honey-glow-strong)] bg-[var(--stage-850)] p-[var(--space-4)] sm:flex-row sm:items-center sm:justify-between">
      <Link
        href={`/learn/${track.trackId}/`}
        className="text-[length:var(--text-base)] font-semibold text-[var(--text-primary)] hover:text-[var(--honey-300)]"
      >
        {track.trackTitle}{" "}
        <span className="tabular text-[length:var(--text-sm)] font-normal text-[var(--text-secondary)]">
          · STEP {idx + 1} / {total}
        </span>
      </Link>
      <div className="flex items-center gap-[var(--space-2)]">
        {prevId ? (
          <Link
            href={`/watch/${prevId}/${q}`}
            className="inline-flex min-h-[40px] items-center rounded-[var(--radius-chip)] border border-[var(--stage-600)] px-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            ← 이전 스텝
          </Link>
        ) : (
          <span className="inline-flex min-h-[40px] items-center rounded-[var(--radius-chip)] border border-[var(--stage-700)] px-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--text-muted)] opacity-50">
            ← 이전 스텝
          </span>
        )}
        {nextId ? (
          <Link
            href={`/watch/${nextId}/${q}`}
            className="inline-flex min-h-[40px] items-center rounded-[var(--radius-chip)] bg-[var(--honey-400)] px-[var(--space-4)] text-[length:var(--text-sm)] font-semibold text-[var(--text-on-honey)]"
          >
            다음 스텝 →
          </Link>
        ) : (
          <Link
            href="/learn/"
            className="inline-flex min-h-[40px] items-center rounded-[var(--radius-chip)] bg-[var(--honey-400)] px-[var(--space-4)] text-[length:var(--text-sm)] font-semibold text-[var(--text-on-honey)]"
          >
            트랙 완주 → 허브로
          </Link>
        )}
      </div>
    </div>
  );
}
