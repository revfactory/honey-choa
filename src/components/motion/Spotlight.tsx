"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";

export interface SpotlightProps {
  /** 글로우 반경(px). 기본 560. */
  radius?: number;
  /** lerp 추적 계수(0~1, 낮을수록 점성 있게 지연). 기본 0.08. */
  lerp?: number;
  /** 0~1 글로우 강도. 기본 0.6. */
  intensity?: number;
  className?: string;
}

/**
 * Spotlight — 커서를 점성 있게 따라오는 꿀빛 radial 글로우.
 * JS 는 좌표만 갱신(rAF + lerp), 페인트는 CSS radial-gradient 가 담당.
 * 터치/리듀스드: 커서가 없으므로 중앙 상단 고정 글로우로 대체.
 * 부모는 position: relative 여야 한다(이 컴포넌트는 absolute inset:0).
 */
export default function Spotlight({
  radius = 560,
  lerp = 0.08,
  intensity = 0.6,
  className,
}: SpotlightProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    // 포인터 정밀도 없는(터치) 기기는 고정 글로우.
    const fine =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(pointer: fine)").matches;

    if (reduced || !fine) {
      el.style.setProperty("--mx", "50%");
      el.style.setProperty("--my", "28%");
      return;
    }

    const rect0 = el.getBoundingClientRect();
    let tx = rect0.width / 2;
    let ty = rect0.height * 0.3;
    let x = tx;
    let y = ty;
    let rafId = 0;
    let active = false;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      active = true;
    };
    const onLeave = () => {
      active = false;
      const r = el.getBoundingClientRect();
      tx = r.width / 2;
      ty = r.height * 0.3;
    };

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      x += (tx - x) * lerp; // 꿀의 점성
      y += (ty - y) * lerp;
      el.style.setProperty("--mx", `${x.toFixed(1)}px`);
      el.style.setProperty("--my", `${y.toFixed(1)}px`);
      void active;
    };

    const parent = el.parentElement ?? el;
    parent.addEventListener("pointermove", onMove);
    parent.addEventListener("pointerleave", onLeave);
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, lerp]);

  const alpha = (0.5 + intensity * 0.6).toFixed(2);

  return (
    <div
      ref={elRef}
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        // --mx/--my 는 px(추적) 또는 %(폴백) — radial-gradient at 가 둘 다 허용.
        background: `radial-gradient(${radius}px circle at var(--mx, 50%) var(--my, 28%), rgba(255,185,56,${alpha}) 0%, var(--honey-glow) 35%, transparent 70%)`,
        // mix-blend 로 무대 위에 빛이 얹히는 느낌. 합성 전용.
        mixBlendMode: "screen",
        transition: "opacity var(--dur-enter) var(--ease-enter)",
      }}
    />
  );
}
