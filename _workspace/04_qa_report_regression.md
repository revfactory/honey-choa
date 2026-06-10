# QA Report: regression (Phase 4 전체 회귀 + 데이터-프론트 경계면 교차검증) — 2026-06-11

## 요약: PASS (조건부) — BLOCKER 0건 / MAJOR 1건 / MINOR 3건

기계 게이트(build·typecheck) 전부 통과, 데이터 무결성 0결함. 핵심 동선 차단 없음.
유일한 기능 결함은 홈/소개의 장르 카운트와 라이브러리(롱폼) 목적지 간 수치 불일치(MAJOR, 우회 가능).
이 보고서는 최초 회귀이므로 이전 결함 회귀 대조 항목은 없음(신규 baseline).

---

## 결함 목록

### [MAJOR] 홈 장르칩·소개 분포 카운트(합산 stats) ↔ 라이브러리(롱폼) 목적지 수치 불일치
- 재현:
  1. 홈 `/` → "장르별 둘러보기" 칩 "바차타 1,269" 클릭 (`HomeGenreChips.tsx:23` `getStats().byGenre`)
  2. 도착지 `/library/?genre=bachata` 는 롱폼만 표시 → 결과 **136편** (`getLibraryFacets()`, isShort=false 부분집합)
  3. 소개 `/about` "콘텐츠 분포" 막대도 동일: 막대 라벨 "바차타 1,269 · n%" 가 같은 `/library/?genre=` 로 링크 (`AboutPage.tsx:88-108`)
- 기대: 칩/막대에 표기한 수와 클릭 후 라이브러리에 실제로 보이는 편수가 일치하거나, 표기가 "전체 채널 분포(숏츠 포함)"임이 사용자에게 분명해야 한다.
- 실제: 표기 합산 vs 목적지 롱폼. 격차 큼 → 필터가 깨진 것으로 읽힘.
  - bachata 1,269 → 136 / salsa 147 → 4 / zouk 30 → 3 (실측, qa_crosscheck + 추가 집계)
- 추정 원인: 경계면 #3(데이터↔훅 의미 불일치). `getStats()`=합산(숏츠 포함, 계약 §3.6/`content.ts:292`), 라이브러리 칩=`getLibraryFacets()`=롱폼 재계산(`content.ts:300`). 두 카운트 소스가 다른데 동일 `/library?genre=` 동선으로 묶임. `03_component_map.md §2`는 "합산 stats를 라이브러리 카운트로 쓰지 말 것"을 명시 — 라이브러리 칩 자체는 규약을 지켰으나, **합산 stats를 표기한 칩이 롱폼 라이브러리로 링크**하는 교차 동선에서 규약 의도가 깨진다.
- 우회: 기능 자체는 동작(라이브러리는 정상 필터링). 시각/신뢰 결함이므로 MAJOR(차단 아님).
- 권고(택1, frontend-lead/ui-craftsman 경계): (a) 홈 칩/소개 막대를 카운트 미표기 링크로 바꾸거나, (b) 숏츠+롱폼 통합 검색 목적지로 링크하거나, (c) "전체 N · 라이브러리 n" 식 이중 표기. 데이터·훅 수정 불필요(표기/링크 정책 문제).

### [MINOR] `formatCountKo` 경계 반올림 — 9999 → "10천" (만 단위 미승급)
- 재현: `node -e` 로 `formatCountKo(9999)` → `"10천"`.
- 기대: 만 직전 값이 "10천"으로 표기되면 "1만"과의 일관성이 깨짐(통상 "1만"으로 승급 기대).
- 실제: `9999 → "10천"`. (10000부터는 "1만" 정상)
- 추정 원인: `content.ts:81` `(n/1000).toFixed(1)` 가 9.999→"10.0"→"10"으로 반올림. 1만 미만 구간이라 천 단위 분기에 머무름.
- 영향: 실데이터 viewCount에 9000~9999 구간이 카드에 노출될 때만. 빈도 낮음. 시각 결함.

### [MINOR] `getTrackDifficultyRange` 가 `DIFFICULTY_LABEL` 을 선언 전 참조(TDZ 잠재)
- 재현: 정적 분석. `content.ts:276-277` 가 `DIFFICULTY_LABEL`(정의는 `content.ts:355`) 참조.
- 기대: 모듈 평가 순서에 의존하지 않는 참조.
- 실제: 함수 본문 내부 참조라 **호출 시점엔 이미 초기화됨** → 현재 빌드/런타임 정상(typecheck·build 통과로 확인). 단 함수가 모듈 톱레벨에서 즉시 호출되도록 리팩터되면 `const` TDZ로 깨질 수 있는 잠복 위험.
- 추정 원인: 라벨 사전을 파일 하단에 배치한 구조. 현 호출 경로(컴포넌트 렌더 시점)에서는 무해.
- 영향: 현재 결함 없음. 회귀 감시 항목으로만 기록(닫지 않음).

### [MINOR] `ShortSlide` 의 `index` prop 미사용
- 재현: `ShortsFeed.tsx:207-218` `ShortSlide` 타입에 `index: number` 선언·전달되나 본문에서 사용 안 함.
- 기대/실제: 동작 영향 없음(typecheck 통과). 데드 파라미터.
- 추정 원인: 리팩터 잔여. 시각/코드위생.

---

## 검증 증거

### 기계 게이트 (procedure step 2)
- `npm run typecheck` → **exit 0, 0 errors**.
- `npm run build` → **exit 0**. prebuild copy-data 4 JSON → public/data 성공. `✓ Generating static pages (1615/1615)`, `✓ Exporting (2/2)`.
  - 라우트 표: `/learn/[trackId]` 3건(bachata-starter/salsa-starter/bachata-social-ready), `/watch/[videoId]` `[+1601 more paths]` = 1604.
- `out/` 파일시스템 실측: `out/watch/` 하위 디렉토리 **1604개**, `out/learn/` 트랙 디렉토리 **3개**, `out/404.html` 존재, 표본 `out/watch/6aFrhN_XFI8/index.html` 존재.

### 데이터 경계면 교차검증 (procedure step 1, `_workspace/qa_crosscheck.mjs` 실행)
스크립트가 실데이터(channel/videos/shorts/curated)와 `01_schema.md`/`types.ts` 계약을 필드 단위 대조. **검출 결함 0건.**
1. **카운트/분리 (브리프 #1)**: videos.json items=179 전건 isShort=false, shorts.json items=1425 전건 isShort=true. isShort=null 0건. 교차 중복 id 0건. 총 unique id 1604. ✓
2. **dangling reference (#3 큐레이션↔원본)**: curated.items=1604 전건 videoId가 raw에 존재. dangling 0. 중복 curated 항목 0. schemaVersion="1.0.0" 일치(불일치 시 `content.ts:52` throw — 미발생). ✓
3. **relatedIds 무결성 (#3 orphan)**: relatedIds 총 38건, raw 미존재(orphan) 0건. ✓
4. **트랙 step 무결성 (브리프 #3, 경계 #4)**: 3트랙 모두 첫 스텝 beginner, steps 13/10/7 (전부 ≥5), step videoId 전건 raw·curated 존재(orphan 0, uncurated 0), 난이도 단조 증가 위반 0, off-genre step 0. ✓
5. **enum→라벨 (브리프 #2)**: ContentType/Genre/Difficulty/subGenre 전건 선언 도메인 내. raw enum 노출(라벨 누락) 위험 0. 라벨 사전(`content.ts:332-359`)이 모든 enum 키 커버 확인. ✓
6. **썸네일 폴백 (브리프 #6, 경계 #6)**: maxres 결측 videos 41 / shorts 5(계약 §2와 일치). 폴백 체인(maxres→standard→high→medium→default) 적용 시 **빈 문자열 산출 0건**. 표본 J3ravPnxoGY(maxres 없음) → sddefault.jpg 정상 해석. 컴포넌트단 onError → "꿀초아tv" 플레이스홀더 2차 폴백 존재(VideoCard/ShortsCard/LiteYouTubeEmbed/ShortsFeed.FallbackThumb). ✓
7. **embeddable (브리프, 경계 #5)**: embeddable=false 0건(계약 §2 "실측 전건 true"와 일치), non-boolean 0건. 폴백 분기는 방어적으로 구현됨(LiteYouTubeEmbed:92, ShortsFeed:247). ✓
8. **채널 shape (#1)**: 식별자 키 channelId(id 아님) 확인. statistics subscriber/video/view 전건 존재. videoCount=1609 > 수집 1604(계약 §1 비공개/멤버십 설명과 일치). ✓
9. **필수 필드 타입 (#1)**: 1604 전건 videoId/title/description=string, durationSeconds/statistics.*=number, tags=array 일치. ✓

### 라우팅/SSG (브리프 #5)
- `generateStaticParams`: watch(`getAllVideoIds` 1604) + learn(`getTrackIds` 3) 양쪽 존재. async params = `Promise<{...}>` + `await params` 패턴 watch/learn 모두 정확(`watch/[videoId]/page.tsx:34`, `learn/[trackId]/page.tsx:29`). 없는 id → `notFound()`. 빌드 결과 페이지 수로 전건 생성 실증.

### 조건부 렌더 / 4상태 (브리프 #4)
- watch 본문(`WatchBody.tsx`): 트랙배너 `tracks.length>0` + `?track=` 매칭 시만(`WatchTrackContext.tsx:28-34` 3중 가드), 관련영상 `related.length>0`, 곡 `card.song`, 설명블록 `card.description.trim()`. 빈 헤더 노출 경로 없음. 실데이터 description 공백 1404/1604건이나 `.trim()` 가드로 빈 "설명" 헤더 미노출. ✓
- 라이브러리(`LibraryBrowser.tsx`): 0건 → `EmptyState` + 난이도 완화 제안(relaxedCount), 0건 장르칩 `return null`, 0건 type/difficulty 칩 비활성(opacity-40 + pointer-events-none). AND 필터, includeUnclassified 기본 false. 라이브러리 칩 카운트=`getLibraryFacets()`(롱폼 재계산) — **합산 stats 미사용 규약 준수** ✓.
- 숏츠(`ShortsExperience.tsx`/`ShortsFeed.tsx`): total=0 → 빈상태, 필터 0건 → EmptyState. genre 칩 카운트=`getShortsFacets()`(숏츠 부분집합) — 내부 일관 ✓.

### 모션 배선 (브리프 #7)
- 실제 연결 확인(grep): HeroBackground+BeatPulse → `HomeHero.tsx`, Reveal → HomeRails/LearnHub/TrackDetail/LibraryBrowser. 배럴 `motion/index.ts` default export ↔ 사용처 named import 정합(경계 버그 없음).
- SSR 안전: `useReducedMotion`(서버 false 시작 → useEffect 동기화), HeroBackground/ShortSlide `typeof window === "undefined"` 가드. 빌드 SSG 통과가 실증.
- reduced-motion 폴백: Reveal `transition:none`+즉시 shown, BeatPulse `transition:none`+transform 미적용. 패턴별 폴백 명시됨.

### 디자인 토큰 (경계 #6)
- 카드/칩/배지 전반 `var(--token)` 사용, line-clamp-2 로 장문 제목(최장 106자, ≥40자 1278건) 안전 클램프. 임의 hex 직접 사용 미발견(spot check). ✓

### 검증하지 못한 항목 (빈 칸 금지)
- **실브라우저 런타임 인터랙션 미수행**: 숏츠 IntersectionObserver 활성 인덱스 추적·점진 로드(BATCH 12), 타임코드 seek(postMessage), reduced-motion 실제 토글 거동은 정적 export·코드 대조로 검증했고 헤드리스 브라우저 구동은 하지 않음. SSG/typecheck/코드 경로로 SSR 안전성은 입증되나 런타임 60fps·임베드 동시성 ≤2 의 실측은 미수행 — 별도 브라우저 QA 필요(INTERMITTENT 아님, 범위 외로 분류).
- **라이트 테마(`data-theme="light"`) 토큰 전환**: 토글 UI 미구현(map §4 후속) — 검증 대상 부재.
- **api-engineer 데이터 갱신 후 정합**: 현재 스냅샷 기준 검증. 차기 `data:sync` 후 schemaVersion·count 재대조 필요.

---

## 회귀 baseline 메모
- 본 회귀가 최초 보고서. 차기 재호출 시 위 MAJOR 1·MINOR 3건의 수정 여부부터 회귀 대조(RESOLVED/REOPEN)할 것.
- 재실행 스크립트: `node _workspace/qa_crosscheck.mjs` (데이터 무결성 0결함 유지 확인), `npm run typecheck`, `npm run build`.
