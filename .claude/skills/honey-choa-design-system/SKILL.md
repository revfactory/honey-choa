---
name: honey-choa-design-system
description: "꿀초아tv 댄스 교육 사이트의 디자인 시스템 — 컬러 토큰, 타이포그래피, 간격, 모션 언어, 금지 목록. UI 스타일링, 컬러 선택, 디자인 토큰, 비주얼 컨셉, 모션 방향, 디자인 수정·리뉴얼 작업 시 반드시 이 스킬을 사용할 것. 스타일 값을 임의로 정하기 전에 항상 이 시스템을 먼저 확인하라. 모션의 구현 코드는 interactive-motion 영역."
---

# Honey-Choa Design System

> 단일 진실원(single source of truth). frontend/ui/motion 에이전트는 여기 토큰을 그대로 `:root`에 정의해 쓴다.
> 상세 근거·대비 검증표·인계 메모는 `_workspace/02_design_system.md` 참조.
> Phase 2 확정(2026-06-11): "Stage Light" 토큰명을 유지하고 값 정밀화 + 라이트 모드·시맨틱·열기(heat) 토큰 확장.

## 비주얼 컨셉: "Stage Light, Latin Heat"

어두운 무대에 꿀빛 스포트라이트가 떨어지고, 그 안에서 라틴 댄스의 열기가 피어오른다. 다크가 기본, 라이트는 접근성 토글.

- **꿀(honey/amber)** = 채널명 "꿀초아"의 고유 자산. 메인 액센트. 따뜻함·입문자 환대.
- **열기(heat/coral)** = 바차타·살사의 관능과 리듬. 라이브·battle·열정의 기능적 액센트.
- **무대(warm black)** = 순흑이 아닌 웜 블랙. 썸네일(콘텐츠 90%)을 주인공으로. UI는 무채색 + 단일 꿀 액센트로 절제.
- 데이터 근거: `data/curated.json` 1,634개 중 78% bachata, 나머지 salsa/zouk. UI가 화려하면 썸네일과 싸운다.

## 금지 목록 (제네릭 AI 미학 차단)

1. 보라→파랑 그라데이션 배경, 범용 글래스모피즘 카드 남발
2. 이모지 아이콘(✨🚀💃 등) — 아이콘은 라인 스타일 SVG로
3. 의미 없는 스톡 일러스트, "Lorem ipsum"성 영문 장식 문구
4. 모든 요소에 동일한 radius·그림자(위계 상실) — thumb/card/chip/badge 분리
5. 다크 모드에서 box-shadow로 elevation(안 보임) → 글로우·표면색 단계 사용
6. UI를 화려하게 채색해 썸네일과 경쟁 — UI는 무채색 무대 + 단일 꿀 액센트
7. heat/rose/mint/sky를 장식으로 남발 — 장르·난이도·상태 의미가 있을 때만
8. 빠르게 번쩍이거나 회전하는 배경 입자 — 꿀의 점성(느림)이 정체성
9. 가는 글씨에 `--honey-400` 텍스트(번짐) — 18px+ 또는 bold만
10. 임의 hex 인라인 추가 — 토큰을 추가하고 대비표를 갱신

## 컬러 토큰 — 다크(기본)

```css
:root {
  /* 무대 (웜 블랙) */
  --stage-950: #0A0908;   /* 페이지 배경 */
  --stage-900: #141210;   /* 섹션 배경 */
  --stage-850: #191613;   /* 중간 표면 */
  --stage-800: #1E1B17;   /* 카드 표면 */
  --stage-750: #252119;   /* 카드 호버 표면 */
  --stage-700: #2B2722;   /* 경계선, 분리선 */
  --stage-600: #3A352E;   /* 강한 경계선, 비활성 보더 */

  /* 꿀 (브랜드 메인 액센트) */
  --honey-200: #FFE3A8;   /* 최상위 하이라이트 */
  --honey-300: #FFD479;   /* 글로우 중심부, 호버 하이라이트, 본문 링크 */
  --honey-400: #FFB938;   /* 주 액센트 — CTA, 활성, 포커스 링 */
  --honey-500: #F59E0B;   /* 호버, 강조 보더, 진행바 */
  --honey-600: #C97E08;   /* pressed */
  --honey-glow: rgba(255, 185, 56, 0.15);        /* 배경 글로우, 스포트라이트 */
  --honey-glow-strong: rgba(255, 185, 56, 0.28); /* 호버 글로우 보더 */

  /* 열기 (라틴 보조 — 기능적 용도만). coral-400은 heat-400의 별칭 유지 */
  --heat-400:  #FF6B5E;   /* advanced 뱃지, 라이브, battle */
  --coral-400: #FF6B5E;   /* = heat-400 (하위호환 별칭) */
  --heat-500:  #F0473A;   /* 호버, 라이브 도트 */
  --heat-glow: rgba(255, 107, 94, 0.16);
  --rose-400:  #FF8BA0;   /* 관능 포인트 — 데코 라인·그라데이션 보조만 */

  /* 기능 보조 */
  --mint-400: #4ADE80;    /* beginner 뱃지, 성공 */
  --sky-400:  #5AB9F0;    /* zouk 장르, 정보 */

  /* 시맨틱 */
  --success: #4ADE80;
  --warning: #FFB938;     /* 배경 위 텍스트는 --text-on-honey */
  --danger:  #FF6B5E;
  --info:    #5AB9F0;

  /* 텍스트 (stage-950 기준 대비 검증) */
  --text-primary:   #F5F1EA;   /* 17.0:1 */
  --text-secondary: #B5ADA1;   /* 8.6:1 */
  --text-muted:     #847D72;   /* 5.0:1 (AA) */
  --text-on-honey:  #1A1408;   /* 꿀 배경 위 11:1 */
  --text-link:      #FFD479;   /* 11.5:1 */

  /* 표면 유틸 */
  --overlay-scrim: rgba(10, 9, 8, 0.72);
  --thumb-veil: linear-gradient(180deg, transparent 40%, rgba(10,9,8,0.85) 100%);
}
```

## 컬러 토큰 — 라이트(보조, `[data-theme="light"]`)

```css
[data-theme="light"] {
  --stage-950: #FBF7F0; --stage-900: #F4EEE3; --stage-800: #FFFFFF;
  --stage-750: #FFFBF3; --stage-700: #E7DFD0; --stage-600: #D2C8B6;
  --honey-400: #E08C00; --honey-500: #C97E08;
  --honey-glow: rgba(224,140,0,0.12); --honey-glow-strong: rgba(224,140,0,0.22);
  --heat-400: #E0483B; --coral-400: #E0483B; --mint-400: #1F9D52; --sky-400: #1E84C4;
  --text-primary: #1C1813; --text-secondary: #575147; --text-muted: #7A7264;
  --text-on-honey: #1A1408; --text-link: #B45A00;
}
```

규칙: 본문은 `--text-*`만. `--honey-400` 텍스트는 18px+ 또는 bold만. 임의 hex 금지 — 토큰 추가 후 `_workspace/02_design_system.md` 대비표 갱신.

## 타이포그래피

```css
:root {
  --font-display: "Paperlogy", "Pretendard Variable", sans-serif;
  --font-body:    "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-num:     "Pretendard Variable", system-ui, sans-serif;

  --text-hero: clamp(2.5rem, 6vw, 4.5rem);     /* lh 1.08, ls -0.03em, w800 */
  --text-h1:   clamp(2rem, 4.5vw, 3rem);       /* lh 1.15, ls -0.02em, w800 */
  --text-h2:   clamp(1.625rem, 3.5vw, 2.25rem);/* lh 1.2, ls -0.02em, w700 */
  --text-h3:   1.25rem;                         /* lh 1.4, w700 */
  --text-lg:   1.125rem;                        /* lh 1.6, w500 */
  --text-base: 1rem;                            /* lh 1.6, w400 */
  --text-sm:   0.875rem;                        /* lh 1.5, w400 — 카드 메타 */
  --text-xs:   0.75rem;                         /* lh 1.4, w600 — 뱃지·라벨 */
}
```

- 웨이트: 400 본문 / 500 강조 / 600 라벨·뱃지 / 700 소제목 / 800 헤드라인. 한글은 위계를 크기+색으로 먼저, 굵기는 보조.
- 한글 폰트: `Pretendard Variable` woff2 **subset** + `font-display: swap` 필수(전체 1MB+ 금지). self-host + hero weight만 preload.
- 숫자(조회수·재생시간): `font-variant-numeric: tabular-nums`.
- Paperlogy 수급 불가 시 Pretendard 800 대체(display가 빌드 막으면 안 됨). hero 2줄 초과 금지.

## 간격·Radius·글로우·레이어

```css
:root {
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-6:24px; --space-8:32px; --space-12:48px; --space-16:64px;
  --space-24:96px; --space-32:128px;
  --section-py-desktop:96px; --section-py-mobile:64px;
  --content-max:1280px; --gutter:clamp(16px,4vw,40px);

  --radius-thumb:12px; --radius-card:16px; --radius-chip:9999px;
  --radius-badge:6px; --radius-input:10px;

  --glow-sm:0 0 0 1px var(--stage-700);
  --glow-honey:0 0 24px var(--honey-glow), 0 0 0 1px var(--honey-glow-strong);
  --glow-card-hover:0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px var(--honey-glow-strong);
  --shadow-sm:0 1px 2px rgba(28,24,19,0.06);   /* 라이트 전용 */
  --shadow-md:0 4px 16px rgba(28,24,19,0.10);  /* 라이트 전용 */

  --z-base:0; --z-card-hover:1; --z-sticky-nav:100; --z-dropdown:200;
  --z-overlay:300; --z-modal:400; --z-toast:500;
}
```

다크 elevation은 표면색 단계(stage-800→750) + 글로우 보더로. box-shadow는 라이트 전용.

## 모션 언어 (방향·토큰만 — 구현은 interactive-motion)

```css
:root {
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);    /* expo-out, 등장 */
  --ease-exit:  cubic-bezier(0.7, 0, 0.84, 0);
  --ease-hover: ease-out;
  --ease-beat:  cubic-bezier(0.34, 1.56, 0.64, 1); /* 살짝 바운스(리듬) */
  --dur-micro:0.2s; --dur-enter:0.6s; --dur-page:0.4s; --dur-ambient:9s;
  --motion-lift:-4px; --motion-scale-beat:1.03; --motion-stagger:60ms;
}
```

| 패턴 | 성격 | 이징/시간 | 용도 |
|------|------|----------|------|
| **Spotlight** | 커서/포커스 따라가는 radial 꿀 글로우 | `--ease-hover` / lerp 추적 | 히어로, 카드 호버 |
| **Honey Flow** | 점성 있는 느린 유체 곡선 | 선형 루프 / `--dur-ambient`+ | 배경 앰비언트 |
| **Beat Pulse** | 박자감 스케일 1.0→1.03 | `--ease-beat` / 0.6s | CTA, 재생 버튼 |
| **Stage Reveal** | 아래서 위로 + 페이드 | `--ease-enter` / `--dur-enter` | 스크롤 진입 |
| **Rhythm Stagger** | 60ms 시차 순차 등장 | `--ease-enter` / `--dur-enter` | 그리드·캐러셀 |

- 배경: 느리게(점성), 빠른 입자·번쩍임 금지. `--honey-glow` 중심 + `--heat-glow` 5~10%. 히어로에만 앰비언트+Spotlight, 그 외 섹션 정적.
- 60fps 사수: `transform`/`opacity`만. 무거우면 motion-engineer와 협의해 대체. 모든 모션 `prefers-reduced-motion` 폴백 필수.

## 컴포넌트 규약

- **영상 카드(16:9)**: `--stage-800` 표면 + radius card, 썸네일 radius thumb. 호버 `translateY(-4px)`+`--glow-card-hover`+썸네일 1.04. 제목 2줄 클램프, 메타 `--text-sm`/`--text-muted`. 좌상단 뱃지 1개.
- **숏츠 카드(9:16)**: 썸네일이 전면, 하단 `--thumb-veil` 위 제목 오버레이. 모바일 scroll-snap 캐러셀. lazy-load + 가상 스크롤(1,425개).
- **필터칩**: radius chip. 기본 투명+`--stage-600` 보더, 활성 `--honey-400` 배경+`--text-on-honey`. 장르칩 좌측 6px 도트.
- **버튼**: primary 꿀 배경+`--text-on-honey`; secondary 투명+꿀 보더; ghost 투명. 높이 44px+, 포커스 `--honey-400` 2px 아웃라인.
- **뱃지** (색+텍스트 병기): 난이도 beginner=mint/"입문", intermediate=honey/"중급", advanced=heat/"고급". type은 무채색 `--stage-700`(battle만 heat 보더). 배경은 해당색 16% 틴트.
- **네비**: sticky `--stage-950` 88%+blur(12px), 활성 `--honey-300`+2px honey 인디케이터. 스크롤 다운 시 72→56px 축소.

## 장르 색 매핑 (`data/curated.json` genre와 1:1)

bachata→honey · salsa→heat · zouk→sky · latin_pop→rose · etc→muted
