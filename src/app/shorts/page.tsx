import type { Metadata } from "next";
import { getShorts, getShortsFacets } from "@/lib/content";
import { ShortsExperience } from "@/components/sections/shorts/ShortsExperience";

export const metadata: Metadata = {
  title: "숏츠 피드",
  description: "1,425개 라틴댄스 숏츠를 세로로 넘겨보세요.",
};

// 숏츠 피드 `/shorts` — wireframe §7 ★차별화.
// player-integrator(ShortsFeed 엔진: 임베드·점진로드·가상스크롤) + ui-craftsman(오버레이·필터 chrome).
// 데이터: getShorts() [isShort=true]. 풀스크린(z-modal)이라 하단 탭바·푸터를 덮어 자동 숨김.
export default function ShortsPage() {
  const shorts = getShorts({}, "popular");
  const { byGenre } = getShortsFacets();
  return <ShortsExperience shorts={shorts} genreFacets={byGenre} />;
}
