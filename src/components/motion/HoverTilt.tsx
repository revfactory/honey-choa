"use client";

import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "./useReducedMotion";

export interface HoverTiltProps {
  children: ReactNode;
  /** 최대 기울임 각도(deg). 기본 6(디자인 시스템 ±6 이내). */
  max?: number;
  /** 커서 위치에 꿀빛 글로우(Honey Flow) 표시. 기본 true. */
  glow?: boolean;
  className?: string;
}

/**
 * HoverTilt — 카드 3D 틸트 + 커서 추종 꿀빛 글로우(Honey Flow 마이크로).
 * perspective + rotateX/Y(±6deg 이내), pointermove → rAF 스로틀.
 * transform 만 사용. reduced-motion/터치: 틸트 비활성(자식 그대로).
 *
 * 사용: <HoverTilt><VideoCard card={c} /></HoverTilt>
 * 부모가 자체 호버 트랜지션(translateY/글로우)을 갖더라도 transform 합성으로 공존.
 */
export default function HoverTilt({ children, max = 6, glow = true, className }: HoverTiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const raf = useRef(0);
  const target = useRef({ rx: 0, ry: 0, mx: 50, my: 50 });

  const fine =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(pointer: fine)").matches;

  const apply = () => {
    raf.current = 0;
    const el = ref.current;
    if (!el) return;
    const { rx, ry, mx, my } = target.current;
    el.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    if (glow) {
      el.style.setProperty("--mx", `${mx}%`);
      el.style.setProperty("--my", `${my}%`);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (reduced || !fine) return;
    const el = ref.current;
    if (!el) return;
    if (glowRef.current) glowRef.current.style.opacity = "1";
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0~1
    const py = (e.clientY - r.top) / r.height;
    target.current = {
      ry: (px - 0.5) * 2 * max, // 좌우 → Y축 회전
      rx: -(py - 0.5) * 2 * max, // 상하 → X축 회전(반전)
      mx: px * 100,
      my: py * 100,
    };
    if (!raf.current) raf.current = requestAnimationFrame(apply);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
    if (glowRef.current) glowRef.current.style.opacity = "0";
  };

  return (
    <div
      ref={ref}
      className={className}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{
        position: "relative",
        transformStyle: "preserve-3d",
        transition: reduced ? "none" : "transform var(--dur-micro, 0.2s) var(--ease-hover, ease-out)",
        willChange: "transform",
        // 커서 추종 글로우 오버레이(자식 위, 포인터 통과)
        ...(glow && !reduced && fine
          ? ({
              ["--mx" as string]: "50%",
              ["--my" as string]: "50%",
            } as React.CSSProperties)
          : {}),
      }}
    >
      {children}
      {glow && !reduced && fine && (
        <span
          ref={glowRef}
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
            background:
              "radial-gradient(220px circle at var(--mx,50%) var(--my,50%), var(--honey-glow), transparent 70%)",
            opacity: 0,
            transition: "opacity var(--dur-micro,0.2s) var(--ease-hover,ease-out)",
          }}
        />
      )}
    </div>
  );
}
