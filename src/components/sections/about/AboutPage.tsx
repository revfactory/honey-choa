import { Section, Button } from "@/components/common";
import { CHANNEL_URL } from "@/components/common";
import { getChannel, getStats } from "@/lib/content";
import {
  formatCountKo,
  formatInt,
  GENRE_LABEL,
  GENRE_COLOR,
  TYPE_LABEL,
  LIBRARY_TYPE_ORDER,
  GENRE_ORDER,
} from "@/lib/labels";
import type { ContentType } from "@/types/content";

const CURATED_TOTAL = 1604; // copy_deck §1.4
const BAR_COLOR: Record<string, string> = {
  honey: "var(--honey-400)",
  heat: "var(--heat-400)",
  sky: "var(--sky-400)",
  rose: "var(--rose-400)",
  muted: "var(--text-muted)",
};

/**
 * 채널 소개 — wireframe §10 / copy_deck §9.
 * 채널 정체성(아바타·이름·핸들·원본 설명) + 구독 CTA + 통계 카드 3 + 콘텐츠 분포(옵션).
 * channel.json 단일 객체 항상 존재 → 빈상태 없음. 정적이라 로딩/에러 미발생.
 * §9 예외: 채널 설명만 원본 이모지 유지(자산 보존).
 */
export function AboutPage() {
  const channel = getChannel();
  const avatar =
    channel.thumbnails.high?.url ??
    channel.thumbnails.medium?.url ??
    channel.thumbnails.default?.url ??
    "";
  const stats = getStats();

  return (
    <Section>
      {/* 정체성 */}
      <header className="flex flex-col items-center gap-[var(--space-4)] text-center md:flex-row md:items-center md:gap-[var(--space-8)] md:text-left">
        {avatar && (
          <img
            src={avatar}
            alt="꿀초아tv 채널 아바타"
            width={120}
            height={120}
            className="size-24 shrink-0 rounded-full object-cover md:size-[120px]"
          />
        )}
        <div className="flex flex-col gap-[var(--space-2)]">
          <h1 className="text-[length:var(--text-h1)] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
            꿀초아tv{" "}
            <span className="text-[length:var(--text-lg)] font-medium text-[var(--text-muted)]">
              {channel.handle}
            </span>
          </h1>
          {/* 원본 채널 설명 — 이모지 포함 그대로(copy_deck §9 예외) */}
          <p className="whitespace-pre-line text-[length:var(--text-base)] text-[var(--text-secondary)]">
            {channel.description.trim()}
          </p>
          <p className="text-[length:var(--text-sm)] text-[var(--text-muted)]">
            라틴댄스를 같이 놀듯이. 꿀초아tv의 영상을 단계별로 모았어요
          </p>
          <div className="mt-[var(--space-2)] flex justify-center md:justify-start">
            <Button href={CHANNEL_URL} variant="primary" external>
              YouTube 구독하기
            </Button>
          </div>
        </div>
      </header>

      {/* 통계 카드 3 */}
      <div className="mt-[var(--space-12)] grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-3">
        <StatCard label="구독자" value={formatCountKo(channel.statistics.subscriberCount)} />
        <StatCard label="영상" value={formatInt(CURATED_TOTAL)} />
        <StatCard label="총 조회" value={formatCountKo(channel.statistics.viewCount)} />
      </div>

      {/* 전체 콘텐츠 분포(정보성 인포그래픽 — 숏츠 포함 채널 전체 1,604 기준).
          Phase 4 결함 수정: 합산 카운트(예: 바차타 1,269)는 롱폼 전용 /library 편수(136)와
          다르므로 라이브러리 링크를 제거하고 정보성 표기로만 둔다(오해 동선 차단). */}
      <div className="mt-[var(--space-12)] flex flex-col gap-[var(--space-8)]">
        <div className="flex flex-col gap-1">
          <h2 className="text-[length:var(--text-h2)] font-bold text-[var(--text-primary)]">
            전체 콘텐츠 분포
          </h2>
          <p className="text-[length:var(--text-sm)] text-[var(--text-muted)]">
            영상·숏츠를 합한 채널 전체 {formatInt(stats.total)}편 기준이에요
          </p>
        </div>
        <Distribution
          title="장르"
          total={stats.total}
          rows={GENRE_ORDER.map((g) => ({
            label: GENRE_LABEL[g],
            count: stats.byGenre[g] ?? 0,
            color: BAR_COLOR[GENRE_COLOR[g]],
          })).filter((r) => r.count > 0)}
        />
        <Distribution
          title="유형"
          total={stats.total}
          rows={LIBRARY_TYPE_ORDER.map((t: ContentType) => ({
            label: TYPE_LABEL[t],
            count: stats.byType[t] ?? 0,
            color: "var(--honey-400)",
          }))
            .filter((r) => r.count > 0)
            .sort((a, b) => b.count - a.count)}
        />
      </div>
    </Section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-[var(--radius-card)] border border-[var(--stage-700)] bg-[var(--stage-850)] p-[var(--space-6)] text-center">
      <span className="tabular text-[length:var(--text-h2)] font-extrabold text-[var(--text-primary)]">
        {value}
      </span>
      <span className="text-[length:var(--text-sm)] text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

function Distribution({
  title,
  total,
  rows,
}: {
  title: string;
  total: number;
  rows: { label: string; count: number; color: string }[];
}) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <h3 className="text-[length:var(--text-h3)] font-bold text-[var(--text-secondary)]">
        {title}
      </h3>
      {/* 정보성 표기 — 링크 없음(합산↔롱폼 편수 불일치로 인한 오해 동선 방지). */}
      <ul className="flex flex-col gap-[var(--space-2)]">
        {rows.map((r) => {
          const pct = Math.round((r.count / total) * 100);
          return (
            <li key={r.label} className="flex items-center gap-[var(--space-3)]">
              <span className="w-16 shrink-0 text-[length:var(--text-sm)] text-[var(--text-secondary)]">
                {r.label}
              </span>
              <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--stage-800)]">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${(r.count / max) * 100}%`, backgroundColor: r.color }}
                />
              </span>
              <span className="tabular w-20 shrink-0 text-right text-[length:var(--text-sm)] text-[var(--text-muted)]">
                {formatInt(r.count)} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
