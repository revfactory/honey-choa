"use client";

/**
 * ShortsFeed — `/shorts` 풀스크린 세로 피드 엔진 (player-integrator 소유)
 * ----------------------------------------------------------------------------
 * spec §7 ★차별화. frontend-lead 성능 계약(§7.4):
 *   (1) 동시 활성 임베드 ≤2   (2) 스와이프 60fps
 *   (3) 1425 전건 도달(점진 로드 누락 0)   (4) 가시 영역만 마운트(가상 스크롤)
 *
 * 구현 전략:
 *   - 컨테이너: CSS scroll-snap(snap-stop=always) 세로. 스크롤/스와이프/휠/↑↓ 모두 네이티브 스크롤로 통일
 *     → 메인 스레드 JS 애니메이션 없음 = 60fps 보장(transform/opacity 외 레이아웃 변경 없음)
 *   - 활성 인덱스: IntersectionObserver(가시 50%+) 로 추적. 라이브러리 의존 없음
 *   - 마운트 윈도우: [active]만 iframe 마운트(동시 1개). active±1 은 썸네일 프리워밍.
 *       → "동시 활성 임베드 ≤2" 계약 충족(보수적으로 1개 재생 + 인접 프리로드 안 함, 메모리 회수)
 *   - 가상 스크롤: 전체 슬라이드 DOM 은 가벼운 placeholder(썸네일조차 active±2 윈도우 밖은 비로딩)
 *   - 점진 로드: visibleCount 를 끝 근처(4~5 남음) 도달 시 배치 증가 → 1425 전건 도달
 *
 * 연결 지점(ui-craftsman): 각 슬라이드 메타 오버레이(제목/장르/조회/관련영상 버튼)는
 *   renderOverlay(card, index) 슬롯으로 주입. 닫기 ✕·필터칩은 renderChrome 슬롯.
 *   motion-engineer: 스냅 전환은 네이티브 — 별도 모션 주입 시 상호 테스트 필요(정책 4).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import type { ContentCard } from "@/types/content";
import {
  buildEmbedUrl,
  EMBED_ALLOW,
  postPlayerCommand,
  youtubeWatchUrl,
} from "./youtube";

/** 한 번에 늘리는 점진 로드 배치 크기. */
const BATCH = 12;
/** 끝에서 이만큼 남으면 다음 배치 로드. */
const LOAD_AHEAD = 5;
/** 썸네일 프리워밍 윈도우(active 기준 ±). iframe 은 active 단일만 마운트. */
const THUMB_WINDOW = 2;

export interface ShortsFeedProps {
  /** isShort=true ContentCard 전체(또는 필터 적용분). 1425건 가능. */
  shorts: ContentCard[];
  /** 딥링크 시작 인덱스(/shorts?v= → 호출부가 index 계산해 전달). 기본 0. */
  initialIndex?: number;
  /** 메타 오버레이 슬롯(ui-craftsman). active 여부로 표시 디테일 조절 가능. */
  renderOverlay?: (card: ContentCard, index: number, active: boolean) => React.ReactNode;
  /** 상단 chrome(닫기 ✕·필터칩) 슬롯(ui-craftsman). 현재 인덱스 변동 시 갱신용. */
  renderChrome?: (activeIndex: number, total: number) => React.ReactNode;
  /** 빈 상태(필터 0건) 슬롯. 미지정 시 기본 메시지. */
  emptyState?: React.ReactNode;
  className?: string;
}

export function ShortsFeed({
  shorts,
  initialIndex = 0,
  renderOverlay,
  renderChrome,
  emptyState,
  className,
}: ShortsFeedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  // 전역 소리 토글. 자동재생 보장을 위해 음소거로 시작하고, 사용자 제스처(탭)로 켠다.
  // 한 번 켜면 이후 슬라이드에도 유지(YouTube Shorts/TikTok 패턴).
  const [soundOn, setSoundOn] = useState(false);
  // 점진 로드: 초기엔 initialIndex 를 덮는 최소 윈도우만, 이후 스크롤로 확장
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(shorts.length, Math.max(initialIndex + 1 + BATCH, BATCH))
  );

  const total = shorts.length;

  // 딥링크: 초기 인덱스로 즉시 스크롤(스무스 아님 — 진입은 점프).
  useEffect(() => {
    if (initialIndex > 0 && slideRefs.current[initialIndex]) {
      slideRefs.current[initialIndex]?.scrollIntoView({ block: "start" });
      setActiveIndex(initialIndex);
    }
    // initialIndex 변경(필터 재구성)에만 반응
  }, [initialIndex]);

  // 활성 인덱스 추적 — IntersectionObserver(가시 50%+ 인 슬라이드가 active).
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            const idx = Number((e.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        }
      },
      { root, threshold: [0.5, 0.75] }
    );
    const els = slideRefs.current.slice(0, visibleCount).filter(Boolean) as HTMLElement[];
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [visibleCount]);

  // 점진 로드: active 가 끝 근처(LOAD_AHEAD)면 다음 배치 노출.
  useEffect(() => {
    if (activeIndex >= visibleCount - LOAD_AHEAD && visibleCount < total) {
      setVisibleCount((v) => Math.min(total, v + BATCH));
    }
  }, [activeIndex, visibleCount, total]);

  // 키보드 ↑↓ 전환(데스크탑). 네이티브 스크롤로 위임 → snap 이 정렬.
  const go = useCallback(
    (delta: number) => {
      const next = Math.min(total - 1, Math.max(0, activeIndex + delta));
      slideRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [activeIndex, total]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (total === 0) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[var(--stage-950)]">
        {emptyState ?? (
          <p className="text-[length:var(--text-base)] text-[var(--text-secondary)]">
            이 조건의 숏츠가 없어요
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        // z-modal 로 풀스크린 — 모바일 하단 탭바(z-sticky-nav=100)를 덮어 자동 숨김 효과(spec §2.2/§7)
        "fixed inset-0 z-[var(--z-modal)] bg-[var(--stage-950)]",
        className
      )}
    >
      {/* 상단 chrome 슬롯(닫기·필터) — ui-craftsman */}
      {renderChrome ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 [&>*]:pointer-events-auto">
          {renderChrome(activeIndex, total)}
        </div>
      ) : null}

      {/* 데스크탑 사이드 ↑↓ 컨트롤 (모바일은 스와이프 — 숨김) */}
      <div className="pointer-events-none absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 md:flex">
        <NavArrow dir="up" disabled={activeIndex === 0} onClick={() => go(-1)} />
        <NavArrow dir="down" disabled={activeIndex >= total - 1} onClick={() => go(1)} />
      </div>

      {/* 전역 소리 토글 — 우하단(safe-area). 오버레이 메타는 좌하단이라 충돌 없음 */}
      <button
        type="button"
        onClick={() => setSoundOn((v) => !v)}
        aria-label={soundOn ? "소리 끄기" : "소리 켜기"}
        aria-pressed={soundOn}
        className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--overlay-scrim)] text-[var(--text-primary)] backdrop-blur-sm transition-opacity hover:opacity-90"
      >
        <SoundIcon on={soundOn} />
      </button>

      {/* 스크롤 컨테이너 — scroll-snap 세로. 가시 영역만 의미있게 렌더(가상 스크롤) */}
      <div
        ref={containerRef}
        className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain"
        style={{ scrollSnapStop: "always" } as React.CSSProperties}
        tabIndex={0}
        aria-label="숏츠 세로 피드"
      >
        {shorts.slice(0, visibleCount).map((card, index) => {
          const active = index === activeIndex;
          const withinThumb = Math.abs(index - activeIndex) <= THUMB_WINDOW;
          return (
            <div
              key={card.videoId}
              data-index={index}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
              className="relative flex h-[100dvh] w-full snap-start snap-always items-center justify-center"
            >
              <ShortSlide
                card={card}
                index={index}
                active={active}
                withinThumb={withinThumb}
                soundOn={soundOn}
                overlay={renderOverlay?.(card, index, active)}
              />
            </div>
          );
        })}
        {/* 점진 로드 센티넬 — visibleCount<total 이면 여백 없이 다음 배치가 자동 확장됨 */}
      </div>
    </div>
  );
}

/**
 * 단일 슬라이드 — 9:16 컨테이너.
 * 마운트 정책: active 만 iframe(동시 1개) / 인접은 썸네일 / 그 외는 빈 stage(가상 스크롤).
 * embeddable=false 면 active 여도 iframe 대신 폴백.
 */
function ShortSlide({
  card,
  active,
  withinThumb,
  soundOn,
  overlay,
}: {
  card: ContentCard;
  index: number;
  active: boolean;
  withinThumb: boolean;
  soundOn: boolean;
  overlay?: React.ReactNode;
}) {
  const [origin, setOrigin] = useState<string | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const showIframe = active && card.embeddable;

  // 소리 적용: iframe 은 항상 mute=1 로 마운트(자동재생 보장)되므로,
  // 활성 슬라이드에서 soundOn 이면 IFrame API(unMute)로 음소거를 푼다.
  // 플레이어 초기화 타이밍 편차를 흡수하려 약간의 지연 재시도를 둔다.
  useEffect(() => {
    if (!showIframe) return;
    const apply = () => {
      postPlayerCommand(iframeRef.current, soundOn ? "unMute" : "mute");
      if (soundOn) postPlayerCommand(iframeRef.current, "playVideo");
    };
    apply();
    const t = setTimeout(apply, 350);
    return () => clearTimeout(t);
  }, [showIframe, soundOn]);

  // 9:16 비율 컬럼: 모바일은 풀스크린, 데스크탑/태블릿은 중앙 고정폭 레터박스(spec §7.6)
  return (
    <div className="relative h-full w-full max-h-[100dvh] md:flex md:items-center md:justify-center">
      <div className="relative mx-auto h-full w-full overflow-hidden bg-black md:aspect-[9/16] md:h-[min(92dvh,calc(100vw*16/9*0.5))] md:w-auto md:rounded-[var(--radius-card)]">
        {showIframe ? (
          <iframe
            ref={iframeRef}
            className="absolute inset-0 h-full w-full border-0"
            src={buildEmbedUrl(card.videoId, {
              autoplay: true,
              muted: true, // 모바일 자동재생 보장(음소거 필수 — 플랫폼 정책). 소리는 unMute API로 해제
              controls: false, // 숏츠 몰입
              loop: true,
              noRelated: true,
              jsApi: true,
              origin,
            })}
            title={card.title}
            allow={EMBED_ALLOW}
            allowFullScreen
            loading="eager"
            onLoad={() => {
              if (active && soundOn) {
                postPlayerCommand(iframeRef.current, "unMute");
                postPlayerCommand(iframeRef.current, "playVideo");
              }
            }}
          />
        ) : !card.embeddable && active ? (
          // 폴백: 임베드 차단 숏츠 → 썸네일 + YouTube 링크(spec §7.5)
          <FallbackThumb card={card} dimmed>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--overlay-scrim)] px-6 text-center">
              <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)]">
                이 영상은 여기서 볼 수 없어요
              </p>
              <a
                href={youtubeWatchUrl(card.videoId)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[var(--honey-400)] px-4 py-2 text-[length:var(--text-sm)] font-semibold text-[var(--text-on-honey)]"
              >
                YouTube에서 보기 ↗
              </a>
            </div>
          </FallbackThumb>
        ) : withinThumb ? (
          // 인접 슬라이드: 썸네일 프리워밍(iframe 미마운트 — 메모리/네트워크 절약)
          <FallbackThumb card={card} />
        ) : (
          // 윈도우 밖: 빈 stage 표면(가상 스크롤 — 썸네일조차 비로딩)
          <div className="absolute inset-0 bg-[var(--stage-900,var(--stage-950))]" />
        )}

        {/* 메타 오버레이(ui-craftsman) — iframe 위에 thumb-veil 그라데이션과 함께 */}
        {overlay ? (
          <div className="pointer-events-none absolute inset-0 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
            {overlay}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FallbackThumb({
  card,
  dimmed = false,
  children,
}: {
  card: ContentCard;
  dimmed?: boolean;
  children?: React.ReactNode;
}) {
  const [errored, setErrored] = useState(false);
  if (!card.thumbnailUrl || errored) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--stage-800)]">
        <span className="font-display text-[length:var(--text-lg)] text-[var(--text-muted)]">
          꿀초아tv
        </span>
        {children}
      </div>
    );
  }
  return (
    <>
      <Image
        src={card.thumbnailUrl}
        alt={card.title}
        fill
        sizes="(max-width: 768px) 100vw, 480px"
        decoding="async"
        loading="lazy"
        onError={() => setErrored(true)}
        className={cn("object-cover", dimmed && "opacity-40")}
      />
      {children}
    </>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9v6h4l5 4V5L8 9H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {on ? (
        <path
          d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <path
          d="M22 9l-5 6M17 9l5 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

function NavArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: "up" | "down";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "up" ? "이전 숏츠" : "다음 숏츠"}
      className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--overlay-scrim)] text-[var(--text-primary)] backdrop-blur-sm transition-opacity disabled:opacity-30"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d={dir === "up" ? "M6 14l6-6 6 6" : "M6 10l6 6 6-6"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
