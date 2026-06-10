import Link from "next/link";
import { Section, SectionHeader, VideoCard, ShortsCard } from "@/components/common";
import { Reveal } from "@/components/motion";
import { ContentRail } from "@/components/sections/ContentRail";
import { TrackCard } from "@/components/sections/TrackCard";
import { getTracks, getTrackView, getVideos, getShorts } from "@/lib/content";

/** "전체 보기 →" 링크(SectionHeader action). copy_deck §11 btn.viewAll. */
function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="shrink-0 whitespace-nowrap text-[length:var(--text-sm)] font-semibold text-[var(--honey-300)] hover:text-[var(--honey-200)]"
    >
      {label}
    </Link>
  );
}

/**
 * 트랙 레일 — wireframe §4.1 / copy_deck §3.2.
 * 3트랙은 항상 존재(빈상태 없음). 모바일 가로 스와이프, 데스크탑 3카드.
 */
export function HomeTrackRail() {
  const tracks = getTracks()
    .map((t) => getTrackView(t.trackId))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  if (tracks.length === 0) return null; // 방어(트랙 보장이나 빈 헤더 금지 규칙)

  return (
    <Section className="!pb-0">
      <SectionHeader
        title="커리큘럼 트랙으로 시작하기"
        subtitle="순서대로 따라가면 첫 소셜까지"
        action={<ViewAllLink href="/learn/" label="학습 허브 →" />}
      />
      {/* 데스크탑 3열 그리드 / 모바일 가로 스와이프 레일. Rhythm Stagger 등장(Reveal). */}
      <div className="hidden gap-[var(--space-4)] md:grid md:grid-cols-3">
        {tracks.map((track, i) => (
          <Reveal key={track.trackId} index={i}>
            <TrackCard track={track} variant="hub" />
          </Reveal>
        ))}
      </div>
      <div className="md:hidden">
        <ContentRail ariaLabel="커리큘럼 트랙" itemClassName="w-[280px]">
          {tracks.map((track, i) => (
            <Reveal key={track.trackId} index={i}>
              <TrackCard track={track} variant="hub" />
            </Reveal>
          ))}
        </ContentRail>
      </div>
    </Section>
  );
}

/**
 * 추천 학습 영상 레일 — wireframe §4.3.
 * isShort=false & type∈{tutorial,workshop} 인기순 8. 항목 0이면 섹션 비표시.
 */
export function HomeLearnRail() {
  const cards = getVideos({ types: ["tutorial", "workshop"] }, "popular").slice(0, 8);
  if (cards.length === 0) return null;

  return (
    <Section className="!pb-0">
      <SectionHeader
        title="추천 학습 영상"
        subtitle="인기 튜토리얼·워크샵부터 골라봤어요"
        action={<ViewAllLink href="/library/?type=tutorial" label="전체 보기 →" />}
      />
      <ContentRail ariaLabel="추천 학습 영상" itemClassName="w-[280px]">
        {cards.map((card, i) => (
          <Reveal key={card.videoId} index={i}>
            <VideoCard card={card} />
          </Reveal>
        ))}
      </ContentRail>
    </Section>
  );
}

/**
 * 숏츠 미리보기 레일 — wireframe §4.3.
 * isShort=true 인기순 12. 항목 0이면 섹션 비표시.
 */
export function HomeShortsRail() {
  const cards = getShorts({}, "popular").slice(0, 12);
  if (cards.length === 0) return null;

  return (
    <Section className="!pb-0">
      <SectionHeader
        title="숏츠 미리보기"
        subtitle="가볍게 넘겨보는 댄스 한 컷"
        action={<ViewAllLink href="/shorts/" label="숏츠 피드 →" />}
      />
      <ContentRail ariaLabel="숏츠 미리보기" itemClassName="w-[150px] sm:w-[170px]">
        {cards.map((card, i) => (
          <Reveal key={card.videoId} index={i}>
            <ShortsCard card={card} />
          </Reveal>
        ))}
      </ContentRail>
    </Section>
  );
}
