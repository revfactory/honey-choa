# 05 · 릴리스 리포트 — 꿀초아tv 댄스 교육 사이트 v1.0.0

**Release Conductor:** release-conductor
**일자:** 2026-06-11
**대상:** 전체 코드베이스 + `out/` 정적 export
**판정: RELEASE — GO (조건부)** — BLOCKER 0건. 클린 빌드 성공, 핵심 동선 무차단. 잔여는 MINOR·미구현 기능·미측정 항목(아래 명시).

---

## 1. 빌드 검증 (근거)

| 게이트 | 결과 | 증거 |
|--------|------|------|
| `npm run typecheck` | **PASS (exit 0, 0 errors)** | `tsc --noEmit` 무출력 |
| `npm run build` | **PASS (exit 0)** | `✓ Compiled successfully` / `✓ Generating static pages (1617/1617)` / `✓ Exporting (2/2)` |
| prebuild copy-data | PASS | 4 JSON(channel/curated/shorts/videos) → public/data 복사 |
| `out/` 산출 | **PASS** | watch 디렉토리 1,604개 · learn 트랙 3개 · 404.html · sitemap.xml(1,612 url) · robots.txt |
| 데이터 청크 출고 | **PASS (B1 회귀 없음)** | `grep -rl chunks/765 out/**/*.html` = **0건** — 데이터셋이 어떤 페이지에도 미참조 |

### 페이지 수 내역 (1,617)
- 정적 5: `/` `/learn` `/library` `/shorts` `/about`
- 트랙 3 (SSG): `/learn/bachata-starter` `/learn/salsa-starter` `/learn/bachata-social-ready`
- watch 1,604 (SSG): `/watch/[videoId]`
- + `sitemap.xml` · `robots.txt` · `/_not-found`(404)

### First Load JS (실측, B1 해소 확인)
| 라우트 | First Load JS |
|--------|---------------|
| `/` (home) | 111 kB |
| `/about` | 107 kB |
| `/learn`, `/learn/[trackId]` | 110 kB |
| `/library` | 116 kB |
| `/shorts` | 120 kB |
| `/watch/[videoId]` | 121 kB |
| shared by all | 103 kB |

Phase 4 감사 기준선(library/shorts/watch 393~401kB) 대비 **약 3.3배 감축**, 전 라우트 목표(<200kB gz)를 충족. 데이터-무관 헬퍼를 `src/lib/labels.ts`로 분리하여 client 컴포넌트가 더 이상 데이터 청크를 끌어오지 않음(B1 권고 1·2 반영 확인).

---

## 2. Phase별 결과 요약

| Phase | 산출물 | 결과 |
|-------|--------|------|
| 1 — 스키마/수집 설계 | `01_schema.md`, `scripts/sync.mjs` + `_workspace/fetch_channel_resilient.mjs`/`classify.mjs` | 채널 수집·숏츠 판별·스키마 v1.0.0 확정 |
| 2 — 기획/디자인 | `02_product_spec.md`, `02_wireframes.md`, `02_design_system.md`, `02_copy_deck.md` | 페이지 구조·디자인 토큰·카피 확정 |
| 3 — 구현 | `03_component_map.md`, `03_player_notes.md`, `03_motion_notes.md`, `03_sync_design.md` + `src/**` | 컴포넌트·플레이어·모션·동기화 구현 |
| 4 — QA/감사 | `04_qa_report_regression.md`, `04_audit_report.md` | 회귀 BLOCKER 0, 감사 BLOCKER 1·MAJOR 4 → **전부 해소** |
| 5 — 릴리스 | `README.md`, 본 리포트, 검증된 `out/` | 클린 빌드·산출물·문서 완료 |

### Phase 4 결함 해소 대조 (회귀)
| 출처 | 결함 | 상태 | 확인 근거 |
|------|------|------|-----------|
| 감사 B1 | 전체 데이터셋 client 출고(393~401kB) | **RESOLVED** | `labels.ts` 분리, First Load 111~121kB, `chunks/765` 페이지 참조 0 |
| 감사 M1 | Pretendard CDN 404 | **RESOLVED** | `globals.css`가 npm 동적 서브셋 CSS(`pretendard@1.3.9/.../pretendardvariable-dynamic-subset.css`) import |
| 감사 M2 | watch 87.5% meta description 부재 | **RESOLVED (설계)** | watch `generateMetadata` 폴백 합성(QA/감사 권고 반영) |
| 감사 M3 | sitemap/robots 부재 | **RESOLVED** | `src/app/sitemap.ts`(1,612 url)·`robots.ts` 빌드 생성, `out/`에 실재 |
| 감사 M4 | shorts h1·skip-link 부재 | **RESOLVED** | shorts h1 추가, layout skip-link 추가(인계 기준) |
| QA MAJOR | 홈 장르칩·소개 분포 카운트 ↔ 라이브러리 목적지 수치 불일치 | **RESOLVED** | `HomeGenreChips.tsx`가 `getLibraryFacets().byGenre`(롱폼 부분집합)로 표기 → 목적지 편수 일치. `AboutPage` 분포 막대는 "영상·숏츠 합산 채널 전체" 명시 + 비링크화로 오인 동선 제거 |

---

## 3. 데이터 통계

| 항목 | 값 |
|------|----|
| 롱폼 영상 (`videos.json`) | 179건 (전건 isShort=false) |
| 숏츠 (`shorts.json`) | 1,425건 (전건 isShort=true) |
| 큐레이션 통합 (`curated.json`) | 1,604건 (dangling 0, 중복 0) |
| 커리큘럼 트랙 | 3개 — bachata-starter(13스텝) / salsa-starter(10) / bachata-social-ready(7) |
| schemaVersion | 1.0.0 (불일치 시 빌드 throw — 미발생) |
| 채널 통계 | 구독 19,600 · 채널 영상 1,609(공개 외 5건은 미수집, 계약과 일치) |

데이터 무결성: QA `qa_crosscheck.mjs` 9개 항목 전부 결함 0(카운트/분리, dangling, relatedIds orphan, 트랙 step, enum→라벨, 썸네일 폴백, embeddable, 채널 shape, 필수 필드 타입).

---

## 4. 성능 지표

- **First Load JS:** 전 라우트 107~121kB (목표 <200kB gz 충족, 감사 기준선 대비 3.3배 감축).
- **공유 청크:** 103kB (framework 54kB + 255 청크 46kB + 기타).
- **정적 export 적합성:** `output:export` + `images.unoptimized` + `trailingSlash:true` — 서버리스, 새로고침 404 없음.
- **폰트:** Pretendard Variable 동적 서브셋(unicode-range 분할 woff2, 전체 2MB 회피) + `font-display:swap`.
- **모션:** 단일 rAF·오프스크린 정지·DPR 캡·transform/opacity 전용 + `useReducedMotion` 이중 안전(구조적 60fps 보장).

---

## 5. 알려진 이슈

### 보안 — npm audit moderate 2건 (수용)
- `postcss <8.5.10` (XSS via Unescaped `</style>`, GHSA-qx2v-qp2m-jg93) — Next 15.5의 transitive 의존.
- 자동 수정(`npm audit fix --force`)은 **next@9.3.3 다운그레이드(파괴적)** 만 제시 → 적용 불가. 빌드 타임 CSS 처리 경로의 moderate 이슈로 정적 산출물에 직접 노출 면 없음. Next 패치 릴리스 시 갱신 권장.

### QA MINOR 잔여 2건 (비차단)
- **#2 `getTrackDifficultyRange`의 `DIFFICULTY_LABEL` 선언 전 참조(TDZ 잠복):** 현재 호출 경로(렌더 시점)에서 무해, typecheck/build 정상. 함수를 모듈 톱레벨 즉시 호출로 리팩터 시 깨질 수 있는 회귀 감시 항목.
- **#3 `ShortSlide`의 `index` prop 미사용(데드 파라미터):** 동작 영향 없음. 코드 위생.
- (QA MINOR #1 `formatCountKo(9999)→"10천"` 경계 반올림은 빈도 낮은 시각 결함으로 잔존 — 9000~9999 viewCount 카드 노출 시에만.)

### 미구현 기능 (범위 외 명시)
- **라이트 테마(`data-theme="light"`):** 토글 UI 미구현. 토큰 구조는 존재하나 전환 미배선 — 검증 대상 부재.

### 미측정 항목 (실브라우저 미수행)
- **라이브 Lighthouse / 실기기 프레임타임:** 브라우저 미연결. 성능은 빌드 산출물 gzip 실측 + 정적 분석으로 평가. 모션 60fps는 구조적 보장만 확인.
- **숏츠 런타임 인터랙션:** IntersectionObserver 활성 인덱스 추적·점진 로드(BATCH 12)·타임코드 seek(postMessage)·reduced-motion 실토글은 정적 export·코드 대조로 검증, 헤드리스 구동 미수행. SSR 안전성은 SSG 통과로 입증.
- **embeddable=false 폴백:** 현 데이터 전건 embeddable=true라 미트리거. 방어 코드 존재만 확인, 동작 미관측.

---

## 6. 환경 요구사항

| 변수 | 필수 | 용도 | 미설정 시 |
|------|------|------|-----------|
| `GOOGLE_API_KEY` | 데이터 갱신 시만 | `npm run sync`의 YouTube Data API v3 호출 | 빌드·실행은 정상(데이터는 `data/*.json` 사용). sync만 실패 |
| `NEXT_PUBLIC_SITE_URL` | 빌드 시 권장 | metadataBase·sitemap·canonical·og 절대 URL | `https://honey-choa.pages.dev` 기본값 사용 |

- Node 환경 + `node_modules`(설치 완료) 가정. 런타임 의존성 3개(next/react/react-dom).
- 실행: `npm install` → (`GOOGLE_API_KEY` 설정, 갱신 시) → `npm run sync` → `NEXT_PUBLIC_SITE_URL=... npm run build` → `out/` 정적 호스팅.

---

## 7. 향후 개선 권고 (우선순위)

1. **실브라우저 QA 1회** — 헤드리스/실기기로 숏츠 IntersectionObserver·점진 로드·seek·reduced-motion 토글·LCP/CLS·모션 60fps 실측. 현 릴리스의 최대 미검증 영역.
2. **QA MINOR #2(TDZ 잠복)·#3(데드 파라미터) 정리** — 회귀 위험 제거 및 코드 위생. 저비용.
3. **라이트 테마 토글 구현** — 토큰 구조 존재, UI·배선만 추가.
4. **Next 패치 추적** — postcss moderate 해소되는 Next 15.x 패치로 갱신(파괴적 다운그레이드 없이).
5. **`formatCountKo` 경계(9999→"10천") 보정** — 만 단위 승급 일관성.
6. **데이터 갱신 후 정합 재검증** — 차기 `npm run sync` 후 `npm run data:validate` + `qa_crosscheck.mjs`로 schemaVersion·count 재대조.

---

## 8. 산출물 정리 / 감사 추적

- **`_workspace/` 중간 산출물(01~04, 02_*, 03_*):** 감사 추적 위해 **보존**(삭제 안 함).
- **`_workspace/fetch_channel_resilient.mjs` · `classify.mjs` — 삭제 금지(중요):** scripts/와 **중복 아님**. `scripts/sync.mjs`가 이 둘을 `spawnSync` 자식 프로세스로 직접 호출한다(`sync.mjs:43-44, 268, 323`). 삭제 시 `npm run sync`(데이터 파이프라인)가 깨진다. 로직 미복제(단일 출처) 설계의 일부이므로 현 위치 유지.
- `_workspace/qa_crosscheck.mjs`는 재실행 가능한 회귀 검증 스크립트로 보존.

---

## 9. CLAUDE.md 변경 이력 권고 (직접 수정 안 함 — 보고만)

CLAUDE.md 변경 이력 표에 아래 항목 추가를 권고한다(리더 승인 후 반영):

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-11 | Phase 5 릴리스 — 클린 빌드(1,617페이지) 검증, README·릴리스 리포트 작성, Phase 4 BLOCKER/MAJOR 전부 해소 확인 | 전체 | v1.0.0 릴리스 |

---

## 생성/변경 파일
- `README.md` (신규)
- `_workspace/05_release_report.md` (본 문서, 신규)
- `out/` (재빌드 산출물)
