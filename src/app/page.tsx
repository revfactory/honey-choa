import { HomeHero } from "@/components/sections/home/HomeHero";
import {
  HomeTrackRail,
  HomeLearnRail,
  HomeShortsRail,
} from "@/components/sections/home/HomeRails";
import { HomeGenreChips } from "@/components/sections/home/HomeGenreChips";

// 홈 `/` — wireframe §4. 본문: ui-craftsman. 히어로 모션 배경/Beat Pulse 슬롯은 motion-engineer.
// 데이터: 정적 빌드 타임 — 모든 셀렉터 동기 호출. 레일은 항목 0이면 섹션 자체 비표시.
export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeTrackRail />
      <HomeLearnRail />
      <HomeShortsRail />
      <HomeGenreChips />
    </>
  );
}
