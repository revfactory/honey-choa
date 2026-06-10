"use client";

import { useEffect, useState } from "react";
import HoneyFlowBackground from "./HoneyFlowBackground";
import Spotlight from "./Spotlight";

export interface HeroBackgroundProps {
  /** 0~1, 블롭/글로우 강도. 기본 0.6. */
  intensity?: number;
  /** 0~1, 앰비언트 속도(점성). 기본 0.3. */
  speed?: number;
  /** 커서 추적 스포트라이트 활성. 기본 true. */
  spotlight?: boolean;
  className?: string;
}

/**
 * HeroBackground — 홈 히어로 "Stage Light, Latin Heat" 합성 배경.
 * Honey Flow(점성 유체) + Spotlight(커서 글로우) + 상/하단 무대 스크림.
 * ui-craftsman 사용법: 히어로 섹션을 position: relative 로 두고 첫 자식으로 삽입,
 * 콘텐츠는 position: relative + z-index 로 위에 올린다.
 *
 *   <section className="relative overflow-hidden">
 *     <HeroBackground />
 *     <div className="relative z-10"> ...hero copy... </div>
 *   </section>
 *
 * 품질 사다리: 모바일/저사양은 정적 그라데이션만(앰비언트 캔버스 생략)으로 강등.
 */
export default function HeroBackground({
  intensity = 0.6,
  speed = 0.3,
  spotlight = true,
  className,
}: HeroBackgroundProps) {
  // 모바일·저사양 감지 → 캔버스 앰비언트 생략(정적 그라데이션만).
  const [lite, setLite] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const small = window.matchMedia("(max-width: 640px)").matches;
    const lowCores =
      typeof navigator !== "undefined" &&
      typeof navigator.hardwareConcurrency === "number" &&
      navigator.hardwareConcurrency <= 4;
    setLite(small || lowCores);
  }, []);

  return (
    <div
      aria-hidden
      className={className}
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}
    >
      {/* 무대 베이스: 위는 어둡게(네비 가독), 아래로 자연 페이드 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, var(--stage-950) 0%, transparent 22%, transparent 70%, var(--stage-950) 100%)",
          zIndex: 2,
        }}
      />
      {lite ? (
        // 품질 사다리 하단: 정적 꿀빛 그라데이션(파티클·캔버스 0)
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(60% 55% at 32% 32%, var(--honey-glow), transparent 70%)," +
              "radial-gradient(55% 50% at 72% 66%, var(--heat-glow), transparent 72%)",
            opacity: 0.5 + intensity * 0.5,
          }}
        />
      ) : (
        <HoneyFlowBackground intensity={intensity} speed={speed} heat />
      )}
      {spotlight && !lite && <Spotlight intensity={intensity} />}
    </div>
  );
}
