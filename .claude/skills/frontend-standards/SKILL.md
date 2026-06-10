---
name: frontend-standards
description: "꿀초아tv 사이트의 기술 스택·디렉토리 구조·컴포넌트 규약·데이터 로딩 표준. 프로젝트 셋업, 스캐폴딩, 컴포넌트 작성, 라우팅, 데이터 훅, 빌드 설정, 유튜브 임베드 플레이어 구현 작업 시 반드시 이 스킬을 사용할 것. 기존 코드 수정 시에도 이 규약과의 정합을 먼저 확인하라. 스타일 값은 honey-choa-design-system, 모션 구현은 interactive-motion 영역."
---

# Frontend Standards — 기술 표준

## 스택 (확정)

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | **Next.js 15 (App Router) + TypeScript** | SSG로 콘텐츠 사이트에 최적, 이미지·폰트 최적화 내장 |
| 빌드 모드 | **`output: 'export'` 정적 내보내기** | 서버 불필요 — 데이터는 빌드 타임 JSON. 어디든 배포 가능 |
| 스타일 | **Tailwind CSS v4 + CSS 변수 토큰** | 토큰은 CSS 변수로 정의하고 Tailwind가 참조 |
| 모션 | **CSS + 자체 캔버스** (라이브러리 최소) | interactive-motion 패턴으로 충분, 번들 절약 |
| 데이터 | **`data/*.json` → 빌드 타임 import** | API 키가 클라이언트에 노출되지 않음 |

런타임에 YouTube API를 직접 호출하지 않는다 — 키 노출 위험 + 쿼터 낭비 + 응답 지연. 데이터 갱신은 `npm run sync`(빌드 전) 전용.

## 디렉토리 구조

```
honey-choa/
├── data/                     # 수집·큐레이션 JSON (sync가 생성)
├── scripts/                  # sync.mjs 등 빌드 보조
├── src/
│   ├── app/                  # App Router 페이지
│   │   ├── layout.tsx        # 루트 레이아웃 (폰트, 배경 모션 마운트)
│   │   ├── page.tsx          # 홈
│   │   ├── videos/           # 영상 목록·상세
│   │   ├── shorts/           # 숏츠 피드
│   │   └── tracks/           # 커리큘럼 트랙
│   ├── components/
│   │   ├── common/           # 버튼, 카드, 뱃지 (frontend-lead 소유)
│   │   ├── sections/         # 페이지 섹션 (ui-craftsman 소유)
│   │   ├── motion/           # 배경·인터랙션 (motion-engineer 소유)
│   │   └── player/           # 플레이어 (player-integrator 소유)
│   ├── lib/content.ts        # 데이터 로딩·필터·정렬 유틸 (단일 진입점)
│   └── types/content.ts      # 데이터 타입 (data-architect 소유)
└── _workspace/               # 에이전트 중간 산출물 (빌드 제외)
```

소유권 경계를 넘는 수정은 소유자에게 요청한다. 디렉토리 신설은 frontend-lead 승인 사항.

## 데이터 로딩 규약

```ts
// src/lib/content.ts — 모든 데이터 접근은 이 모듈을 통한다
import videos from '@/../data/videos.json';
import shorts from '@/../data/shorts.json';
import curated from '@/../data/curated.json';

// 컴포넌트에서 data/*.json 직접 import 금지 — 병합·타입 보정 로직이 우회된다
export function getVideos(filter?: ContentFilter): EnrichedVideo[] { ... }
```

- JSON 필드는 `src/types/content.ts` 타입과 **필드 단위로 일치**해야 한다. 타입 단언(`as`)으로 불일치를 덮지 마라 — 런타임에서 터진다
- 선택 필드(`tags`, `song`)는 항상 기본값 처리: `tags ?? []`
- `embeddable: false` 영상은 목록에서 제외하지 말고 플레이어에서 폴백 처리

## 유튜브 임베드 규약 (lite embed)

초기 렌더에 iframe을 두지 않는다 — iframe 1개당 ~500KB의 서드파티 리소스가 로드된다.

```tsx
// 1단계: 썸네일(i.ytimg.com) + 재생 버튼만 렌더
// 2단계: 클릭 시 iframe 주입
<iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
```

- `youtube-nocookie.com` 도메인 사용 (개인정보·쿠키 최소화)
- 숏츠도 동일 embed 엔드포인트 사용 (9:16 컨테이너로 감쌈)
- 모바일 자동재생은 음소거 시에만 동작 — autoplay 실패를 전제로 재생 버튼 항상 표시

## 코드 규약

- 컴포넌트: PascalCase 함수 컴포넌트, props 인터페이스는 `{Name}Props`
- 서버 컴포넌트 기본, 인터랙션 필요 시에만 `'use client'` (모션·플레이어가 해당)
- 이미지: `next/image` + 유튜브 썸네일 도메인 `remotePatterns` 등록, 목록 썸네일은 `loading="lazy"`
- 절대 임포트 `@/` 사용, 상대 경로 2단계(`../../`) 이상 금지
- 머지 기준: `npm run build` + `tsc --noEmit` 통과

## 페이지 표준 (SSG)

- 모든 페이지는 빌드 타임 생성 — 동적 상세는 `generateStaticParams`로 전체 videoId 사전 생성
- 페이지별 고유 `metadata` (title, description, OG 이미지=대표 썸네일)
- 4상태 구현 의무: 데이터/빈/로딩/에러 — 빈 상태는 ux-architect의 와이어프레임 정의를 따른다
