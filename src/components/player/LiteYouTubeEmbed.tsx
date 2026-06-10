"use client";

/**
 * LiteYouTubeEmbed — lite embed 패턴 코어 (player-integrator 소유)
 * ----------------------------------------------------------------------------
 * frontend-standards 규약: 초기 렌더에 iframe 을 두지 않는다(1개당 ~500KB 서드파티).
 *   1단계: 썸네일(i.ytimg.com) + 재생 버튼만 렌더
 *   2단계: 사용자 클릭(또는 부모가 active=true 주입) 시 iframe 주입
 *
 * 책임 분리:
 *   - 이 컴포넌트: 썸네일↔iframe 전환, embeddable=false 폴백, 종횡비 컨테이너
 *   - 오버레이 메타·관련영상 UI: ui-craftsman (children/슬롯으로 합성)
 *   - 마운트 정책(가시영역만): ShortsFeed/WatchPlayer 가 active prop 으로 통제
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import {
  buildEmbedUrl,
  EMBED_ALLOW,
  youtubeWatchUrl,
  type EmbedParams,
} from "./youtube";

export interface LiteYouTubeEmbedProps {
  videoId: string;
  title: string;
  /** 폴백 적용된 썸네일 URL(content.ts resolveThumbnailUrl 산출). */
  thumbnailUrl: string;
  /** false면 iframe 대신 "YouTube에서 보기" 폴백(새 탭). */
  embeddable: boolean;
  /** "16:9"(롱폼) | "9:16"(숏츠). 컨테이너 종횡비. */
  aspect?: "16:9" | "9:16";
  /**
   * 외부 제어 활성화. 지정되면 iframe 마운트를 부모가 통제한다(숏츠 가시영역 마운트).
   * 미지정이면 자체 클릭(uncontrolled)으로 마운트.
   */
  active?: boolean;
  /** 임베드 파라미터(autoplay/mute/loop/controls/jsApi 등). */
  embedParams?: EmbedParams;
  /** LCP 후보(상세 페이지 첫 화면)면 priority 로딩. */
  priority?: boolean;
  /** iframe 마운트 시 ref 회수(타임코드 seek 제어용). */
  onIframeReady?: (iframe: HTMLIFrameElement) => void;
  /** 썸네일/폴백 위 오버레이(ui-craftsman 메타). iframe 활성 시 자동 숨김. */
  children?: React.ReactNode;
  className?: string;
}

const ASPECT_CLASS: Record<NonNullable<LiteYouTubeEmbedProps["aspect"]>, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
};

export function LiteYouTubeEmbed({
  videoId,
  title,
  thumbnailUrl,
  embeddable,
  aspect = "16:9",
  active,
  embedParams,
  priority = false,
  onIframeReady,
  children,
  className,
}: LiteYouTubeEmbedProps) {
  const controlled = active !== undefined;
  // uncontrolled: 클릭 시 마운트 / controlled: 부모 active 로 마운트
  const [clicked, setClicked] = useState(false);
  const mounted = controlled ? active : clicked;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [thumbError, setThumbError] = useState(false);

  // origin 은 클라에서만 안전하게 주입(jsApi 보안 권장).
  const [origin, setOrigin] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (mounted && iframeRef.current && onIframeReady) {
      onIframeReady(iframeRef.current);
    }
  }, [mounted, onIframeReady]);

  const aspectClass = ASPECT_CLASS[aspect];

  /* embeddable=false → 새 탭 폴백 (spec §9.5 / §7.5). iframe 절대 마운트 안 함. */
  if (!embeddable) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--stage-800)]",
          aspectClass,
          className
        )}
      >
        <Thumbnail
          thumbnailUrl={thumbnailUrl}
          title={title}
          priority={priority}
          dimmed
          onError={() => setThumbError(true)}
          errored={thumbError}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--overlay-scrim)] px-4 text-center">
          <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)]">
            이 영상은 여기서 볼 수 없어요
          </p>
          <a
            href={youtubeWatchUrl(videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--radius-chip,9999px)] bg-[var(--honey-400)] px-4 py-2 text-[length:var(--text-sm)] font-semibold text-[var(--text-on-honey)] transition-transform hover:scale-[var(--motion-scale-beat)]"
          >
            YouTube에서 보기
            <span aria-hidden>↗</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--stage-800)]",
        aspectClass,
        className
      )}
    >
      {mounted ? (
        <iframe
          ref={iframeRef}
          className="absolute inset-0 h-full w-full border-0"
          src={buildEmbedUrl(videoId, {
            ...embedParams,
            origin: embedParams?.jsApi ? origin : undefined,
          })}
          title={title}
          allow={EMBED_ALLOW}
          allowFullScreen
          loading="eager"
        />
      ) : (
        <button
          type="button"
          onClick={() => !controlled && setClicked(true)}
          aria-label={`재생: ${title}`}
          className="group absolute inset-0 h-full w-full cursor-pointer"
          // controlled(숏츠)인데 아직 미마운트면 버튼 클릭은 부모가 처리 → 비활성 시각만
          tabIndex={controlled ? -1 : 0}
        >
          <Thumbnail
            thumbnailUrl={thumbnailUrl}
            title={title}
            priority={priority}
            onError={() => setThumbError(true)}
            errored={thumbError}
          />
          {/* 재생 버튼 — 모바일 autoplay 실패 전제로 항상 노출(frontend-standards) */}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--overlay-scrim)] backdrop-blur-sm transition-transform duration-[var(--dur-micro)] group-hover:scale-[var(--motion-scale-beat)]">
              <PlayGlyph />
            </span>
          </span>
        </button>
      )}
      {/* 오버레이 슬롯(ui-craftsman 메타): iframe 활성 시 숨김(시청 방해 금지) */}
      {children && !mounted ? (
        <div className="pointer-events-none absolute inset-0">{children}</div>
      ) : null}
    </div>
  );
}

/* 썸네일 — next/image. 폴백 체인 산출 URL을 쓰되, 그마저 깨지면 stage 플레이스홀더. */
function Thumbnail({
  thumbnailUrl,
  title,
  priority,
  dimmed = false,
  errored,
  onError,
}: {
  thumbnailUrl: string;
  title: string;
  priority: boolean;
  dimmed?: boolean;
  errored: boolean;
  onError: () => void;
}) {
  if (!thumbnailUrl || errored) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--stage-750,var(--stage-800))]">
        <span className="font-display text-[length:var(--text-lg)] text-[var(--text-muted)]">
          꿀초아tv
        </span>
      </div>
    );
  }
  return (
    <Image
      src={thumbnailUrl}
      alt={title}
      fill
      sizes="(max-width: 768px) 100vw, 1280px"
      priority={priority}
      loading={priority ? undefined : "lazy"}
      decoding="async"
      onError={onError}
      className={cn(
        "object-cover transition-opacity",
        dimmed && "opacity-40"
      )}
    />
  );
}

function PlayGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 5.5v13l11-6.5L8 5.5z" fill="var(--honey-300)" />
    </svg>
  );
}
