import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAllVideoIds, getCard } from "@/lib/content";
import { buildWatchDescription } from "@/lib/labels";
import { WatchContent } from "@/components/sections/watch/WatchContent";

// 영상 상세 `/watch/[videoId]` — wireframe §9. player-integrator(임베드) + ui-craftsman(메타/관련/트랙배너).
// SSG: 1,604개 videoId 전건 사전 생성. 없는 videoId는 404.

export function generateStaticParams() {
  return getAllVideoIds().map((videoId) => ({ videoId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ videoId: string }>;
}): Promise<Metadata> {
  const { videoId } = await params;
  const card = getCard(videoId);
  if (!card) return { title: "영상을 찾을 수 없어요" };
  // M2: description 빈 영상(87.5%)은 제목·장르·유형·채널명으로 폴백 합성.
  const description = buildWatchDescription({
    title: card.title,
    description: card.description,
    genre: card.genre,
    type: card.type,
  });
  return {
    title: card.title,
    description,
    alternates: { canonical: `/watch/${videoId}/` },
    openGraph: {
      title: card.title,
      description,
      type: "video.other",
      url: `/watch/${videoId}/`,
      images: card.thumbnailUrl ? [card.thumbnailUrl] : [],
    },
  };
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  const card = getCard(videoId);
  if (!card) notFound();

  // WatchTrackContext(?track=)가 useSearchParams 를 쓰므로 정적 export 에서 Suspense 경계 필요.
  return (
    <Suspense fallback={null}>
      <WatchContent card={card} />
    </Suspense>
  );
}
