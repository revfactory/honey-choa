# 03 · 컴포넌트 소유권 맵 + 구현 인계서 (frontend-lead)

**작성:** frontend-lead · Phase 3 기반
**상태:** 기반 완성. `npm run build` + `tsc --noEmit` 통과(✓). 정적 export 1,615 페이지 생성 확인.
**대상 독자:** ui-craftsman · motion-engineer · player-integrator · api-engineer

> 이 문서가 나머지 구현의 기준이다. 파일 소유권을 넘는 수정은 소유자에게 요청한다.
> 머지 기준: `npm run build` + `npm run typecheck` 통과. 통과 못 하면 통합하지 않고 반려한다.

---

## 0. 기술 스택 (확정 — 변경 금지)

| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | **Next.js 15.5.19 (App Router) + TypeScript 5.8** | 보안 패치 적용본. major 16 미상향(보수) |
| 빌드 모드 | **`output: 'export'` 정적 내보내기** | 서버 없음. `out/` 에 정적 HTML |
| 스타일 | **Tailwind CSS v4 + CSS 변수 토큰** | `@theme inline` 으로 토큰을 유틸리티 노출 |
| React | **19.1** | dynamic route `params` 는 **Promise(async)** — 아래 §5 |
| 데이터 | **`data/*.json` 빌드 타임 import** | 단일 진입점 `src/lib/content.ts` |
| 폰트 | **Pretendard Variable** (jsDelivr woff2, `font-display: swap`) | Paperlogy 미수급 → Pretendard 800 폴백 |

남은 audit 경고 2건(moderate)은 next 내부 postcss 전이 의존성 — `audit fix --force` 는 next를 9.x로 다운그레이드하는 파괴적 변경이라 적용 안 함. critical은 해소됨.

### 명령어
```bash
npm install          # 의존성
npm run dev          # 개발 서버 (predev 가 data→public/data 복사)
npm run build        # 정적 빌드 → out/ (prebuild 가 data 복사) ★머지 게이트
npm run typecheck    # tsc --noEmit ★머지 게이트
```

---

## 1. 디렉토리 구조 + 소유권

```
src/
├── app/                         # 라우트 (골격 완성, 본문은 스텁)
│   ├── layout.tsx               # [frontend-lead] 루트 셸·메타·폰트
│   ├── globals.css              # [frontend-lead] 디자인 토큰 CSS 변수 ★단일 진실원
│   ├── page.tsx                 # 홈 스텁          → ui-craftsman + motion-engineer
│   ├── not-found.tsx            # [frontend-lead] 404 (완성)
│   ├── learn/page.tsx           # 학습 허브 스텁    → ui-craftsman
│   ├── learn/[trackId]/page.tsx # 트랙 상세 스텁    → ui-craftsman + motion-engineer
│   ├── library/page.tsx         # 라이브러리 스텁   → ui-craftsman
│   ├── shorts/page.tsx          # 숏츠 피드 스텁    → player-integrator + motion-engineer
│   ├── watch/[videoId]/page.tsx # 영상 상세 스텁    → player-integrator + ui-craftsman
│   └── about/page.tsx           # 소개 스텁         → ui-craftsman
├── components/
│   ├── common/                  # [frontend-lead] 공통 컴포넌트 (완성) — §3
│   ├── sections/                # [ui-craftsman]   페이지 섹션 (생성 예정)
│   ├── motion/                  # [motion-engineer] 배경·스크롤·마이크로 모션
│   └── player/                  # [player-integrator] lite embed·숏츠 엔진
├── lib/
│   ├── content.ts               # [frontend-lead] 데이터 진입점 ★단일 — §2
│   ├── cn.ts                    # [frontend-lead] className 유틸
│   └── types.ts                 # [data-architect] 타입 원본 (수정 시 data-architect 합의)
└── types/content.ts             # [frontend-lead] @/types/content re-export 쉼

scripts/copy-data.mjs            # [frontend-lead] data → public/data 복사(pre 훅)
data/*.json                      # [data-architect/api-engineer] 원천
public/data/*.json               # 자동 생성(.gitignore). 런타임 fetch 폴백 경로
```

**규칙:** 페이지 스텁(`src/app/**/page.tsx`)은 본문 담당이 자유 수정 가능. 단 `layout.tsx`·`globals.css`·`common/*`·`lib/content.ts` 수정은 frontend-lead 요청. 디렉토리 신설도 frontend-lead 승인.

---

## 2. 데이터 훅 / 유틸 — `@/lib/content` (단일 진입점)

> 컴포넌트에서 `data/*.json` 직접 import 금지. 반드시 이 모듈을 통한다. (조인·파생·타입 보정 우회 방지)
> 모든 함수는 서버 컴포넌트에서 동기 호출(빌드 타임 데이터). 필터/정렬은 클라이언트에서 재호출해도 됨(순수 함수).

### 셀렉터
| 함수 | 시그니처 | 반환 | 용도 |
|------|----------|------|------|
| `getChannel()` | `() => Channel` | 채널 메타 | 홈 통계·about·푸터 |
| `getVideos(filter?, sort?)` | `(ContentFilter, SortKey) => ContentCard[]` | **롱폼(isShort=false)** | 라이브러리·홈 학습 레일 |
| `getShorts(filter?, sort?)` | `(ContentFilter, SortKey) => ContentCard[]` | **숏츠(isShort=true)** | 숏츠 피드·홈 레일 |
| `getCard(videoId)` | `(string) => ContentCard \| undefined` | 단건 | watch 상세 (undefined→404) |
| `getAllVideoIds()` | `() => string[]` | 전체 1,604 id | `generateStaticParams` |
| `getAllCards()` | `() => ContentCard[]` | 롱폼+숏츠 | 전체 순회 |

`ContentFilter = { types?, genres?, difficulties?, query?, includeUnclassified? }` (모두 옵션, 빈/미지정=전체. `includeUnclassified` 기본 false).
`SortKey = "popular" | "recent" | "duration"` (기본 popular).

### 트랙
| 함수 | 반환 | 용도 |
|------|------|------|
| `getTracks()` | `Track[]` (3개) | 학습 허브 카드 |
| `getTrackIds()` | `string[]` | `generateStaticParams` |
| `getTrackView(trackId)` | `TrackView \| undefined` | 트랙 상세 (steps→{note, card}) |
| `getTrackDifficultyRange(trackView)` | `string` (예: "입문~고급") | 트랙 메타. null 스텝 제외 |
| `getTracksContaining(videoId)` | `Track[]` | watch "이 트랙 이어보기" 배너 |

### 통계 / 필터 카운트
| 함수 | 반환 | 비고 |
|------|------|------|
| `getStats()` | `CuratedStats` | 합산(숏츠 포함). 홈 분포 칩 |
| `getLibraryFacets()` | `{ byType, byGenre, byDifficulty, total }` | **롱폼 부분집합 재계산** — 라이브러리 칩 카운트는 이걸 쓸 것(spec §6.1 stats 이중계산 회피) |
| `getShortsFacets()` | `{ byGenre, byType, total }` | 숏츠 부분집합 |

### 포맷 유틸
| 함수 | 예 |
|------|-----|
| `formatDuration(sec)` | `544 → "9:04"` |
| `formatCountKo(n)` | `5237615 → "523만"`, `19600 → "1.96만"` |
| `formatInt(n)` | `1604 → "1,604"` |

### enum → 한국어 라벨 사전 (UI는 이 사전만 사용, 인라인 금지 — copy_deck §A)
`TYPE_LABEL` `GENRE_LABEL` `DIFFICULTY_LABEL` — Record 형. (예: `TYPE_LABEL.workshop === "워크샵"`, `DIFFICULTY_LABEL.beginner === "입문"`)
`GENRE_COLOR` (genre→"honey"|"heat"|"sky"|"rose"|"muted"), `DIFFICULTY_COLOR` (난이도→"mint"|"honey"|"heat").
`LIBRARY_TYPE_ORDER` `GENRE_ORDER` — 필터칩 노출 순서.

---

## 3. 공통 컴포넌트 — `@/components/common` (배럴 export)

> 모두 `import { X } from "@/components/common"` 로 가져온다. 스타일은 토큰 변수 기반(임의 hex 금지).

| 컴포넌트 | 주요 props | 비고 |
|----------|-----------|------|
| `Button` | `variant?: "primary"\|"secondary"\|"ghost"`, `href?`, `external?`, +button/anchor 속성 | href 있으면 Link, external이면 새 탭 |
| `DifficultyBadge` | `difficulty: Difficulty` | 색+라벨 병기 |
| `GenreBadge` | `genre: Genre` | 색 도트 + 라벨, 라인 스타일 |
| `TypeBadge` | `type: ContentType` | 중립 무채색. unclassified는 `null` 반환(노출 안 함) |
| `FilterChip` | `label`, `count?`, `active?`, `dotColor?`, `onClick?`, `removable?` | `'use client'`. 활성=honey 배경 |
| `VideoCard` | `card: ContentCard`, `trackId?`, `priority?` | 16:9. 링크 `/watch/[id]/`(trackId 있으면 ?track=) |
| `ShortsCard` | `card: ContentCard`, `priority?` | 9:16. 썸네일 전면 + veil + 제목 오버레이 |
| `Skeleton` / `VideoCardSkeleton` / `ShortsCardSkeleton` / `CardGridSkeleton` | `count?`, `variant?` | 로딩 상태 |
| `EmptyState` | `title?`, `description?`, `actionLabel?`, `onAction?` | 빈 상태(해요체). 기본 "찾는 무대가 비어 있어요" |
| `ErrorState` | `message?`, `onRetry?` | 기본 "콘텐츠를 불러오지 못했어요" + [다시 시도] |
| `Section` | `children`, `as?`, `bleed?` | 최대폭 1280 + gutter + 섹션 패딩. bleed=풀블리드 |
| `SectionHeader` | `title`, `subtitle?`, `action?` | 섹션 헤더(h2) |
| `SiteHeader` / `SiteFooter` / `MobileTabBar` | — | 글로벌 셸(layout에 마운트 완료). 수정은 frontend-lead |
| `StubNotice` | `title`, `owner`, `note?` | 스텁 표시. 본문 구현 시 제거 |

`NAV_ITEMS`, `CHANNEL_URL`(`https://youtube.com/@youzin`) 도 export.

### 4상태 구현 의무 (frontend-standards)
페이지 본문 구현 시 데이터/빈/로딩/에러 4상태를 모두 구현. 빈/에러 카피는 copy_deck §7 그대로. 빈→`EmptyState`, 에러→`ErrorState`, 로딩→`*Skeleton` 사용. 정적 export라 대부분 데이터는 빌드 타임 존재(로딩은 숏츠 임베드·점진 로드 등 클라이언트 fetch 구간에서만 필요).

---

## 4. 디자인 토큰 CSS 변수 (globals.css — 발췌, 전체는 파일 참조)

색: `--stage-950..600`, `--honey-200..600`, `--honey-glow`/`-strong`, `--heat-400/500`, `--heat-glow`, `--rose-400`, `--mint-400`, `--sky-400`. 텍스트: `--text-primary/secondary/muted/on-honey/link`. 유틸: `--overlay-scrim`, `--thumb-veil`.
타이포: `--font-display/body/num`, `--text-hero/h1/h2/h3/lg/base/sm/xs`.
간격: `--space-1..32`, `--section-py-desktop/mobile`, `--content-max`(1280), `--gutter`.
Radius: `--radius-thumb`(12)/`-card`(16)/`-chip`(필)/`-badge`(6)/`-input`(10).
글로우: `--glow-sm/-honey/-card-hover`. 그림자(라이트 전용): `--shadow-sm/-md`. z: `--z-sticky-nav`(100)..`-toast`(500).
모션: `--ease-enter/exit/hover/beat`, `--dur-micro`(0.2s)/`-enter`(0.6s)/`-page`/`-ambient`(9s), `--motion-lift`(-4px)/`-scale-beat`(1.03)/`-stagger`(60ms).

- Tailwind 유틸로도 색/폰트/radius 접근 가능: `bg-stage-800`, `text-honey-400`, `font-display`, `rounded-card` 등(`@theme inline` 매핑). 임의 값은 `[var(--token)]` 임의값 구문으로.
- 숫자는 `.tabular` 클래스(font-num + tabular-nums).
- 라이트 모드: `<html data-theme="light">` 토글 시 변수 자동 전환. 테마 토글 UI는 후속.
- `prefers-reduced-motion: reduce` 전역 폴백은 globals.css에 설치됨 — **모션 구현 시 추가로 패턴별 폴백 명시**(motion-engineer).

---

## 5. 라우팅 + SSG 주의사항

- **dynamic route `params` 는 Promise** (Next 15.5): `async function Page({ params }: { params: Promise<{...}> })` + `const {x} = await params`. `learn/[trackId]`·`watch/[videoId]` 가 이 패턴(참고용 완성). 새 dynamic route 추가 시 동일.
- `generateStaticParams` 로 전건 사전 생성: 트랙 3개, watch 1,604개. 추가 동적 페이지도 동일하게.
- 없는 id → `notFound()` → `not-found.tsx`(404, 완성).
- 페이지별 `metadata`/`generateMetadata` 부여. OG 이미지는 대표 썸네일(`card.thumbnailUrl`).
- 정적 export라 `trailingSlash: true` — 내부 링크는 `/watch/[id]/` 처럼 슬래시 포함 권장(컴포넌트는 이미 적용).

---

## 6. 각 에이전트 시작점

### ui-craftsman
- `src/components/sections/{home,learn,library,about}/*` 생성, 각 `app/**/page.tsx` 스텁을 섹션 조립으로 교체.
- 데이터: §2 셀렉터. 라이브러리 필터 UI는 `'use client'` + `getLibraryFacets()` 카운트. 카피는 copy_deck 그대로.
- 공통 카드/뱃지/칩/상태(§3) 재사용. 같은 패턴 3곳 중복되면 frontend-lead에 공통 추출 요청.

### motion-engineer
- `src/components/motion/*` (`'use client'`). 히어로 Spotlight/Honey Flow 배경 → 홈 page 또는 layout 주입(주입 지점은 frontend-lead와 협의).
- 스크롤 Stage Reveal / Rhythm Stagger / Beat Pulse. 토큰 §4 모션 변수 사용. 패턴별 reduced-motion 폴백 필수. transform/opacity만(60fps).

### player-integrator
- `src/components/player/*` (`'use client'`). youtube-nocookie lite embed(썸네일→클릭 시 iframe). watch 상세 플레이어 + 숏츠 피드 엔진(가시영역만 마운트, 동시 1~2개).
- `getShorts()` / `getCard()`. `embeddable=false` 폴백(새 탭). 카피 copy_deck §7.2/8.
- watch는 player(임베드) + ui-craftsman(메타·관련) 협업 — 파일 경계: player는 `components/player/`, 메타 섹션은 `components/sections/watch/`.

### api-engineer
- `data/*.json` 원천 갱신(youtube-data-pipeline). 스키마는 `src/lib/types.ts` + `01_schema.md` 계약 준수, `curated.json.schemaVersion === "1.0.0"` 유지(불일치 시 빌드가 throw). 갱신 후 `npm run build` 로 정합 확인.
- 필드 추가/변경 시 data-architect(types.ts) 합의 → frontend-lead에 content.ts 영향 통지.

---

## 7. 빌드 검증 로그 (인계 시점)
- `npm run build` ✓ — 1,615 static pages, `out/` export 완료.
- `npm run typecheck` ✓ — 0 errors.
- `public/data/` 4 json 복사 확인.
