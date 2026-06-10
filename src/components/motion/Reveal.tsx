"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { useReducedMotion } from "./useReducedMotion";

export interface RevealProps {
  children: ReactNode;
  /** 그리드 스태거 인덱스 — delay = min(index, 8) * stagger. */
  index?: number;
  /** 스태거 단위(ms). 기본 60(--motion-stagger). */
  stagger?: number;
  /** 추가 지연(ms). */
  delay?: number;
  /** 진입 변위(px). 기본 24. */
  y?: number;
  /** 렌더 태그. 기본 div. */
  as?: ElementType;
  /** 임계 비율. 기본 0.15. */
  threshold?: number;
  className?: string;
}

const MAX_STAGGER_STEPS = 8; // 8장 이후 지연 고정(마지막 카드 대기 폭주 방지)

/**
 * Reveal — Stage Reveal(아래서 위로 + 페이드) 스크롤 등장 래퍼.
 * IntersectionObserver 로 1회 등장 후 unobserve. transform/opacity 만 사용.
 * reduced-motion: 즉시 표시(애니메이션 없음).
 *
 * 그리드: 각 아이템에 index 를 부여하면 Rhythm Stagger(60ms 시차)가 적용된다.
 *   {cards.map((c, i) => <Reveal key={c.id} index={i}><VideoCard card={c}/></Reveal>)}
 */
export default function Reveal({
  children,
  index = 0,
  stagger = 60,
  delay = 0,
  y = 24,
  as,
  threshold = 0.15,
  className,
}: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    // 이미 뷰포트 안(초기 above-the-fold)이면 IO 콜백 전에라도 곧 등장.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [reduced, threshold]);

  const totalDelay = reduced ? 0 : Math.min(index, MAX_STAGGER_STEPS) * stagger + delay;

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translate3d(0, ${y}px, 0)`,
        transition: reduced
          ? "none"
          : `opacity var(--dur-enter, 0.6s) var(--ease-enter, cubic-bezier(0.16,1,0.3,1)) ${totalDelay}ms, transform var(--dur-enter, 0.6s) var(--ease-enter, cubic-bezier(0.16,1,0.3,1)) ${totalDelay}ms`,
        willChange: shown ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}
