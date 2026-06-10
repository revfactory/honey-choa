# 꿀초아tv 댄스 교육 사이트 (honey-choa)

> 라틴댄스를 순서대로 배우다 — 꿀초아tv(@youzin) 채널의 영상·숏츠를 수집·큐레이션한 모던 댄스 교육 사이트.

YouTube Data API v3로 꿀초아tv 채널(`UCNExEo8zrCEXs6DA6yeEcoA`)의 롱폼 영상과 숏츠 메타데이터를 수집하고, 교육 관점으로 분류·큐레이션하여 **정적 사이트(Next.js static export)** 로 빌드한다. 서버 없이 어떤 정적 호스팅에도 배포할 수 있다.

---

## 기술 스택

| 영역 | 사용 기술 |
|------|----------|
| 프레임워크 | Next.js 15.5 (App Router, `output: "export"` 정적 내보내기) |
| 런타임 | React 19.1 |
| 언어 | TypeScript 5.8 (strict, `tsc --noEmit` 게이트) |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/postcss`), CSS 변수 디자인 토큰 |
| 폰트 | Pretendard Variable (jsDelivr 동적 서브셋 woff2), Paperlogy(display, 수급 시) |
| 데이터 | 빌드 타임 정적 JSON (YouTube Data API v3로 수집) |
| 플레이어 | YouTube IFrame 임베드(파사드/lite-embed 패턴) |

런타임 의존성은 `next` / `react` / `react-dom` 3개뿐이다. 데이터는 빌드 타임에만 소비되며 클라이언트 번들에 전체 데이터셋이 실리지 않는다(라우트별 First Load JS 111~121kB).

---

## 디렉토리 구조

```
honey-choa/
├── src/
│   ├── app/                     # App Router 라우트
│   │   ├── page.tsx             # 홈 (히어로 + 큐레이션 레일 + 장르칩)
│   │   ├── learn/               # 커리큘럼 트랙 허브 + /learn/[trackId]
│   │   ├── library/             # 롱폼 라이브러리(장르·난이도·유형 필터)
│   │   ├── shorts/              # 숏츠 세로 피드
│   │   ├── about/               # 채널 소개 + 콘텐츠 분포
│   │   ├── watch/[videoId]/     # 개별 영상 시청(1,604개 SSG)
│   │   ├── sitemap.ts           # sitemap.xml 생성(전 라우트)
│   │   ├── robots.ts            # robots.txt 생성
│   │   ├── not-found.tsx        # 404
│   │   ├── layout.tsx           # 루트 레이아웃(헤더/푸터/스킵링크)
│   │   └── globals.css          # 디자인 토큰 + 폰트
│   ├── components/
│   │   ├── common/              # Button, Badge, FilterChip, 카드, 헤더/푸터, 탭바
│   │   ├── motion/              # 배경 애니메이션·스크롤 등장·호버(reduced-motion 안전)
│   │   ├── player/              # YouTube 임베드, 숏츠 피드
│   │   └── sections/            # 페이지별 섹션(home/learn/library/shorts/watch/about)
│   ├── lib/
│   │   ├── content.ts           # 데이터 로드·큐레이션 조회 API(서버/빌드 전용 데이터)
│   │   ├── labels.ts            # 데이터-무관 라벨/포맷 헬퍼(클라이언트 안전)
│   │   ├── site.ts              # SITE_URL/SITE_NAME 단일 출처
│   │   ├── types.ts             # 도메인 타입
│   │   └── cn.ts                # className 유틸
│   └── types/content.ts
├── scripts/
│   ├── sync.mjs                 # YouTube 수집·분류·검증 파이프라인
│   └── copy-data.mjs            # data/*.json → public/data 복사(pre dev/build 자동 실행)
├── data/                        # 수집·큐레이션 산출 JSON (빌드 입력)
│   ├── channel.json             # 채널 통계
│   ├── videos.json              # 롱폼 179건
│   ├── shorts.json              # 숏츠 1,425건
│   └── curated.json             # 큐레이션 통합 1,604건 + 트랙 3개
├── public/data/                 # copy-data가 채우는 런타임 미러(빌드 산출물엔 미포함)
├── out/                         # 정적 export 산출물(배포 대상)
├── next.config.mjs              # output:export, images.unoptimized, trailingSlash
└── _workspace/                  # Phase 1~5 산출물·감사 추적(배포 미포함)
```

---

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

| 변수 | 필수 | 용도 | 기본값 |
|------|------|------|--------|
| `GOOGLE_API_KEY` | 데이터 갱신 시 필수 | YouTube Data API v3 키. `npm run sync`(데이터 수집)에서만 사용 | 없음 (미설정 시 sync 실패) |
| `NEXT_PUBLIC_SITE_URL` | 권장 | 절대 URL 기준(metadataBase·sitemap·canonical·og). 배포 도메인 | `https://honey-choa.pages.dev` |

API 키는 코드·파일에 하드코딩하지 않는다. 셸 환경변수 또는 `.env.local`로 주입한다.

```bash
export GOOGLE_API_KEY="AIza..."          # 데이터 수집 시
export NEXT_PUBLIC_SITE_URL="https://your-domain.example"  # 빌드 시
```

**키 미설정 시 동작:** 사이트 빌드·실행(`dev`/`build`/`start`)은 `data/*.json`만 읽으므로 `GOOGLE_API_KEY` 없이도 정상 동작한다. 키는 `npm run sync`(데이터 갱신)에서만 필요하며, 미설정이면 sync가 즉시 실패한다.

### 3. 개발 서버

```bash
npm run dev          # predev가 data → public/data 복사 후 next dev
```
http://localhost:3000

### 4. 프로덕션 빌드 (정적 export)

```bash
NEXT_PUBLIC_SITE_URL="https://your-domain.example" npm run build
```
`out/`에 정적 사이트가 생성된다(`prebuild`가 데이터 복사를 자동 수행). 빌드는 약 1,617개 페이지를 생성한다(정적 5 + 트랙 3 + watch 1,604 + sitemap.xml/robots.txt/404).

### 5. 빌드 결과 미리보기

`out/`은 순수 정적이므로 아무 정적 서버로 확인할 수 있다.
```bash
npx serve out        # 또는 python3 -m http.server -d out
```
> `npm run start`(`next start`)는 정적 export 모드에서는 사용하지 않는다 — `out/`을 정적 호스팅하라.

---

## 명령어 레퍼런스

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버(predev: data → public/data 복사) |
| `npm run build` | 정적 export 빌드(prebuild: data 복사) → `out/` |
| `npm run typecheck` | `tsc --noEmit` 타입 게이트 |
| `npm run lint` | Next lint |
| `npm run sync` | YouTube 수집·분류·검증 파이프라인 (= `data:sync`) |
| `npm run data:validate` | 수집 없이 기존 데이터 스키마 검증만(`--validate-only`) |

---

## 데이터 파이프라인

```
YouTube Data API v3
   │  (GOOGLE_API_KEY)
   ▼
scripts/sync.mjs ── 수집 ▶ 숏츠/롱폼 판별 ▶ 교육 분류·큐레이션 ▶ 스키마 검증
   │
   ▼
data/channel.json · videos.json · shorts.json · curated.json   (수집·큐레이션 산출)
   │
   │  copy-data.mjs (pre dev/build 자동)
   ▼
public/data/*.json   →   src/lib/content.ts (빌드 타임 로드)   →   정적 페이지(out/)
```

- **수집 대상:** 채널 `UCNExEo8zrCEXs6DA6yeEcoA`. 롱폼은 `videos.json`, 숏츠는 `shorts.json`, 교육 분류·트랙은 `curated.json`.
- **데이터 갱신 절차:**
  1. `export GOOGLE_API_KEY="..."`
  2. `npm run sync` — 최신 메타데이터 재수집·재분류·검증 후 `data/*.json` 갱신
  3. `npm run build` — 갱신된 데이터로 사이트 재생성
- **검증:** `curated.json`의 `schemaVersion`은 `1.0.0`이며, 불일치 시 `content.ts`가 빌드 중 throw한다. `npm run data:validate`로 수집 없이 무결성만 점검할 수 있다.
- 데이터 통계: 롱폼 179 + 숏츠 1,425 = 큐레이션 1,604건, 커리큘럼 트랙 3개(bachata-starter / salsa-starter / bachata-social-ready).

---

## 페이지 구조

| 라우트 | 내용 |
|--------|------|
| `/` | 홈 — 히어로, 큐레이션 레일, 장르별 둘러보기 칩(라이브러리 편수 기준) |
| `/learn` | 커리큘럼 트랙 허브 |
| `/learn/[trackId]` | 트랙 상세(난이도 순 스텝 13/10/7) — 3개 SSG |
| `/library` | 롱폼 라이브러리(장르·난이도·유형 AND 필터, 빈 상태·완화 제안) |
| `/shorts` | 숏츠 세로 풀스크린 피드(scroll-snap, 점진 로드) |
| `/about` | 채널 소개 + 콘텐츠 분포(채널 전체 합산 기준 명시) |
| `/watch/[videoId]` | 개별 영상 시청 — 플레이어·관련영상·트랙 컨텍스트 — 1,604개 SSG |

---

## 배포 (정적 호스팅)

`out/`은 서버가 필요 없는 완전 정적 산출물이다. `trailingSlash: true`로 디렉토리/`index.html` 구조라 새로고침 404가 없다.

1. `NEXT_PUBLIC_SITE_URL`을 실제 배포 도메인으로 설정하고 `npm run build`.
2. `out/` 전체를 정적 호스팅에 업로드:
   - **Cloudflare Pages / Netlify / Vercel(static):** 빌드 명령 `npm run build`, 출력 디렉토리 `out`.
   - **GitHub Pages / S3 / 정적 서버:** `out/` 내용을 그대로 배포.
3. `sitemap.xml` / `robots.txt`는 빌드 시 자동 생성되며 도메인은 `NEXT_PUBLIC_SITE_URL`을 따른다.

---

## 라이선스 / 출처

콘텐츠 출처는 꿀초아tv(@youzin) 채널이며, 본 사이트는 교육 큐레이션 목적의 메타데이터·임베드만 사용한다.
