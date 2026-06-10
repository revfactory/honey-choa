"use client";

import Link from "next/link";
import {
  VideoCard,
  DifficultyBadge,
  GenreBadge,
  TypeBadge,
} from "@/components/common";
import { ContentRail } from "@/components/sections/ContentRail";
import { DescriptionBlock } from "@/components/sections/watch/DescriptionBlock";
import { WatchTrackContext } from "@/components/sections/watch/WatchTrackContext";
import { formatCountKo } from "@/lib/labels";
import type { ContentCard } from "@/types/content";

export interface Timecode {
  seconds: number;
  display: string;
  label: string;
}

export interface TrackContext {
  trackId: string;
  trackTitle: string;
  stepIds: string[];
}

interface WatchBodyProps {
  card: ContentCard;
  timecodes: Timecode[];
  related: ContentCard[];
  tracks: TrackContext[];
  /** player-integrator WatchPlayerClient render-prop 으로 받은 seek. */
  seekTo?: (seconds: number) => void;
}

function formatDate(iso: string): string {
  return `${iso.slice(0, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}`;
}

/**
 * 영상 상세 — 메타/설명/관련/곡/트랙 컨텍스트 (ui-craftsman, wireframe §9 / copy_deck §8).
 * 플레이어는 player-integrator(WatchPlayerClient) 가 이 컴포넌트 위에 마운트하고,
 * seekTo render-prop 을 내려준다 → 타임코드 클릭이 플레이어를 seek 한다.
 * 관련/곡/트랙은 조건부 — 없으면 섹션 자체 비표시(빈 헤더 금지, wireframe §9.5).
 */
export function WatchBody({ card, timecodes, related, tracks, seekTo }: WatchBodyProps) {
  return (
    <div className="mt-[var(--space-6)] flex flex-col gap-[var(--space-6)]">
      {/* 트랙 컨텍스트 배너(?track= 있을 때만) */}
      {tracks.length > 0 && (
        <WatchTrackContext currentVideoId={card.videoId} tracks={tracks} />
      )}

      {/* 메타 */}
      <header className="flex flex-col gap-[var(--space-3)]">
        <h1 className="text-[length:var(--text-h2)] font-bold leading-tight text-[var(--text-primary)]">
          {card.title}
        </h1>
        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
          {card.type !== "uncurated" && <TypeBadge type={card.type} />}
          {card.genre && <GenreBadge genre={card.genre} />}
          {card.difficulty && <DifficultyBadge difficulty={card.difficulty} />}
        </div>
        <p className="tabular text-[length:var(--text-sm)] text-[var(--text-muted)]">
          조회 {formatCountKo(card.statistics.viewCount)}
          {card.statistics.likeCount > 0 && (
            <> · 좋아요 {formatCountKo(card.statistics.likeCount)}</>
          )}
          {" · "}
          {formatDate(card.publishedAt)}
        </p>
      </header>

      <div className="grid gap-[var(--space-8)] lg:grid-cols-[1fr_320px]">
        {/* 설명 + 타임코드(설명 없으면 블록 생략) */}
        <div>
          {card.description.trim() ? (
            <DescriptionBlock
              description={card.description}
              timecodes={timecodes}
              onSeek={seekTo}
            />
          ) : null}
        </div>

        {/* 관련 영상 + 곡(조건부) */}
        {(related.length > 0 || card.song) && (
          <aside className="flex flex-col gap-[var(--space-8)]">
            {related.length > 0 && (
              <section className="flex flex-col gap-[var(--space-4)]">
                <h2 className="text-[length:var(--text-h3)] font-bold text-[var(--text-primary)]">
                  관련 영상
                </h2>
                <div className="hidden flex-col gap-[var(--space-4)] lg:flex">
                  {related.slice(0, 6).map((rc) => (
                    <VideoCard key={rc.videoId} card={rc} />
                  ))}
                </div>
                <div className="lg:hidden">
                  <ContentRail ariaLabel="관련 영상" itemClassName="w-[280px]">
                    {related.slice(0, 12).map((rc) => (
                      <VideoCard key={rc.videoId} card={rc} />
                    ))}
                  </ContentRail>
                </div>
              </section>
            )}

            {card.song && (
              <section className="flex flex-col gap-[var(--space-2)]">
                <h2 className="text-[length:var(--text-h3)] font-bold text-[var(--text-primary)]">
                  이 곡으로
                </h2>
                <p className="text-[length:var(--text-base)] text-[var(--text-secondary)]">
                  「{card.song.title}」
                  {card.song.artist && (
                    <span className="text-[var(--text-muted)]"> {card.song.artist}</span>
                  )}
                </p>
              </section>
            )}
          </aside>
        )}
      </div>

      {/* 뒤로(하단 보조 동선) */}
      <Link
        href="/library/"
        className="self-start text-[length:var(--text-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        ← 라이브러리로
      </Link>
    </div>
  );
}
