"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "./useReducedMotion";

export interface BeatPulseProps {
  children: ReactNode;
  /** 펄스 스케일. 기본 1.03(--motion-scale-beat). */
  scale?: number;
  /** 마운트 시 한 번 어텐션 펄스. 기본 false(시선 점유 방지 — 페이지당 1요소만 권장). */
  attention?: boolean;
  className?: string;
}

/**
 * BeatPulse — 리듬감 있는 스케일 1.0→1.03 박동. CTA·재생 버튼 래퍼.
 * 호버/포커스 시 --ease-beat(살짝 바운스) 0.6s 1회성. 무한 펄스 금지 — 호버 트리거.
 * reduced-motion: 정적(transform 없음).
 *
 * 사용: <BeatPulse><Button variant="primary">지금 배우기</Button></BeatPulse>
 */
export default function BeatPulse({ children, scale = 1.03, attention = false, className }: BeatPulseProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  const play = () => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    el.style.transform = `scale(${scale})`;
  };
  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "scale(1)";
  };

  // 어텐션: 마운트 직후 1회 박동(무한 반복 아님).
  useEffect(() => {
    if (!attention || reduced) return;
    const el = ref.current;
    if (!el) return;
    const tIn = window.setTimeout(() => { el.style.transform = `scale(${scale})`; }, 400);
    const tOut = window.setTimeout(() => { el.style.transform = "scale(1)"; }, 400 + 320);
    return () => { window.clearTimeout(tIn); window.clearTimeout(tOut); };
  }, [attention, reduced, scale]);

  return (
    <span
      ref={ref}
      className={className}
      onPointerEnter={play}
      data-beat={attention ? "attention" : undefined}
      onPointerLeave={reset}
      onFocusCapture={play}
      onBlurCapture={reset}
      style={{
        display: "inline-flex",
        transformOrigin: "center",
        transition: reduced ? "none" : "transform var(--dur-enter, 0.6s) var(--ease-beat, cubic-bezier(0.34,1.56,0.64,1))",
      }}
    >
      {children}
    </span>
  );
}
