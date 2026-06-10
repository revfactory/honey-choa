"use client";

/**
 * WatchPlayerClient — `/watch/[videoId]` 플레이어 영역 클라 래퍼 (player-integrator)
 * ----------------------------------------------------------------------------
 * 정적 export 라 ?t=(타임코드 시작)·?track=(트랙 컨텍스트)는 클라에서 해석.
 * 책임: 16:9 플레이어 마운트 + 타임코드 seek 핸들 노출.
 *
 * 연결 지점(ui-craftsman, components/sections/watch/):
 *   - 이 컴포넌트는 플레이어 박스만 그린다. 제목·뱃지·설명·관련영상·트랙배너 UI 는
 *     watch page 레이아웃에서 sections/watch 컴포넌트로 조립한다.
 *   - 설명 타임코드 클릭 → seek 연동이 필요하면 onSeekReady 로 받은 seek 함수를
 *     타임코드 리스트에 전달한다(아래 page.tsx 의 children 합성 참고).
 */

import { useCallback, useRef } from "react";
import type { ContentCard } from "@/types/content";
import { WatchPlayer, type WatchPlayerHandle } from "./WatchPlayer";

export function WatchPlayerClient({
  card,
  startSeconds = 0,
  children,
}: {
  card: ContentCard;
  startSeconds?: number;
  /** ui-craftsman 메타 영역. seek 함수를 render prop 으로 받는다. */
  children?: (seekTo: (seconds: number) => void) => React.ReactNode;
}) {
  const ref = useRef<WatchPlayerHandle>(null);
  const seekTo = useCallback((seconds: number) => {
    ref.current?.seekTo(seconds);
  }, []);

  return (
    <>
      <WatchPlayer ref={ref} card={card} startSeconds={startSeconds} />
      {children?.(seekTo)}
    </>
  );
}
