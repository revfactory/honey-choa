import { Section } from "@/components/common";
import { Reveal } from "@/components/motion";
import { TrackCard } from "@/components/sections/TrackCard";
import { getTracks, getTrackView } from "@/lib/content";

/**
 * 학습 허브 — wireframe §5 / copy_deck §4.
 * 3트랙 카드(배너·난이도 범위·스텝 수·설명·CTA). 데스크탑 2열, 모바일 1열.
 * 트랙 3개 보장 → 빈상태 없음. 데이터는 빌드 타임 정적이라 로딩/에러 상태는 발생하지 않음
 * (정적 export — fetch 구간 없음).
 */
export function LearnHub() {
  const tracks = getTracks()
    .map((t) => getTrackView(t.trackId))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <Section>
      <header className="mb-[var(--space-8)] flex flex-col gap-[var(--space-2)]">
        <h1 className="text-[length:var(--text-h1)] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
          학습 트랙
        </h1>
        <p className="max-w-2xl text-[length:var(--text-lg)] text-[var(--text-secondary)]">
          순서대로 따라가면 첫 소셜까지. 처음이어도 1번 스텝부터 같이 시작해요
        </p>
      </header>

      <div className="grid gap-[var(--space-6)] sm:grid-cols-2">
        {tracks.map((track, i) => (
          <Reveal key={track.trackId} index={i}>
            <TrackCard track={track} variant="hub" />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
