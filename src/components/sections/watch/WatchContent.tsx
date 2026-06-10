import Link from "next/link";
import { Section } from "@/components/common";
import { WatchPlayerSection } from "@/components/sections/watch/WatchPlayerSection";
import type { Timecode, TrackContext } from "@/components/sections/watch/WatchBody";
import { getCard, getTracksContaining, getTrackView } from "@/lib/content";
import type { ContentCard } from "@/types/content";

/** "MM:SS 라벨" / "HH:MM:SS 라벨" 형태 타임코드 파싱 — copy_deck §8.2. */
function parseTimecodes(description: string): Timecode[] {
  const re = /(?:^|\n)\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+)/g;
  const out: Timecode[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(description)) !== null) {
    const parts = m[1].split(":").map(Number);
    const seconds =
      parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts[0] * 60 + parts[1];
    out.push({ seconds, display: m[1], label: m[2].trim() });
  }
  return out;
}

/**
 * 영상 상세 본문 오케스트레이터 (ui-craftsman, wireframe §9).
 * 서버에서 관련 영상·트랙 컨텍스트·타임코드를 조인하고,
 * 플레이어는 player-integrator WatchPlayerClient 로 마운트(경계: 플레이어 박스는 그들 소유).
 * WatchPlayerClient 의 render-prop(seekTo) 을 WatchBody 에 전달 → 타임코드 seek 연동.
 */
export function WatchContent({ card }: { card: ContentCard }) {
  const timecodes = parseTimecodes(card.description);
  const related = card.relatedIds
    .map((id) => getCard(id))
    .filter((c): c is ContentCard => Boolean(c));
  const tracks: TrackContext[] = getTracksContaining(card.videoId)
    .map((t) => getTrackView(t.trackId))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => ({
      trackId: t.trackId,
      trackTitle: t.title,
      stepIds: t.steps.map((s) => s.card.videoId),
    }));

  return (
    <Section>
      <Link
        href="/library/"
        className="mb-[var(--space-4)] inline-flex items-center gap-1 text-[length:var(--text-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <span aria-hidden>←</span> 뒤로
      </Link>

      {/* 플레이어(player-integrator) + 메타/설명/관련/곡(ui-craftsman). render-prop 합성은 client 래퍼. */}
      <WatchPlayerSection
        card={card}
        timecodes={timecodes}
        related={related}
        tracks={tracks}
      />
    </Section>
  );
}
