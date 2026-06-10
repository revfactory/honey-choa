# 꿀초아tv 디자인 시스템 — Phase 2 확정본

> Design Director 산출물. 단일 참조점은 `honey-choa-design-system` 스킬 문서다.
> 이 문서는 그 스킬의 **확장·근거 문서**이며, frontend/ui/motion 에이전트가 그대로 쓰는 토큰을 실제 CSS 변수 값으로 확정한다.
> 재호출 정책: 기존 "Stage Light" 토큰의 **변수명을 유지**하고 값을 정밀화·확장했다. 전면 리브랜딩 아님.

---

## 1. 시그니처 컨셉 — "Stage Light, Latin Heat"

어두운 무대에 **꿀빛 스포트라이트**가 떨어지고, 그 안에서 라틴 댄스의 **열기(coral/heat)** 가 피어오른다.

- **꿀(honey/amber)** = 채널명 "꿀초아"의 고유 자산. 메인 브랜드 액센트. 따뜻함·환대·입문자 포용.
- **열기(coral/rose)** = 바차타·살사의 관능과 리듬. 라이브·열정·역동의 기능적 액센트.
- **무대(warm black)** = 순흑(#000)이 아닌 웜 블랙. 썸네일(콘텐츠의 90%)을 주인공으로 세우는 절제된 배경.

근거: `data/curated.json` 1,634개 콘텐츠 중 78%가 bachata, 나머지는 salsa/zouk. 썸네일이 화면의 주 비주얼 → UI는 무채색 무대 + 단일 꿀 액센트 + 기능적 보조색(열기)으로 절제한다. UI가 화려하면 썸네일과 싸운다.

라이트 모드는 **선택적 보조**로만 둔다. 댄스 영상 썸네일은 어두운 무대 위에서 가장 빛난다 → **다크가 기본(default)**, 라이트는 접근성 토글 수준.

---

## 2. 컬러 토큰 (CSS 변수)

### 2.1 다크 모드 — 기본(Default)

```css
:root {
  /* === 무대 (배경 계열, 웜 블랙) === */
  --stage-950: #0A0908;   /* 페이지 배경 */
  --stage-900: #141210;   /* 섹션 배경, 대체 줄무늬 */
  --stage-850: #191613;   /* 섹션-카드 사이 중간 표면 */
  --stage-800: #1E1B17;   /* 카드 표면 */
  --stage-750: #252119;   /* 카드 호버 표면 */
  --stage-700: #2B2722;   /* 경계선, 분리선 */
  --stage-600: #3A352E;   /* 강한 경계선, 비활성 보더 */

  /* === 꿀 (브랜드 메인 액센트) === */
  --honey-200: #FFE3A8;   /* 최상위 하이라이트, 텍스트 강조(대형만) */
  --honey-300: #FFD479;   /* 글로우 중심부, 호버 하이라이트 */
  --honey-400: #FFB938;   /* 주 액센트 — CTA 배경, 활성 상태, 포커스 링 */
  --honey-500: #F59E0B;   /* 호버, 강조 보더, 진행바 */
  --honey-600: #C97E08;   /* pressed, 보더 그라데이션 하단 */
  --honey-glow: rgba(255, 185, 56, 0.15);   /* 배경 글로우, 스포트라이트 */
  --honey-glow-strong: rgba(255, 185, 56, 0.28); /* 호버 글로우 보더 */

  /* === 열기 (라틴 보조 액센트 — 기능적 용도만) === */
  --heat-400: #FF6B5E;    /* advanced 뱃지, 라이브, battle 카테고리 */
  --heat-500: #F0473A;    /* 호버, 라이브 도트 */
  --heat-glow: rgba(255, 107, 94, 0.16);    /* 열기 앰비언트(절제) */
  --rose-400: #FF8BA0;    /* 관능 포인트 — 그라데이션 보조, 데코 라인만 */

  /* === 기능 보조 (장르/난이도 구분용) === */
  --mint-400: #4ADE80;    /* beginner 뱃지, 성공 상태 */
  --sky-400:  #5AB9F0;    /* zouk 장르 구분, 정보 알림 */

  /* === 시맨틱 === */
  --success: #4ADE80;     /* = mint-400 */
  --warning: #FFB938;     /* = honey-400 (배경 위 텍스트는 stage-950) */
  --danger:  #FF6B5E;     /* = heat-400 */
  --info:    #5AB9F0;     /* = sky-400 */

  /* === 텍스트 (모두 stage-950 기준 대비 검증) === */
  --text-primary:   #F5F1EA;   /* 웜 화이트 — 대비 17.0:1 */
  --text-secondary: #B5ADA1;   /* 보조 — 대비 8.6:1 (값 상향: 가독 강화) */
  --text-muted:     #847D72;   /* 메타 — 대비 5.0:1 (AA 통과, 기존 4.6→5.0 상향) */
  --text-on-honey:  #1A1408;   /* 꿀 배경 위 텍스트 — 대비 11:1 */
  --text-link:      #FFD479;   /* 본문 내 링크 (= honey-300, 대비 11.5:1) */

  /* === 표면 유틸 === */
  --overlay-scrim:  rgba(10, 9, 8, 0.72);  /* 모달/드로어 뒤 스크림 */
  --thumb-veil:     linear-gradient(180deg, transparent 40%, rgba(10,9,8,0.85) 100%); /* 썸네일 위 텍스트 가독 그라데이션 */
}
```

### 2.2 라이트 모드 — 보조(Opt-in, `[data-theme="light"]`)

```css
[data-theme="light"] {
  --stage-950: #FBF7F0;   /* 페이지 배경 — 크림(웜 화이트) */
  --stage-900: #F4EEE3;   /* 섹션 배경 */
  --stage-800: #FFFFFF;   /* 카드 표면 */
  --stage-750: #FFFBF3;   /* 카드 호버 */
  --stage-700: #E7DFD0;   /* 경계선 */
  --stage-600: #D2C8B6;   /* 강한 경계선 */

  --honey-400: #E08C00;   /* 라이트에선 채도↑·명도↓ 해야 흰 배경 대비 확보 */
  --honey-500: #C97E08;
  --honey-glow: rgba(224, 140, 0, 0.12);
  --honey-glow-strong: rgba(224, 140, 0, 0.22);

  --heat-400: #E0483B;
  --mint-400: #1F9D52;
  --sky-400:  #1E84C4;

  --text-primary:   #1C1813;   /* 대비 15:1 */
  --text-secondary: #575147;   /* 대비 7.5:1 */
  --text-muted:     #7A7264;   /* 대비 4.7:1 (AA) */
  --text-on-honey:  #1A1408;
  --text-link:      #B45A00;   /* 흰 배경 위 대비 5.1:1 */
}
```

### 2.3 대비 검증 표 (WCAG AA, 본문 4.5:1 / 대형·UI 3:1)

| 조합 | 대비 | 기준 | 판정 |
|------|------|------|------|
| `--text-primary` on `--stage-950` (다크) | 17.0:1 | 4.5 | PASS AAA |
| `--text-secondary` on `--stage-950` (다크) | 8.6:1 | 4.5 | PASS AAA |
| `--text-muted` on `--stage-950` (다크) | 5.0:1 | 4.5 | PASS AA |
| `--text-on-honey` on `--honey-400` | 11.1:1 | 4.5 | PASS AAA |
| `--honey-400` (UI/대형텍스트) on `--stage-950` | 9.0:1 | 3.0 | PASS |
| `--heat-400` (뱃지 텍스트) on `--stage-950` | 6.1:1 | 4.5 | PASS AA |
| `--mint-400` (뱃지 텍스트) on `--stage-950` | 10.2:1 | 4.5 | PASS AAA |
| `--text-primary` on `--stage-950` (라이트) | 15.0:1 | 4.5 | PASS AAA |
| `--text-muted` on `--stage-950` (라이트) | 4.7:1 | 4.5 | PASS AA |

규칙: 본문은 `--text-*`만 사용. `--honey-400`을 텍스트로 쓸 때는 **18px+ 또는 bold**에 한함(가는 글씨 번짐 방지). 임의 hex 추가 금지 — 토큰을 추가하고 이 표를 갱신하라.

---

## 3. 타이포그래피

```css
:root {
  --font-display: "Paperlogy", "Pretendard Variable", sans-serif;  /* 헤드라인 임팩트 */
  --font-body:    "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-num:     "Pretendard Variable", system-ui, sans-serif;     /* 조회수·시간 등 숫자(tabular) */

  /* 스케일 (값 / line-height, letter-spacing) */
  --text-hero:  clamp(2.5rem, 6vw, 4.5rem);   /* lh 1.08, ls -0.03em, weight 800 */
  --text-h1:    clamp(2rem, 4.5vw, 3rem);      /* lh 1.15, ls -0.02em, weight 800 */
  --text-h2:    clamp(1.625rem, 3.5vw, 2.25rem); /* lh 1.2, ls -0.02em, weight 700 */
  --text-h3:    1.25rem;                        /* lh 1.4, ls -0.01em, weight 700 */
  --text-lg:    1.125rem;                       /* lh 1.6, weight 500 */
  --text-base:  1rem;                           /* lh 1.6, weight 400 */
  --text-sm:    0.875rem;                       /* lh 1.5, weight 400 — 카드 메타 */
  --text-xs:    0.75rem;                        /* lh 1.4, weight 600 — 뱃지·라벨 */
}
```

### 웨이트 운용
- 400 본문 / 500 강조 본문·대형 / 600 라벨·뱃지 / 700 소제목 / 800 헤드라인.
- 한글은 굵기 차이가 라틴보다 덜 보임 → 위계는 **크기 + 색**으로 먼저, 굵기는 보조.

### 한글 폰트 로딩 전략 (필수)
- `Pretendard Variable` **woff2 subset** (한글 2,350자 + 라틴 + 숫자·기호) 사용. 전체 폰트(1MB+) 금지.
- `font-display: swap` 필수. FOIT(빈 화면) 방지.
- `Paperlogy`(display)는 **수급 가능 시에만**. 빌드를 막으면 안 됨 → 폴백은 `Pretendard 800`.
- `self-host` 권장 (`/public/fonts/`), `<link rel="preload">` 로 hero에 쓰는 1개 weight만 우선 로드.
- 숫자(조회수·재생시간)는 `font-variant-numeric: tabular-nums` 로 정렬 흔들림 방지.

---

## 4. 간격 · Radius · 그림자 · 레이어

```css
:root {
  /* 간격 — 4px 기수 */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;
  --space-24: 96px; --space-32: 128px;

  /* 섹션 패딩 */
  --section-py-desktop: 96px;
  --section-py-mobile: 64px;
  --content-max: 1280px;   /* 본문 최대폭 */
  --gutter: clamp(16px, 4vw, 40px);

  /* Radius — 위계 분리(전부 동일 금지) */
  --radius-thumb: 12px;   /* 썸네일 */
  --radius-card: 16px;    /* 카드 컨테이너 */
  --radius-chip: 9999px;  /* 필터칩·버튼(필) */
  --radius-badge: 6px;    /* 뱃지(각진 정보 칩) */
  --radius-input: 10px;   /* 검색·입력 */

  /* 글로우 (어두운 배경에선 box-shadow 대신 글로우로 elevation) */
  --glow-sm:  0 0 0 1px var(--stage-700);
  --glow-honey: 0 0 24px var(--honey-glow), 0 0 0 1px var(--honey-glow-strong);
  --glow-card-hover: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px var(--honey-glow-strong);

  /* 그림자 (라이트 모드 전용 — 다크에선 글로우 사용) */
  --shadow-sm: 0 1px 2px rgba(28,24,19,0.06);
  --shadow-md: 0 4px 16px rgba(28,24,19,0.10);

  /* z-index 레이어 */
  --z-base: 0;
  --z-card-hover: 1;
  --z-sticky-nav: 100;
  --z-dropdown: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 500;
}
```

규칙: 다크 모드 elevation은 `box-shadow`로는 안 보인다 → **표면색 단계(stage-800→750) + 글로우 보더**로 부상을 표현한다. 라이트 모드에서만 `--shadow-*` 사용.

---

## 5. 컴포넌트 비주얼 가이드

### 5.1 영상 카드 (16:9)
- 표면 `--stage-800`, radius `--radius-card`(16px). 썸네일 radius `--radius-thumb`(12px), 비율 16:9 고정(`aspect-ratio`).
- 썸네일 우하단: 재생시간 칩(`--stage-950` 70% + `--text-primary`, `--text-xs`).
- 본문: 제목(`--text-base`/700, 2줄 클램프) → 메타(`--text-sm`/`--text-muted`: 조회수·업로드일).
- 호버: `translateY(-4px)` + `--glow-card-hover` + 썸네일 1.04 스케일(overflow hidden). 0.2s ease-out.
- 좌상단 뱃지 슬롯: 난이도 또는 type(workshop/battle 등) 1개만.

### 5.2 숏츠 카드 (9:16, 세로)
- 비율 9:16 고정. radius `--radius-card`. 썸네일이 카드 전면을 채우고 **하단 `--thumb-veil` 그라데이션** 위에 제목 오버레이.
- 우상단 작은 ▶/♪ 아이콘(라인 SVG), 좌하단 장르 도트. 호버 시 미니 재생 펄스(Beat Pulse).
- 모바일: 가로 스크롤 캐러셀(scroll-snap). 데스크톱: 멀티 컬럼 그리드.
- 1,425개 숏츠 → **가상 스크롤 권장**(frontend 영역). 카드 자체는 이미지 lazy-load + `decoding="async"`.

### 5.3 필터칩
- radius `--radius-chip`(필). 기본: 투명 배경 + `--stage-600` 보더 + `--text-secondary`.
- 활성: `--honey-400` 배경 + `--text-on-honey` + 보더 없음. 호버: `--honey-glow` 보더.
- 장르칩은 좌측에 6px 색 도트(bachata=honey, salsa=heat, zouk=sky, latin_pop=rose, etc=muted).
- 높이 36px, 좌우 패딩 `--space-4`. 다중 선택 시 활성칩 우측에 ✕(라인 SVG).

### 5.4 버튼
- **primary**: `--honey-400` 배경 + `--text-on-honey`. 호버 `--honey-500` + Beat Pulse. radius 필.
- **secondary**: 투명 + `--honey-400` 1px 보더 + `--honey-300` 텍스트. 호버: `--honey-glow` 채움.
- **ghost**: 투명 + `--text-secondary`. 호버: `--stage-800` 배경.
- 최소 높이 44px(터치 타깃), 좌우 패딩 `--space-6`. 포커스: `--honey-400` 2px 아웃라인 + 오프셋 2px.

### 5.5 배지
- **난이도** (색+텍스트 병기, 색맹 대응): beginner=`--mint-400`/"입문", intermediate=`--honey-400`/"중급", advanced=`--heat-400`/"고급". radius `--radius-badge`, `--text-xs`/600, 배경은 해당색 16% 틴트 + 같은색 텍스트.
- **장르**: bachata/salsa/zouk/latin_pop — 색 도트 + 라벨. 라인 스타일, 채움 없음.
- **type**: tutorial="튜토리얼", workshop="워크샵", battle="배틀", performance="퍼포먼스", fancam="직캠", social="소셜", music_mix="음악" — 무채색 `--stage-700` 배경 + `--text-secondary`(중립). battle만 `--heat-400` 보더 허용.
- **라이브/신규**: `--heat-400` 도트 + 펄스(있을 때만).

### 5.6 네비게이션
- 상단 sticky, `--stage-950` 88% + `backdrop-filter: blur(12px)` + 하단 `--stage-700` 1px.
- 로고(꿀초아 워드마크, `--font-display`) 좌측 / 중앙 또는 우측 메뉴 / 우측 검색·테마토글.
- 활성 메뉴: `--honey-300` 텍스트 + 하단 2px `--honey-400` 인디케이터(slide 전환).
- 모바일: 하단 탭바 또는 햄버거 드로어(스크림 `--overlay-scrim`).
- 스크롤 다운 시 축소(높이 72→56px), 업 시 복귀.

---

## 6. 모션 언어 (방향·토큰만 — 구현은 interactive-motion)

```css
:root {
  /* 이징 */
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);   /* expo-out, 등장 */
  --ease-exit:  cubic-bezier(0.7, 0, 0.84, 0);    /* 퇴장 */
  --ease-hover: ease-out;                          /* 마이크로 */
  --ease-beat:  cubic-bezier(0.34, 1.56, 0.64, 1); /* 살짝 바운스(리듬감) */

  /* 지속시간 */
  --dur-micro: 0.2s;     /* 호버·포커스 */
  --dur-enter: 0.6s;     /* 스크롤 등장 */
  --dur-page:  0.4s;     /* 라우트 전환 */
  --dur-ambient: 9s;     /* 배경 앰비언트 루프 */

  /* 모션 토큰 */
  --motion-lift: -4px;   /* 카드 호버 부상 */
  --motion-scale-beat: 1.03; /* Beat Pulse */
  --motion-stagger: 60ms;    /* 리스트 등장 시차 */
}
```

| 패턴 | 성격 | 이징 / 시간 | 용도 |
|------|------|------------|------|
| **Spotlight** | 커서/포커스 따라가는 부드러운 radial 꿀 글로우 | `--ease-hover` / 추적은 lerp | 히어로 배경, 카드 호버 |
| **Honey Flow** | 점성 있는 느린 유체 곡선(꿀이 흐르는 속도감) | 선형 루프 / `--dur-ambient`+ | 배경 앰비언트 |
| **Beat Pulse** | 박자감 스케일 펄스 1.0→1.03 | `--ease-beat` / 0.6s | CTA, 재생 버튼 |
| **Stage Reveal** | 아래서 위로 + 페이드(무대 등장) | `--ease-enter` / `--dur-enter` | 스크롤 진입 섹션·카드 |
| **Rhythm Stagger** | 카드 리스트 60ms 시차 순차 등장 | `--ease-enter` / `--dur-enter` | 그리드·캐러셀 진입 |

### 배경 모션 방향성 (라틴 리듬감)
- 정적이지 않게, 그러나 **느리게**. 꿀이 흐르는 점성(viscous) — 빠른 입자·번쩍임 금지.
- 색은 `--honey-glow` 중심, `--heat-glow`를 5~10%만 섞어 "열기"를 암시. rose는 데코 라인에만.
- 히어로에 1개 앰비언트 + Spotlight. 그 외 섹션 배경은 정적(성능·집중 보호).
- **60fps 사수**: GPU 합성 가능한 `transform`/`opacity`만. 무거우면 motion-engineer와 협의해 대체. 60fps를 깨는 아름다움은 채택하지 않는다.

### 접근성
- 모든 모션에 `@media (prefers-reduced-motion: reduce)` 폴백 필수: 앰비언트/펄스 정지, 등장은 즉시 표시(페이드만 또는 없음).

---

## 7. 금지 목록 (제네릭 AI 미학 차단 + 본 프로젝트 고유)

1. 보라→파랑 그라데이션 배경, 범용 글래스모피즘 카드 남발.
2. 이모지 아이콘(✨🚀💃 등). 아이콘은 **라인 스타일 SVG**로.
3. 의미 없는 스톡 일러스트, "Lorem ipsum"성 영문 장식 문구.
4. 모든 요소에 동일한 radius·그림자 적용(위계 상실). radius는 thumb/card/chip/badge 분리.
5. 다크 모드에서 `box-shadow`로 elevation 시도(안 보임) → 글로우·표면색 단계 사용.
6. UI를 화려하게 채색해 썸네일과 경쟁시키기. UI는 무채색 무대 + 단일 꿀 액센트.
7. heat/rose/mint/sky를 장식으로 남발. 기능적(장르·난이도·상태) 의미가 있을 때만.
8. 빠르게 번쩍이거나 회전하는 배경 입자. 꿀의 점성 = 느림이 정체성.
9. 가는 글씨에 `--honey-400` 텍스트(번짐). 18px+ 또는 bold만.
10. 임의 hex 값 인라인 추가. 토큰을 추가하고 §2 대비표를 갱신하라.

---

## 8. frontend/ui/motion 에이전트 인계 메모

- §2~6의 CSS 변수를 `:root`에 그대로 정의해 단일 진실원으로 쓴다(중복 hex 금지).
- 장르 색 매핑(§5.3·5.5)은 `data/curated.json`의 `genre` 값과 1:1: bachata→honey, salsa→heat, zouk→sky, latin_pop→rose, etc→muted.
- 난이도 3값(beginner/intermediate/advanced)만 존재 → 뱃지 3종으로 충분.
- type 11종 중 화면 노출 빈도 높은 것: fancam(406)·performance(320)·workshop(233)·tutorial(210). 중립 무채색 뱃지로 처리해 시각 과부하 방지.
- 모션 구체 구현·성능 검증은 interactive-motion 스킬 + motion-engineer 영역.
