"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";

export interface HoneyFlowBackgroundProps {
  /** 0~1, 기본 0.6 — 블롭 크기·글로우 강도. 디자이너 튜닝 노출. */
  intensity?: number;
  /** 0~1, 기본 0.3 — 앰비언트 주기 속도(꿀의 점성: 낮을수록 느림). */
  speed?: number;
  /** 외부 제어로 일시정지. */
  paused?: boolean;
  /** heat(coral) 열기 블롭 1개 추가 — 라틴 열기. 기본 true. */
  heat?: boolean;
  className?: string;
}

interface Blob {
  cx: number; // 0~1 중심 비율
  cy: number;
  rx: number; // 0~1 궤도 반경 비율
  ry: number;
  radius: number; // 0~1 블롭 반경 비율(짧은 변 기준)
  phase: number;
  freq: number; // 궤도 주기 계수
  color: string; // rgba (alpha 포함)
}

/**
 * Honey Flow — 점성 있는 느린 유체 배경(꿀 + 라틴 열기).
 * 소수의 대형 블롭을 저속 사인 궤도로 이동 + 강한 블러 + 'lighter' 합성.
 * 성능 헌장: 단일 rAF, 오프스크린 정지, DPR 캡 2.0, transform/opacity 외 미사용.
 * reduced-motion: 캔버스 미렌더 + 정적 그라데이션 폴백.
 */
export default function HoneyFlowBackground({
  intensity = 0.6,
  speed = 0.3,
  paused = false,
  heat = true,
  className,
}: HoneyFlowBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  // props 를 ref 로 흘려 rAF 루프 재생성을 막는다(애니메이션 끊김 방지).
  const cfg = useRef({ intensity, speed, paused, heat });
  cfg.current = { intensity, speed, paused, heat };

  useEffect(() => {
    if (reduced) return; // 정적 폴백(아래 div)이 대신 표시됨
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // DPR 캡 2.0
    let w = 0;
    let h = 0;
    let onScreen = true;
    let rafId = 0;
    let last = performance.now();
    let t = 0; // 누적 위상(시간 * 속도)

    // 꿀빛 블롭 + 열기 블롭. 입자 수백이 아닌 덩어리 소수.
    const blobs: Blob[] = [
      { cx: 0.28, cy: 0.32, rx: 0.1, ry: 0.08, radius: 0.42, phase: 0.0, freq: 0.6, color: "rgba(255,185,56,A)" },
      { cx: 0.7, cy: 0.4, rx: 0.12, ry: 0.1, radius: 0.5, phase: 1.7, freq: 0.45, color: "rgba(245,158,11,A)" },
      { cx: 0.5, cy: 0.72, rx: 0.14, ry: 0.09, radius: 0.46, phase: 3.1, freq: 0.52, color: "rgba(255,212,121,A)" },
      { cx: 0.85, cy: 0.78, rx: 0.09, ry: 0.07, radius: 0.34, phase: 4.4, freq: 0.7, color: "rgba(255,185,56,A)" },
    ];
    const heatBlob: Blob = {
      cx: 0.62, cy: 0.6, rx: 0.11, ry: 0.13, radius: 0.36, phase: 2.2, freq: 0.4,
      color: "rgba(255,107,94,A)",
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawBlob = (b: Blob, baseAlpha: number, time: number, blur: number) => {
      const min = Math.min(w, h);
      const x = (b.cx + Math.sin(time * b.freq + b.phase) * b.rx) * w;
      const y = (b.cy + Math.cos(time * b.freq * 0.8 + b.phase) * b.ry) * h;
      const r = b.radius * min * (0.85 + 0.55 * cfg.current.intensity);
      const alpha = baseAlpha * (0.5 + 0.7 * cfg.current.intensity);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, b.color.replace("A", alpha.toFixed(3)));
      grad.addColorStop(0.55, b.color.replace("A", (alpha * 0.35).toFixed(3)));
      grad.addColorStop(1, b.color.replace("A", "0"));
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      void blur;
      ctx.fill();
    };

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);
      if (!onScreen || cfg.current.paused) {
        last = now;
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05); // 탭 복귀 점프 클램프
      last = now;
      // 꿀의 점성: 한 사이클 ~12~20s. speed 0.3 ≈ 느림.
      t += dt * (0.05 + cfg.current.speed * 0.18);

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      // 캔버스 자체 블러는 비쌈 → CSS filter(blur) 로 처리. 여기선 radial gradient 자체가 soft.
      for (const b of blobs) drawBlob(b, 0.16, t, 0);
      if (cfg.current.heat) drawBlob(heatBlob, 0.1, t, 0); // 열기 5~10%
      ctx.globalCompositeOperation = "source-over";
    };

    resize();
    window.addEventListener("resize", resize);

    // 오프스크린 시 루프 비용 절감(클리어/그리기 생략). rAF 자체는 유지해 복귀 즉시 재개.
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      io.disconnect();
    };
  }, [reduced]);

  // reduced-motion: 정적 꿀빛 그라데이션 폴백.
  if (reduced) {
    return (
      <div
        aria-hidden
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(60% 55% at 32% 35%, var(--honey-glow), transparent 70%)," +
            "radial-gradient(55% 50% at 72% 64%, var(--heat-glow), transparent 72%)",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        // 강한 블러로 '덩어리' 질감 — 블롭 수보다 싸다. 모바일은 약하게.
        filter: "blur(56px) saturate(115%)",
        opacity: 0.9,
      }}
    />
  );
}
