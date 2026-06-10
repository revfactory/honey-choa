# YouTube Data API v3 레퍼런스 (이 프로젝트에서 쓰는 범위)

## 목차
1. [사용 엔드포인트와 쿼터 비용](#사용-엔드포인트와-쿼터-비용)
2. [채널 조회](#채널-조회)
3. [업로드 재생목록 페이지네이션](#업로드-재생목록-페이지네이션)
4. [영상 상세 배치 조회](#영상-상세-배치-조회)
5. [쿼터 계산](#쿼터-계산)

---

## 사용 엔드포인트와 쿼터 비용

| 엔드포인트 | 비용/호출 | 용도 |
|-----------|----------|------|
| `channels.list` | 1 | 채널 메타 + 업로드 재생목록 ID |
| `playlistItems.list` | 1 | 업로드 영상 ID 목록 (50개/페이지) |
| `videos.list` | 1 | 상세 메타 (50개/호출) |
| `search.list` | **100** | **사용 금지** — playlistItems로 대체 |

## 채널 조회

```
GET /youtube/v3/channels
  ?part=snippet,statistics,contentDetails
  &id=UCNExEo8zrCEXs6DA6yeEcoA     # 또는 &forHandle=youzin
  &key={GOOGLE_API_KEY}
```

- `contentDetails.relatedPlaylists.uploads` → 업로드 재생목록 ID (채널 ID의 UC를 UU로 바꾼 값과 동일)
- `forHandle`은 @ 없이 핸들만 전달

## 업로드 재생목록 페이지네이션

```
GET /youtube/v3/playlistItems
  ?part=contentDetails
  &playlistId=UU...
  &maxResults=50
  &pageToken={nextPageToken}
```

- `nextPageToken`이 없을 때까지 반복
- 삭제·비공개 영상은 목록에서 자동 제외됨

## 영상 상세 배치 조회

```
GET /youtube/v3/videos
  ?part=snippet,contentDetails,statistics,status
  &id={최대 50개 콤마 구분}
```

- `status.embeddable` — false면 사이트 임베드 불가 (새 탭 폴백 필요)
- `contentDetails.duration` — ISO8601 (PT1M30S). 라이브 예정/진행 중은 P0D
- `snippet.tags` — 없는 영상이 흔함. 항상 `?? []` 처리
- `statistics`의 모든 값은 문자열로 반환됨 — Number() 변환 필수

## 쿼터 계산

영상 N개 채널의 전체 수집 비용 = 1 (channels) + ⌈N/50⌉ (playlistItems) + ⌈N/50⌉ (videos)

예: 500개 영상 채널 = 1 + 10 + 10 = **21유닛** (일 한도 10,000의 0.2%)
→ 갱신 주기를 공격적으로 잡아도 쿼터는 문제가 되지 않는다. HEAD 숏츠 판별은 API 쿼터를 소모하지 않는다.
