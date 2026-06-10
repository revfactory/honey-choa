import { Section } from "@/components/common/Section";
import { Button } from "@/components/common/Button";

// 404 — copy_deck §10.1.
export default function NotFound() {
  return (
    <Section>
      <div className="flex flex-col items-center justify-center gap-[var(--space-4)] py-[var(--space-24)] text-center">
        <h1 className="text-[length:var(--text-h2)] font-bold text-[var(--text-primary)]">
          찾는 무대가 비어 있어요
        </h1>
        <p className="max-w-md text-[length:var(--text-base)] text-[var(--text-secondary)]">
          이 영상 또는 트랙을 찾을 수 없어요. 주소를 다시 확인하거나, 아래에서 다시 시작해요.
        </p>
        <div className="mt-2 flex gap-[var(--space-3)]">
          <Button href="/">홈으로</Button>
          <Button href="/library" variant="secondary">
            라이브러리 둘러보기
          </Button>
        </div>
      </div>
    </Section>
  );
}
