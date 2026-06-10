import { Section } from "@/components/common/Section";

/**
 * 페이지 스텁 표시 — frontend-lead 가 골격으로 생성. 다른 에이전트가 본문으로 교체한다.
 * 빌드는 통과하되, 미완성임을 시각적으로 드러낸다(플레이스홀더 0 완료 기준 추적용).
 */
export function StubNotice({
  title,
  owner,
  note,
}: {
  title: string;
  owner: string;
  note?: string;
}) {
  return (
    <Section>
      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--stage-600)] bg-[var(--stage-850)] p-[var(--space-8)]">
        <p className="text-[length:var(--text-h3)] font-bold text-[var(--honey-300)]">
          {title}
        </p>
        <p className="mt-2 text-[length:var(--text-sm)] text-[var(--text-secondary)]">
          담당: <span className="font-semibold">{owner}</span> · 본문 미구현 스텁
        </p>
        {note && (
          <p className="mt-2 text-[length:var(--text-sm)] text-[var(--text-muted)]">
            {note}
          </p>
        )}
      </div>
    </Section>
  );
}
