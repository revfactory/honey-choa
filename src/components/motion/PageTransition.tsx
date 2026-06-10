"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "./useReducedMotion";

export interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition — 라우트 전환 시 콘텐츠 페이드+슬라이드 인(--dur-page).
 * pathname 변경을 감지해 키를 바꾸고 등장 트랜지션을 재생한다.
 * reduced-motion: 트랜지션 없이 즉시 표시.
 *
 * 사용(선택): layout 의 본문 슬롯을 감싼다. frontend-lead 와 주입 지점 협의.
 *   <PageTransition>{children}</PageTransition>
 */
export default function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    setShown(false);
    // 다음 프레임에 in 상태로 → 트랜지션 발동
    const id = requestAnimationFrame(() => setShown(true));
    first.current = false;
    return () => cancelAnimationFrame(id);
  }, [pathname, reduced]);

  return (
    <div
      className={className}
      style={{
        opacity: shown || reduced ? 1 : 0,
        transform: shown || reduced ? "none" : "translate3d(0, 8px, 0)",
        transition: reduced
          ? "none"
          : "opacity var(--dur-page, 0.4s) var(--ease-enter, cubic-bezier(0.16,1,0.3,1)), transform var(--dur-page, 0.4s) var(--ease-enter, cubic-bezier(0.16,1,0.3,1))",
      }}
    >
      {children}
    </div>
  );
}
