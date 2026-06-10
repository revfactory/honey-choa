"use client";

import { useEffect, useState } from "react";

/**
 * prefers-reduced-motion: reduce 를 SSR-safe 하게 구독한다.
 * 서버/초기 렌더는 false 로 시작하되, 마운트 직후 실제 값으로 동기화한다.
 * (정적 export 환경에서 window 가 없는 빌드 단계를 통과시키기 위함)
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Safari < 14 는 addEventListener 미지원 → addListener 폴백
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return reduced;
}
