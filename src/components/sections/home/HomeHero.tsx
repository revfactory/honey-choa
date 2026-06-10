import { Button } from "@/components/common";
import { HeroBackground, BeatPulse } from "@/components/motion";
import { getChannel, formatCountKo, formatInt } from "@/lib/content";

const CURATED_TOTAL = 1604; // copy_deck §1.4 — 사이트 전반 영상 수 통일.

/**
 * 홈 히어로 — wireframe §4.1 / copy_deck §3.1.
 * 배경 모션은 motion-engineer 의 <HeroBackground/>(Honey Flow + Spotlight, 품질 사다리·reduced-motion 내장)를
 * relative 섹션의 첫 자식으로 배선. 본문은 z-10 으로 위에 올린다. 본문(헤드·서브·CTA·통계)은 ui-craftsman.
 * primary CTA 는 <BeatPulse> 래퍼로 박자감 부여(호버/포커스 트리거).
 */
export function HomeHero() {
  const { statistics } = getChannel();

  return (
    <section className="relative overflow-hidden border-b border-[var(--stage-700)]">
      {/* 배경 모션 — motion-engineer 컴포넌트(import만, 수정 없음). absolute inset-0 내장. */}
      <HeroBackground intensity={0.6} speed={0.3} spotlight />

      <div className="relative z-10 mx-auto flex max-w-[var(--content-max)] flex-col items-center gap-[var(--space-6)] px-[var(--gutter)] py-[var(--space-24)] text-center">
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-hero)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[var(--text-primary)]">
          꿀초아tv · 라틴댄스를
          <br />
          순서대로 배우다
        </h1>
        <p className="max-w-xl text-[length:var(--text-lg)] text-[var(--text-secondary)]">
          바차타·살사 1,604개 영상을 단계별 학습 동선으로
        </p>

        <div className="flex w-full flex-col items-center gap-[var(--space-3)] sm:w-auto sm:flex-row">
          {/* primary CTA — BeatPulse 래퍼(호버/포커스 박동). 래퍼도 모바일 풀폭 유지. */}
          <BeatPulse className="w-full sm:w-auto">
            <Button href="/learn/" variant="primary" className="w-full">
              학습 시작하기
            </Button>
          </BeatPulse>
          <Button href="/shorts/" variant="secondary" className="w-full sm:w-auto">
            숏츠 둘러보기
          </Button>
        </div>

        <p className="tabular text-[length:var(--text-sm)] text-[var(--text-muted)]">
          구독 {formatCountKo(statistics.subscriberCount)} · 영상 {formatInt(CURATED_TOTAL)} · 조회{" "}
          {formatCountKo(statistics.viewCount)}
        </p>
      </div>
    </section>
  );
}
