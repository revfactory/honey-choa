"use client";

/**
 * WatchPlayer — `/watch/[videoId]` 16:9 롱폼 플레이어 (player-integrator 소유)
 * ----------------------------------------------------------------------------
 * spec §9. 책임:
 *   - lite embed(썸네일→클릭 iframe), embeddable=false 새 탭 폴백
 *   - 타임코드 seek: IFrame API postMessage 로 구간 점프(설명 타임코드 클릭 → seek)
 *
 * 연결 지점(ui-craftsman, components/sections/watch/):
 *   - 메타·뱃지·설명·관련영상·트랙배너 UI 는 이 컴포넌트 바깥(페이지 레이아웃)에서 조립
 *   - 타임코드 seek 은 imperative handle 로 노출 → 부모가 ref.current.seekTo(sec) 호출
 *
 * 사용 예(watch page):
 *   const playerRef = useRef<WatchPlayerHandle>(null);
 *   <WatchPlayer ref={playerRef} card={card} startSeconds={t} />
 *   <TimecodeList onSeek={(s) => playerRef.current?.seekTo(s)} />   // ui-craftsman
 */

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { ContentCard } from "@/types/content";
import { LiteYouTubeEmbed } from "./LiteYouTubeEmbed";
import { postPlayerCommand } from "./youtube";

export interface WatchPlayerHandle {
  /** 지정 초로 점프(+자동재생). 타임코드 클릭 핸들러에서 호출. */
  seekTo: (seconds: number) => void;
}

export interface WatchPlayerProps {
  card: ContentCard;
  /** 딥링크 시작 지점(초). ?t= 등. 없으면 0. */
  startSeconds?: number;
  className?: string;
}

export const WatchPlayer = forwardRef<WatchPlayerHandle, WatchPlayerProps>(
  function WatchPlayer({ card, startSeconds = 0, className }, ref) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    // 타임코드 seek 이 들어오면 강제로 iframe 마운트(클릭 전이어도 재생 시작)
    const [forceActive, setForceActive] = useState<boolean>(startSeconds > 0);
    // 마운트 후 들어온 seek 은 iframe 준비를 기다렸다 적용
    const pendingSeek = useRef<number | null>(
      startSeconds > 0 ? startSeconds : null
    );

    const applyPending = useCallback(() => {
      if (pendingSeek.current !== null && iframeRef.current) {
        postPlayerCommand(iframeRef.current, "seekTo", [
          pendingSeek.current,
          true,
        ]);
        postPlayerCommand(iframeRef.current, "playVideo");
        pendingSeek.current = null;
      }
    }, []);

    const handleIframeReady = useCallback(
      (iframe: HTMLIFrameElement) => {
        iframeRef.current = iframe;
        // iframe 로드 직후엔 API 가 준비 전일 수 있어 약간의 지연 후 적용
        iframe.addEventListener("load", () => {
          window.setTimeout(applyPending, 350);
        });
      },
      [applyPending]
    );

    useImperativeHandle(
      ref,
      () => ({
        seekTo(seconds: number) {
          if (iframeRef.current && !forceActive) {
            // 이미 마운트된 경우 즉시 seek
            postPlayerCommand(iframeRef.current, "seekTo", [seconds, true]);
            postPlayerCommand(iframeRef.current, "playVideo");
            return;
          }
          if (iframeRef.current) {
            postPlayerCommand(iframeRef.current, "seekTo", [seconds, true]);
            postPlayerCommand(iframeRef.current, "playVideo");
            return;
          }
          // 아직 미마운트 → 마운트 트리거 + 로드 후 적용 예약
          pendingSeek.current = seconds;
          setForceActive(true);
        },
      }),
      [forceActive]
    );

    return (
      <LiteYouTubeEmbed
        videoId={card.videoId}
        title={card.title}
        thumbnailUrl={card.thumbnailUrl}
        embeddable={card.embeddable}
        aspect="16:9"
        priority
        active={forceActive ? true : undefined}
        onIframeReady={handleIframeReady}
        embedParams={{
          autoplay: true,
          muted: false,
          controls: true,
          noRelated: true,
          jsApi: true, // 타임코드 seek 제어
          start: startSeconds > 0 ? startSeconds : undefined,
        }}
        className={className}
      />
    );
  }
);
