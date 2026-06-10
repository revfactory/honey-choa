import type { Metadata } from "next";
import { Suspense } from "react";
import { getVideos, getLibraryFacets } from "@/lib/content";
import { LibraryBrowser } from "@/components/sections/library/LibraryBrowser";
import { CardGridSkeleton, Section } from "@/components/common";

export const metadata: Metadata = {
  title: "영상 라이브러리",
  description: "바차타·살사 강의 영상을 유형·장르·난이도로 좁혀 찾아보세요.",
};

// 라이브러리 `/library` — wireframe §8. 본문: ui-craftsman.
// 데이터는 빌드 타임 정적. 롱폼 전건 + 칩 카운트(롱폼 부분집합)를 client 브라우저에 주입.
// useSearchParams(딥링크 동기화)는 정적 export에서 Suspense 경계 필요.
export default function LibraryPage() {
  // isShort=false 전건(미분류 포함 — 토글은 클라에서 처리). 기본 인기순.
  const cards = getVideos({ includeUnclassified: true });
  const facets = getLibraryFacets();

  return (
    <Suspense
      fallback={
        <Section>
          <CardGridSkeleton count={8} />
        </Section>
      }
    >
      <LibraryBrowser cards={cards} facets={facets} />
    </Suspense>
  );
}
