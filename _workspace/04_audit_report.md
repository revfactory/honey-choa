# 04 · 품질 감사 보고서 — 성능·접근성·SEO·반응형 (Phase 4)

**감사자:** perf-auditor (integration-qa 방법론)
**일자:** 2026-06-11
**대상:** `out/` 정적 export (1,615 페이지) + `src/**`
**빌드 상태:** `npm run build` ✓ / typecheck ✓ (인계 로그 기준)
**측정 방식:** 빌드 산출물 정적 분석 + gzip 실측 + 폰트 CDN URL 실 HTTP 검증. 라이브 Lighthouse·실기기 프레임 측정은 미수행(브라우저 미연결) — 해당 한계는 §검증 한계에 명시.

---

## 요약: 조건부 PASS — BLOCKER 1 / MAJOR 4 / MINOR 5

| # | 심각도 | 영역 | 한 줄 |
|---|--------|------|-------|
| B1 | **BLOCKER** | 번들 | 전체 데이터셋(1.89MB raw / 287KB gz)이 client JS로 출고 — library·shorts·watch First Load 393~401kB의 단일 원인 |
| M1 | MAJOR | 폰트 | Pretendard CDN URL이 실제로 **404** — 본문 폰트가 로드되지 않고 시스템 폰트로 침묵 폴백 |
| M2 | MAJOR | SEO | watch 1,604페이지 중 ~87.5%가 **meta description / og:description 부재**(데이터 빈 description 폴백 없음) |
| M3 | MAJOR | SEO | **sitemap.xml / robots.txt 부재** — 1,615 정적 라우트 색인 누락 위험 |
| M4 | MAJOR | a11y/SEO | **shorts 페이지 h1 없음** + 전 페이지 **skip-link 없음** |
| m1 | MINOR | 성능/CLS | `<img>`에 `width/height` 미지정 — 썸네일 레이아웃 시프트 가능 |
| m2 | MINOR | a11y | FilterChip 높이 36px(`h-9`) — 터치 타깃 44px 미달 |
| m3 | MINOR | 성능 | 폰트 `preload`·subset 미적용(설계 요구), `metadataBase`/canonical/og:url 부재 |
| m4 | MINOR | 성능 | polyfills 청크 39KB gz 무조건 출고(browserslist 미설정) |
| m5 | MINOR | 성능 | next/image `unoptimized` — 썸네일 원본 크기 그대로 전송(반응형 `sizes` 없음) |

---

## 1. 번들 / 로딩 측정

### 실측 청크 (gzip)
| 청크 | gz | raw | 로드 라우트 |
|------|----|----|------------|
| **765-…js** | **287 KB** | **1,889 KB** | library, shorts, watch (전 1,604개) |
| framework | 58 KB | 183 KB | 전역 |
| 4bd1b696 (react-dom) | 54 KB | 173 KB | 전역 |
| 255 | 47 KB | 174 KB | 전역 |
| polyfills | 39 KB | 113 KB | 전역 |
| main | 37 KB | 128 KB | 전역 |
| CSS (단일) | 7.6 KB | 34 KB | 전역 |

### [BLOCKER] B1 — 전체 데이터셋이 클라이언트 JS로 출고됨
- **재현:** `out/_next/static/chunks/765-1772a77178090996.js` 첫 바이트 = `...6480:(t,i,e)=>{...let a=JSON.parse('{"fetchedAt":...,"count":179,"items":[{"videoId":...`. 청크 내 `i.ytimg.com` 7,948회, `viewCount`/`publishedAt` 각 1,607회. raw 1,889KB ≈ `shorts.json`(1,794KB)+`videos.json`(373KB)+`curated.json`(471KB) 합산 규모.
- **기대:** 정적 export에서 데이터는 빌드 타임에만 소비되고, 클라이언트엔 화면에 필요한 부분집합만 props로 직렬화되어 HTML에 들어가야 한다. 초기 JS < 200KB gz 기준.
- **실제:** library/shorts/watch가 **287KB gz짜리 데이터 청크**를 추가로 받는다 → First Load 393~401kB.
- **근본 원인:** `src/lib/content.ts` 14~17행이 4개 JSON을 **모듈 최상위에서 static import**한다. 그런데 5개 `'use client'` 컴포넌트가 이 모듈에서 import한다:
  - `src/components/sections/library/LibraryBrowser.tsx:13-22` — 라벨 사전 + 정렬 유틸
  - `src/components/sections/shorts/ShortsExperience.tsx:9` — `GENRE_LABEL/COLOR/ORDER`만
  - `src/components/player/ShortsFeedClient.tsx:18` — `GENRE_LABEL/COLOR, TYPE_LABEL, formatCountKo`만
  - `src/components/sections/watch/WatchBody.tsx:13` — `formatCountKo` **한 개만**
  - `src/components/sections/shorts/ShortsOverlay.tsx:4` — `GENRE_LABEL/COLOR, TYPE_LABEL, formatCountKo`만
  - 5개 중 4개는 **순수 라벨/포맷 헬퍼만** 필요한데, 같은 모듈이 JSON을 top-level import하므로 번들러가 데이터를 트리셰이크하지 못하고 통째로 client 청크에 끌어온다(배럴 모듈 오염).
- **권고 (구현팀, 효과순):**
  1. **데이터-무관 헬퍼 분리** — `GENRE_LABEL/COLOR/ORDER, TYPE_LABEL, DIFFICULTY_LABEL, LIBRARY_TYPE_ORDER, formatCountKo/formatInt/formatDuration, SortKey` 등 JSON을 참조하지 않는 export를 신규 `src/lib/labels.ts`(또는 `content-format.ts`)로 이동. 위 4개 client 컴포넌트의 import 경로를 그쪽으로 교체. → shorts/watch에서 데이터 청크 완전 제거(예상 First Load 401kB→약 110kB).
  2. **LibraryBrowser 데이터 축소** — 현재 `app/library/page.tsx`가 `getVideos({includeUnclassified:true})`로 **롱폼 전건(약 179건)을 props 직렬화**하면서 동시에 라벨도 같은 모듈에서 끌어와 데이터 청크까지 받는다. (1)을 적용하면 라벨발 데이터 청크는 사라진다. 잔여 props 페이로드(179건)는 HTML gzip으로 흡수되나, 추가로 초기 24건만 SSR하고 나머지는 점진 로드 권장.
  3. 검증: 수정 후 `out/_next/static/chunks/` 재측정 — 765 규모 청크가 어떤 라우트에서도 참조되지 않아야 함(`grep -rl 765 out/**/index.html` 0건).

### 정적 export 적합성
- `next.config.mjs`: `output:'export'`, `images.unoptimized:true`, `trailingSlash:true` — 정적 호스팅에 적합(PASS). home은 765 미로드(108kB대 유지) 확인.

---

## 2. 폰트

### [MAJOR] M1 — Pretendard CDN URL 404 (폰트 미로드)
- **재현:** `globals.css:14` src = `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2/PretendardVariable.woff2`. 실 HTTP 검증: `404 — Couldn't find the requested file /dist/web/variable/woff2/PretendardVariable.woff2 in orioncactus/pretendard`. (대조: jsDelivr 자체는 도달 가능 — 다른 자산 200 확인. 네트워크 차단 아님.)
- **실제:** `@font-face`가 404 → 브라우저가 `var(--font-body)` 폴백 체인의 `-apple-system` 등 시스템 폰트로 침묵 렌더. 디자인 시스템이 의도한 Pretendard 타이포가 전혀 적용되지 않음.
- **기대:** Pretendard Variable woff2 로드.
- **권고:** `gh/` 경로엔 `variable/woff2/` 하위 폴더가 없다. 유효 경로로 교체:
  - 권장(self-host, 설계 요구): woff2 **subset**을 `/public/fonts/`에 두고 상대경로 + `<link rel="preload">`.
  - 즉시 핫픽스(CDN 유지 시): `https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/woff2/PretendardVariable.woff2` (npm 경로, 200 확인, 단 **2.05MB 풀 폰트**).
- **위치:** `src/app/globals.css:14`

### [MINOR] m3 — subset·preload 미적용 (설계 미달)
- design_system §3은 **woff2 subset(한글 2,350자) + preload(hero 1 weight)**를 요구. 현재는 풀 variable 폰트(2.05MB) URL + preload 없음. `layout.tsx`엔 preconnect만 존재(`layout.tsx:39`).
- `font-display: swap`은 적용됨(FOIT 방지 ✓).
- **권고:** subset woff2 self-host + `<link rel="preload" as="font" type="font/woff2" crossorigin>` 1개 weight. 위치 `globals.css:9-16`, `layout.tsx` head.

---

## 3. 이미지 / 썸네일

| 항목 | 측정 | 판정 |
|------|------|------|
| lazy loading | `VideoCard.tsx:42`·`ShortsCard.tsx:41` `loading={priority?"eager":"lazy"}` | PASS |
| decoding | 양쪽 `decoding="async"` | PASS |
| 포맷 | YouTube 썸네일(`i.ytimg.com`, webp/jpg 원본) 직접 사용 — 정적 export라 재인코딩 불가 | 허용(unoptimized) |
| LCP 우선순위 | `priority` prop으로 eager 분기 존재 | PASS(설계) |
| 폴백 | `onError` → stage 표면 + 로고(player_notes §5) | PASS |

### [MINOR] m1 — `<img>` width/height 미지정 (CLS 위험)
- **재현:** `VideoCard.tsx:39` `<img>`에 `aspect-video` 컨테이너는 있으나 `width/height` 속성 없음. `aspect-ratio`로 박스는 잡히지만 이미지 자체 intrinsic size 미지정 시 일부 브라우저·느린 로드에서 시프트 가능.
- **권고:** `<img width={정수} height={정수}>` 명시(16:9=1280×720, 9:16=720×1280). 위치 `VideoCard.tsx:39`, `ShortsCard.tsx:38`.

### [MINOR] m5 — 반응형 `sizes` 없음
- `unoptimized` + raw `<img>`라 srcset/sizes 없이 단일 원본 전송. 그리드 셀이 작아도 maxres 썸네일을 받을 수 있음. YouTube 썸네일은 고정 변형(hqdefault/maxresdefault)이라 큰 손해는 아니나, 모바일에선 `hqdefault`(480px) 변형 URL을 쓰면 바이트 절감. 위치 `resolveThumbnailUrl`(content.ts).

---

## 4. 접근성 (a11y)

| 항목 | 측정 | 판정 |
|------|------|------|
| 색 대비 | design_system §2.3 전 조합 AA+ (text-muted 5.0:1, honey UI 9.0:1 등) — 설계 검증됨 | PASS(설계) |
| 포커스 표시 | `globals.css:243` `:focus-visible{outline:2px solid honey-400; offset:2px}` | PASS |
| reduced-motion | `globals.css:250` 전역 폴백(animation/transition 0.01ms, scroll auto) + 모션 컴포넌트별 `useReducedMotion` | PASS(이중 안전) |
| main 랜드마크 | `layout.tsx` `<main id="main">` | PASS |
| 모바일 탭바 | `<nav aria-label="모바일 메뉴">`, `aria-current`, `min-h-[56px]`(>44) | PASS |
| FilterChip | `<button aria-pressed>`, 장식 도트 `aria-hidden` | PASS(기능) |
| alt | home 26/26 img에 alt 존재 | PASS |
| shorts 컨트롤 | 이전/다음/닫기 `aria-label`, 피드 `aria-label="숏츠 세로 피드"` | PASS |

### [MAJOR] M4 — shorts h1 부재 + skip-link 전무
- **재현:** `grep '<h1' out/shorts/index.html` = 0건(헤딩 자체 0). 전 페이지 `grep skip` = 0건(키보드 사용자 본문 바로가기 없음).
- **기대:** 페이지당 h1 1개, 본문 skip-link.
- **권고:** shorts에 시각적 숨김(`sr-only`) h1 "숏츠 피드" 추가. `layout.tsx` body 최상단에 `<a href="#main" class="sr-only focus:not-sr-only">본문 바로가기</a>`. 위치 `ShortsExperience.tsx`, `layout.tsx`.

### [MINOR] m2 — FilterChip 터치 타깃 36px
- **재현:** `FilterChip.tsx:39` `h-9`(36px). 터치 타깃 기준 44px 미달.
- **권고:** 칩은 시각 높이 36 유지하되 `min-h-[44px]` + 세로 패딩 또는 히트영역 확장(`py`로 44 확보). 위치 `FilterChip.tsx:39`. (design_system §5.3이 36px를 명시하므로 디자인팀과 히트영역 확장 방식 합의 권장.)

---

## 5. SEO

| 항목 | 측정 | 판정 |
|------|------|------|
| 페이지별 title | home/learn/about/library/shorts 전부 고유(template `%s · 꿀초아tv`) | PASS |
| watch title | 영상 제목 + 채널, og:title/twitter:title/og:image(maxres)/twitter:image 출력 | PASS |
| 시맨틱 헤딩 | home h1×1·h2×4·h3×26 위계 정상 / watch h1×1 | PASS(shorts 제외) |
| lang | `<html lang="ko">` | PASS |
| viewport/themeColor | 설정됨 | PASS |

### [MAJOR] M2 — watch ~87.5% meta description 부재
- **재현:** 샘플 watch 8건 전부 `<meta name="description">`·`og:description` 0건. 원인: 데이터 1,604건 중 **1,404건(87.5%)이 빈 description**(`videos.json`/`shorts.json` 실측). `generateMetadata`(watch page `:24`)는 `card.description.slice(0,120)` → 빈 문자열 → Next가 description 태그 자체를 생략.
- **기대:** 모든 색인 페이지에 고유 meta description.
- **권고:** 빈 description 폴백을 합성 — 예: `card.description?.slice(0,120) || \`${card.title} — ${GENRE_LABEL[card.genre]} ${TYPE_LABEL[card.type]} · 꿀초아tv 라틴댄스\``. og:description도 동일 폴백. 위치 `src/app/watch/[videoId]/page.tsx:24-25`.

### [MAJOR] M3 — sitemap.xml / robots.txt 부재
- **재현:** `out/sitemap*`·`out/robots*` 없음. 1,615 정적 라우트가 색인 진입점 없이 방치.
- **권고:** `app/sitemap.ts`(전 라우트: home/learn/[trackId]/library/shorts/about/watch/[id] 1,604건 열거)와 `app/robots.ts` 추가. 정적 export에서 두 파일 모두 빌드 생성 지원. `metadataBase` 설정 필요(아래 m3 연계). 위치 신규 `src/app/sitemap.ts`, `src/app/robots.ts`.

### [MINOR] m3(연계) — metadataBase/canonical/og:url 부재
- `layout.tsx`에 `metadataBase` 없음 → og:image는 i.ytimg 절대경로라 동작하나, canonical·og:url 미출력. 소셜 공유·중복 색인 방지 위해 `metadataBase: new URL('배포도메인')` + 페이지별 `alternates.canonical` 권장. 위치 `layout.tsx`.

---

## 6. 반응형

| 항목 | 측정 | 판정 |
|------|------|------|
| 분기 | Tailwind `md:` 브레이크포인트 사용(MobileTabBar `md:hidden` 등) | PASS |
| 모바일 탭바 터치 | `min-h-[56px]` (>44px) | PASS |
| 숏츠 풀스크린 | shorts z-modal 풀스크린, 탭바·푸터 자동 덮음(player_notes) + 세로 scroll-snap | PASS(설계) |
| gutter/max | `--gutter clamp(16~40px)`, `--content-max 1280` 토큰 | PASS |
| 모션 품질 사다리 | HeroBackground ≤640px·저코어 시 캔버스→정적 강등(motion_notes §6) | PASS(설계) |
| FilterChip 터치 | 36px (§m2) | 미달 |

모션 성능(60fps)은 구조적 보장(단일 rAF·오프스크린 정지·DPR 캡 2.0·transform/opacity 전용)이 코드/노트로 확인됨. 단 실기기 프레임 실측은 미수행(아래 한계).

---

## 검증 한계 (빈칸 금지 원칙)
- **라이브 Lighthouse / 실기기 프레임타임 미측정** — 브라우저 미연결. 성능은 빌드 산출물 gzip 실측 + 정적 분석으로 평가. 모션 60fps는 구조적 보장만 확인(motion_notes §5와 동일 한계).
- **폰트 404는 실 HTTP로 확정** — 네트워크 차단 가능성을 jsDelivr 타 자산 200 응답으로 배제함.
- **embeddable=false 폴백 경로** — 현 데이터 전건 embeddable=true라 미트리거(player_notes §6). 방어 코드 존재만 확인, 동작 미관측.
- **B1 수정 효과(401kB→~110kB)는 예측치** — 수정 후 재빌드 측정 필요.

## 회귀 기준선 (다음 감사 비교용)
- 765 데이터 청크: 287KB gz (목표: 라우트 참조 0).
- First Load: home 108kB(유지), library/shorts/watch 393~401kB(목표 <200kB gz).
- watch description 커버리지: 12.5%(목표 100% 폴백).
- sitemap/robots: 부재(목표 존재).
