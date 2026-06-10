# 03 · 플레이어 통합 노트 (player-integrator)

**작성:** player-integrator · Phase 3
**상태:** `npm run typecheck` ✓ / `npm run build` ✓ (1,615 static pages export). 머지 게이트 통과.
**소유 범위:** `src/components/player/**` + `app/shorts/page.tsx` · `app/watch/[videoId]/page.tsx` 플레이어 영역.

---

## 1. 컴포넌트 목록 (`src/components/player/`)

| 파일 | 역할 | client |
|------|------|--------|
| `youtube.ts` | 임베드 URL/파라미터·postMessage 제어 순수 유틸 | — |
| `LiteYouTubeEmbed.tsx` | lite embed 코어(썸네일→클릭/active 시 iframe). embeddable=false 폴백. 16:9/9:16 | ✓ |
| `WatchPlayer.tsx` | `/watch` 16:9 플레이어. forwardRef `seekTo(sec)` 노출(타임코드 seek) | ✓ |
| `WatchPlayerClient.tsx` | watch 페이지 래퍼. ?t= 시작·seek 함수 render-prop 노출 | ✓ |
| `ShortsFeed.tsx` | `/shorts` 풀스크린 세로 피드 엔진(가상 스크롤·동시임베드≤2·점진로드) | ✓ |
| `ShortsFeedClient.tsx` | shorts 페이지 래퍼. ?v= 딥링크·닫기 chrome·최소 메타 오버레이 | ✓ |
| `index.ts` | 배럴 export | — |

데이터는 `@/lib/content`(`getShorts`/`getCard`)만 사용. `data/*.json` 직접 import 없음.

## 2. 임베드 규약 준수

- 도메인 `youtube-nocookie.com` 고정, 문서화된 파라미터만(`autoplay/mute/rel/loop/playlist/controls/enablejsapi/start/playsinline/origin`). 비공식 트릭 없음.
- 모바일 자동재생 정책: 숏츠 iframe 은 `mute=1` 동반(음소거 시에만 자동재생). 롱폼은 클릭으로 마운트되므로 autoplay 허용.
- 제어는 SDK 미사용 — IFrame API `postMessage` 직접 호출(번들 절약). `enablejsapi=1` + `origin` 주입.

## 3. 성능 전략 (frontend-lead §7.4 계약)

1. **동시 활성 임베드 ≤2** — ShortsFeed 는 `active` 단일 슬라이드만 iframe 마운트(보수적 1개). 멀어진 슬라이드는 즉시 언마운트(React 조건부 렌더 = DOM 제거 = 메모리 회수).
2. **60fps 스와이프** — 전환은 100% 네이티브 CSS `scroll-snap`(`snap-mandatory` + `scroll-snap-stop: always`). 메인 스레드 JS 애니메이션 없음. 활성 추적만 IntersectionObserver(passive).
3. **1425 전건 도달** — `visibleCount` 를 active 가 끝에서 `LOAD_AHEAD(5)` 남으면 `BATCH(12)`씩 증가. 누락 0, 무한.
4. **가시 영역만 마운트(가상 스크롤)** — active=iframe, active±2=썸네일 프리워밍, 그 외=빈 stage 표면(썸네일조차 비로딩). lite embed: 초기 화면에 iframe 0개.
5. lite embed 일반화 — watch 도 클릭/타임코드-seek 전까지 iframe 미마운트(썸네일 우선, LCP=priority next/image).

## 4. 연결 지점 (props/슬롯)

- **ShortsFeed**: `renderOverlay(card, index, active)` = 메타 오버레이(ui-craftsman), `renderChrome(activeIndex, total)` = 상단 닫기·필터칩(ui-craftsman), `emptyState` = 필터 0건 슬롯. 현재 `ShortsFeedClient` 가 최소 메타(제목·장르도트·조회·관련영상 진입)와 닫기 ✕ 를 제공 — ui-craftsman 이 교체.
- **WatchPlayerClient**: `children: (seekTo) => ReactNode` render-prop 으로 seek 함수 전달 → ui-craftsman 의 설명 타임코드 리스트가 `onClick={() => seekTo(sec)}`. watch 페이지의 메타·뱃지·관련·트랙배너는 `components/sections/watch/*`(ui-craftsman) 가 채운다.
- **딥링크**: `/shorts?v=[videoId]` → 해당 인덱스 시작. `/watch/[id]` 는 SSG 전건.

## 5. 에러 핸들링 / 폴백

- `embeddable=false`: iframe 절대 마운트 안 함 → 썸네일(dim) + "YouTube에서 보기" 새 탭. LiteYouTubeEmbed·ShortsFeed 양쪽 구현.
- 썸네일 폴백: `resolveThumbnailUrl`(content.ts) 산출 URL → `onError` 시 stage 표면 + "꿀초아tv" 로고 마크.
- IFrame API seek 은 iframe `load` 후 ~350ms 지연 적용(API ready 대기) + pending 큐.

## 6. 실측 / 미해결

- **차단 영상 목록**: `data/videos.json`·`data/shorts.json` 전건(1,604) `embeddable=true`. embeddable=false 폴백 경로는 방어적 구현이며 현재 데이터로는 트리거되지 않음. api-engineer 가 향후 차단 영상 수집 시 폴백 자동 동작.
- **숏츠 자동재생 음소거**: 모바일 정책상 음소거로 시작. 사용자 탭으로 음소거 해제(컨트롤 숨김이라 youtube-nocookie 기본 탭 동작 의존) — 향후 커스텀 음소거 토글은 ui-craftsman 오버레이 슬롯에 `postPlayerCommand(iframe,'unMute')` 로 연결 가능(현재 iframe ref 미노출 → 필요 시 ShortsFeed 가 onActiveIframe 콜백 추가 예정).
- **motion-engineer 상호 테스트 필요**: 숏츠 스냅 스크롤은 네이티브. 전환 모션을 추가로 얹을 경우 scroll-snap 과 충돌 가능 — 통합 전 상호 테스트(정책 4).

## 7. 테스트 방법

```bash
npm run typecheck && npm run build   # 머지 게이트(둘 다 ✓ 확인됨)
npm run dev                          # 로컬 확인
#  /shorts            → 세로 스와이프/휠/↑↓, active 만 재생, 끝 근처서 다음 배치 로드
#  /shorts?v=<id>     → 해당 숏츠부터 시작
#  /watch/<id>        → 썸네일 클릭 시 iframe 마운트·재생
#  DevTools Network   → 초기 로드에 youtube-nocookie iframe 0건(클릭/active 후에만 로드) 확인
```
