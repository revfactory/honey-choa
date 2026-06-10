import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTrackIds, getTrackView } from "@/lib/content";
import { TrackDetail } from "@/components/sections/learn/TrackDetail";

// 트랙 상세 `/learn/[trackId]` — spec §3.3. 본문: ui-craftsman(스텝 타임라인) + motion-engineer.
// SSG: 3개 trackId 전건 사전 생성. 없는 trackId는 404.

export function generateStaticParams() {
  return getTrackIds().map((trackId) => ({ trackId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ trackId: string }>;
}): Promise<Metadata> {
  const { trackId } = await params;
  const track = getTrackView(trackId);
  if (!track) return { title: "트랙을 찾을 수 없어요" };
  return { title: track.title, description: track.description };
}

export default async function TrackDetailPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { trackId } = await params;
  const track = getTrackView(trackId);
  if (!track) notFound();

  return <TrackDetail track={track} />;
}
