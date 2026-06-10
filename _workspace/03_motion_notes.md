# 03 · 모션 구현 노트 (motion-engineer)

**작성:** motion-engineer · Phase 3
**상태:** `npm run build` ✓ (1,615 static pages), `npm run typecheck` ✓ (0 errors)
**소유 경계:** `src/components/motion/**` 만. sections/player/globals.css 미수정.

---

## 1. 제공 컴포넌트 (배럴: `@/components/motion`)

| 컴포넌트 | 패턴 | 용도 | 슬롯 |
|----------|------|------|------|
| `HeroBackground` | Honey Flow + Spotlight + 무대 스크림 | 홈 히어로 앰비언트 배경 | `data-motion-slot="hero-ambient"` |
| `HoneyFlowBackground` | Honey Flow (캔버스) | 배경 단독 사용 시 | — |
| `Spotlight` | Spotlight (커서 글로우) | 히어로/섹션 단독 사용 시 | — |
| `Reveal` | Stage Reveal + Rhythm Stagger | 섹션/카드 스크롤 등장 래퍼 | 섹션·그리드 아이템 |
| `BeatPulse` | Beat Pulse | CTA·재생 버튼 박동 | `data-motion-slot="hero-cta-beat"` |
| `HoverTilt` | Honey Flow 마이크로 + 3D 틸트 | 카드 호버 인터랙션 | VideoCard/ShortsCard 래퍼 |
| `PageTransition` | 페이지 전환 페이드+슬라이드 | 라우트 본문 래퍼(선택) | layout 본문 슬롯 |
| `useReducedMotion` | — | 커스텀 모션용 훅 | — |

모든 컴포넌트 `'use client'`, transform/opacity 전용, `prefers-reduced-motion` 폴백 내장.

---

## 2. 슬롯 연결 사용법 (ui-craftsman / player-integrator)

### 히어로 배경 — `HomeHero.tsx` 의 `data-motion-slot="hero-ambient"` div 교체
```tsx
import { HeroBackground } from "@/components/motion";

// <section className="relative overflow-hidden ...">  ← 부모는 relative 유지
//   기존 정적 글로우 div(data-motion-slot="hero-ambient")를 아래로 교체:
<HeroBackground intensity={0.6} speed={0.3} />
//   본문 래퍼는 그대로 relative + z-index 위에. (HeroBackground 는 absolute inset-0, pointer-events:none)
```
HeroBackground 가 자체적으로 무대 스크림(상단 어둡게/하단 페이드)을 포함하므로 별도 오버레이 불필요.

### CTA 박동 — `hero-cta-beat` 버튼 감싸기
```tsx
import { BeatPulse } from "@/components/motion";

<BeatPulse>
  <Button href="/learn/" variant="primary">학습 시작하기</Button>
</BeatPulse>
// attention 펄스(마운트 1회)는 페이지당 1요소만: <BeatPulse attention>
```

### 스크롤 등장 — 섹션/그리드 감싸기
```tsx
import { Reveal } from "@/components/motion";

// 단일 섹션
<Reveal as="section"> <SectionHeader .../> ... </Reveal>

// 그리드 스태거(Rhythm Stagger) — index 부여
{cards.map((c, i) => (
  <Reveal key={c.videoId} index={i}>
    <VideoCard card={c} />
  </Reveal>
))}
// 8장 이후 지연 고정(마지막 카드 대기 폭주 방지). 1회 등장 후 unobserve.
```

### 카드 호버 틸트 — 카드 감싸기(선택)
```tsx
import { HoverTilt } from "@/components/motion";
<HoverTilt><VideoCard card={c} /></HoverTilt>
// VideoCard 자체 호버(translateY/글로우)와 transform 합성으로 공존. 터치는 자동 비활성.
```

### 숏츠 페이지 주의
숏츠 피드는 동시 임베드가 많아 무거운 배경 모션 금지. `HeroBackground`/`HoneyFlowBackground` 미사용.
`Reveal`(IO 기반, 경량)·`BeatPulse` 정도만 허용. 카드 틸트도 임베드 활성 시 지양.

---

## 3. props 튜닝 (디자이너 — 코드 수정 불필요)

| props | 범위 | 기본 | 효과 |
|-------|------|------|------|
| `HeroBackground.intensity` | 0~1 | 0.6 | 블롭 크기·글로우 강도. "더 화려하게"→↑, "은은하게"→↓ |
| `HeroBackground.speed` | 0~1 | 0.3 | 앰비언트 주기. 낮을수록 꿀의 점성(느림). 0.5 초과 비권장 |
| `HeroBackground.spotlight` | bool | true | 커서 추종 글로우 on/off |
| `Reveal.index` / `stagger` | — / ms | 0 / 60 | 그리드 시차. stagger 80~100이면 더 또렷 |
| `Reveal.y` | px | 24 | 진입 변위 |
| `BeatPulse.scale` | — | 1.03 | 박동 크기 |
| `HoverTilt.max` | deg | 6 | 틸트 각도(±6 이내 권장) |

---

## 4. 성능 준수 내역 (interactive-motion 헌장 대조)

1. **합성 전용 속성만** — 모든 애니메이션 transform/opacity/filter. top/left/width/margin 미사용. ✓
2. **단일 rAF 루프** — HoneyFlowBackground 캔버스는 rAF 1개. Spotlight/HoverTilt 는 각자 호버 시에만 단발 rAF, 동시 다수 미발생. ✓
3. **오프스크린 정지** — HoneyFlowBackground 는 IntersectionObserver 로 화면 밖이면 clear/draw 생략(rAF 유지, 복귀 즉시 재개). `last` 갱신으로 dt 점프 방지. ✓
4. **DPR 캡 2.0** — `Math.min(devicePixelRatio, 2)`. 3x 기기 픽셀 9배 방지. ✓
5. **reduced-motion 의무** — 모든 컴포넌트 `useReducedMotion()` 구독. HoneyFlow/HeroBackground=정적 그라데이션, Reveal/PageTransition=즉시 표시, BeatPulse/HoverTilt=transform 미적용. globals.css 전역 폴백과 정합(이중 안전). ✓
6. **품질 사다리** — HeroBackground 가 모바일(≤640px) 또는 저코어(hardwareConcurrency≤4)면 캔버스 앰비언트→정적 그라데이션으로 자동 강등(파티클 0). ✓
7. **SSR 안전** — window/navigator/document 참조 전부 useEffect/핸들러 내부 또는 `typeof window` 가드. 정적 export 빌드 통과 확인. ✓
8. **블롭 비용 설계** — 입자 수백 대신 대형 블롭 4~5개 + CSS blur(56px). "꿀은 입자가 아니라 덩어리" — 블러로 풍성함, 비용은 저렴. ✓

### 채널 정체성 번역
- Honey Flow 블롭 = 꿀(honey 4개) + 라틴 열기(coral 1개, 5~10%) 를 `lighter` 합성 → "Stage Light, Latin Heat".
- 사인/코사인 비대칭 궤도(freq 0.4~0.7) 로 안무처럼 흐르는 비반복 곡선. 한 사이클 ~12~20s(번쩍임 0).
- BeatPulse 는 `--ease-beat`(살짝 바운스)로 비트감, 무한 반복 금지(시선 점유 차단).

---

## 5. 후속/검증 메모

- 실측 프레임타임 검증: 브라우저 확장 미연결로 라이브 DevTools 측정 미수행. 구조적 보장(단일 rAF·오프스크린 정지·DPR 캡·합성 전용)으로 60fps 설계. ui-craftsman 통합 후 frontend-lead/integration-qa 가 실기기 스크롤 프레임 확인 권장.
- HoneyFlowBackground 의 `blur(56px)` 는 GPU 합성. 매우 저사양에서 무거우면 HeroBackground 가 이미 lite 강등으로 캔버스 자체를 끄므로 안전.
- PageTransition 은 선택 — layout 주입은 frontend-lead 협의 필요(현재 미주입, 컴포넌트만 제공).
