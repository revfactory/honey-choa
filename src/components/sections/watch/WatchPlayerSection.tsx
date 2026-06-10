"use client";

import { WatchPlayerClient } from "@/components/player";
import {
  WatchBody,
  type Timecode,
  type TrackContext,
} from "@/components/sections/watch/WatchBody";
import type { ContentCard } from "@/types/content";

/**
 * 플레이어 + 본문 합성(client) — wireframe §9.
 * 서버에서 조인한 직렬화 가능 데이터를 받아, player-integrator WatchPlayerClient 의
 * render-prop(seekTo)을 WatchBody 에 연결한다. render-prop(함수)은 client 경계 안에서만 생성되어야
 * 하므로(서버→클라 함수 전달 금지) 이 래퍼가 client 다.
 */
export function WatchPlayerSection({
  card,
  timecodes,
  related,
  tracks,
}: {
  card: ContentCard;
  timecodes: Timecode[];
  related: ContentCard[];
  tracks: TrackContext[];
}) {
  return (
    <WatchPlayerClient card={card}>
      {(seekTo) => (
        <WatchBody
          card={card}
          timecodes={timecodes}
          related={related}
          tracks={tracks}
          seekTo={seekTo}
        />
      )}
    </WatchPlayerClient>
  );
}
