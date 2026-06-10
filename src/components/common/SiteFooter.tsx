import Link from "next/link";
import { getChannel, formatCountKo, formatInt } from "@/lib/content";
import { NAV_ITEMS, CHANNEL_URL } from "@/components/common/nav-items";

/**
 * 푸터 — copy_deck §1.3.
 * 채널 식별 · 내비(가운뎃점) · YouTube 외부 링크 · 통계 스트립 · 카피라이트.
 * 통계 값은 channel.json 가공. 사이트 영상 수는 1,604로 통일(spec).
 */
export function SiteFooter() {
  const channel = getChannel();
  const stats = channel.statistics;
  // 영상 수는 큐레이션 기준 1,604로 통일(copy_deck §1.4 주석).
  const CURATED_TOTAL = 1604;

  return (
    <footer className="mt-[var(--space-24)] border-t border-[var(--stage-700)] bg-[var(--stage-900)] pb-[88px] md:pb-0">
      <div className="mx-auto flex max-w-[var(--content-max)] flex-col gap-[var(--space-6)] px-[var(--gutter)] py-[var(--space-12)]">
        <div className="flex flex-col gap-[var(--space-2)]">
          <span className="font-[family-name:var(--font-display)] text-[length:var(--text-h3)] font-extrabold text-[var(--text-primary)]">
            꿀초아tv
          </span>
          <span className="text-[length:var(--text-sm)] text-[var(--text-muted)]">
            꿀초아tv · {channel.handle}
          </span>
        </div>

        <nav aria-label="푸터 메뉴">
          <ul className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-2 text-[length:var(--text-sm)] text-[var(--text-secondary)]">
            {NAV_ITEMS.map((item, i) => (
              <li key={item.href} className="flex items-center gap-x-[var(--space-3)]">
                {i > 0 && <span aria-hidden className="text-[var(--text-muted)]">·</span>}
                <Link href={item.href} className="hover:text-[var(--text-primary)]">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="tabular text-[length:var(--text-sm)] text-[var(--text-secondary)]">
          구독 {formatCountKo(stats.subscriberCount)} · 영상 {formatInt(CURATED_TOTAL)} · 조회{" "}
          {formatCountKo(stats.viewCount)}
        </p>

        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[length:var(--text-sm)] text-[var(--text-link)] hover:underline"
        >
          YouTube 채널 바로가기 →
        </a>

        <p className="text-[length:var(--text-xs)] text-[var(--text-muted)]">
          © 꿀초아tv · 비공식 큐레이션 사이트
        </p>
      </div>
    </footer>
  );
}
