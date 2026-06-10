import Link from "next/link";
import { Section, SectionHeader } from "@/components/common";
import { getLibraryFacets } from "@/lib/content";
import { GENRE_LABEL, GENRE_COLOR, formatInt } from "@/lib/labels";
import type { Genre } from "@/types/content";

const GENRE_DOT_COLOR: Record<string, string> = {
  honey: "var(--honey-400)",
  heat: "var(--heat-400)",
  sky: "var(--sky-400)",
  rose: "var(--rose-400)",
  muted: "var(--text-muted)",
};

// 홈 노출 장르(copy_deck §3.4): 바차타·살사·주크. latin_pop(1건) 제외.
const HOME_GENRES: Genre[] = ["bachata", "salsa", "zouk"];

/**
 * 장르별 둘러보기 — wireframe §4.1 / copy_deck §3.4.
 * 칩 클릭 → /library?genre= 프리셋. 라이브러리는 롱폼 전용이므로,
 * 카운트도 getLibraryFacets()(롱폼 부분집합) 기준으로 표기해야 목적지 실제 편수와 일치한다
 * (Phase 4 결함 수정: 합산 stats 1,269 → 롱폼 136 오해 동선 제거).
 * 칩은 라우트 이동이므로 FilterChip(클릭 토글) 대신 링크형으로 구현.
 */
export function HomeGenreChips() {
  const byGenre = getLibraryFacets().byGenre;

  return (
    <Section className="!pt-0">
      <SectionHeader title="장르별 둘러보기" />
      <ul className="flex flex-wrap gap-[var(--space-3)]">
        {HOME_GENRES.map((genre) => {
          const count = byGenre[genre] ?? 0;
          if (count === 0) return null;
          return (
            <li key={genre}>
              <Link
                href={`/library/?genre=${genre}`}
                className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-chip)] border border-[var(--stage-600)] px-[var(--space-4)] text-[length:var(--text-sm)] text-[var(--text-secondary)] transition-colors hover:border-[var(--honey-glow-strong)] hover:text-[var(--text-primary)]"
              >
                <span
                  aria-hidden
                  className="inline-block size-1.5 rounded-full"
                  style={{ backgroundColor: GENRE_DOT_COLOR[GENRE_COLOR[genre]] }}
                />
                {GENRE_LABEL[genre]}
                <span className="tabular opacity-70">{formatInt(count)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
