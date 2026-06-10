---
name: youtube-data-pipeline
description: "YouTube Data API v3로 꿀초아tv(@youzin, UCNExEo8zrCEXs6DA6yeEcoA) 채널의 영상·숏츠 메타데이터를 수집·판별·검증하는 파이프라인. 유튜브 데이터 수집, 채널 동기화, 숏츠 판별, 데이터 갱신, API 연동, 쿼터 관리 작업 시 반드시 이 스킬을 사용할 것. 수집 데이터의 스키마 정의도 포함한다. 임베드 플레이어 구현은 frontend-standards 영역이므로 제외."
---

# YouTube Data Pipeline — 채널 데이터 수집

## 핵심 원칙

1. API 키는 환경변수 `GOOGLE_API_KEY`에서만 읽는다. 코드·파일 하드코딩은 키 유출 사고로 직결된다.
2. 데이터는 항상 번들 스크립트로 수집한다. 수집 로직을 새로 작성하면 숏츠 판별·재시도·검증 로직이 누락된 사본이 생긴다.
3. `search.list`는 사용하지 않는다 — 호출당 100유닛으로, 1유닛인 `playlistItems`로 동일 결과를 얻을 수 있다.

## 수집 실행

```bash
GOOGLE_API_KEY=$GOOGLE_API_KEY node .claude/skills/youtube-data-pipeline/scripts/fetch_channel.mjs \
  --channel UCNExEo8zrCEXs6DA6yeEcoA --out data
```

- `--handle youzin`으로 핸들 기반 조회도 가능 (채널 ID를 모를 때)
- 산출: `data/channel.json`, `data/videos.json`(일반 영상), `data/shorts.json`(숏츠)
- 종료 코드: 0=성공 / 1=설정 오류 / 2=API 오류 / 3=검증 실패 — 자동화에서 종료 코드로 분기하라

## 숏츠 판별 로직 (스크립트에 내장)

길이만으로 숏츠를 판별하면 안 된다. 2024-10부터 숏츠가 최대 3분까지 허용되어, 3분 이하 일반 영상과 구분이 불가능하기 때문이다.

1. `durationSeconds > 183` → 일반 영상 확정
2. `durationSeconds ≤ 183` → `https://www.youtube.com/shorts/{videoId}`에 HEAD 요청 (redirect: manual)
   - HTTP 200 → 숏츠
   - 30x 리다이렉트 → 일반 영상
3. 네트워크 실패로 미확정(`isShort: null`)인 항목은 보고서에 명시하고 추측 분류하지 않는다

## 데이터 스키마 (산출 JSON 계약)

```typescript
interface VideoItem {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;          // ISO8601
  duration: string;             // ISO8601 (PT3M21S)
  durationSeconds: number;      // 파생 필드
  thumbnails: Record<string, { url: string; width: number; height: number }>;
  tags: string[];               // 없으면 빈 배열 (undefined 아님)
  statistics: { viewCount: number; likeCount: number; commentCount: number };
  embeddable: boolean;          // false면 임베드 플레이어 대신 새 탭 폴백 필요
  isShort: boolean | null;      // null = 판별 미확정
}
```

프론트 타입(`src/types/content.ts`)은 이 계약과 필드 단위로 일치해야 한다. 불일치는 경계면 버그의 1순위 원인이다.

## 알려진 오류와 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| 403 `API_KEY_SERVICE_BLOCKED` | 키의 "API 제한사항"에 YouTube Data API v3 미포함, 또는 프로젝트에서 API 미활성화 | Cloud Console > 사용자 인증 정보 > 키 > API 제한사항에 YouTube Data API v3 추가. 전파에 수 분 소요 |
| 403 `quotaExceeded` | 일 10,000유닛 초과 | 태평양 시간 자정 리셋 대기. 전체 수집 1회는 ~30유닛이므로 통상 도달 불가 |
| 400 `keyInvalid` | 키 값 오류 | `GOOGLE_API_KEY` 값 재확인 |
| 수집 건수 < 채널 통계 건수 | 비공개·멤버십 전용 영상 | 정상. 차이 건수를 보고서에 명시 |

오류 발생 시 더미 데이터로 대체하지 않는다 — 더미 데이터가 파이프라인을 통과하면 모든 다운스트림이 가짜 위에서 작업하게 된다.

## 증분 갱신

기존 `data/videos.json`이 있을 때 전체 재수집 대신:
1. 스크립트로 전체 수집 (쿼터가 저렴하므로 수집 자체는 전체)
2. 기존 파일과 videoId 대조 — 신규/삭제 건수를 보고
3. 큐레이션 파일(`data/curated.json`)의 수동 보정 필드는 보존하며 병합

상세 API 레퍼런스(엔드포인트·쿼터 비용·파라미터)는 [references/api-reference.md](references/api-reference.md) 참조.
