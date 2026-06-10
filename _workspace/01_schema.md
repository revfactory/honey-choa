# 콘텐츠 데이터 스키마 계약 — honey-choa

**버전:** v1.0.0
**작성:** data-architect
**작성일:** 2026-06-11
**근거 데이터:** `data/channel.json`, `data/videos.json`(179건), `data/shorts.json`(1425건) 실측

이 문서는 honey-choa 사이트의 데이터 3계층 계약을 명문화한다. TypeScript 타입은 `src/lib/types.ts`가 이 문서의 기준 구현이다. **불일치 시 실데이터가 정답이다.**

---

## 0. 데이터 3계층

```
[L1 원천 RAW]            [L2 큐레이션 ENRICHED]        [L3 프론트 VIEW MODEL]
data/channel.json        data/curated.json             런타임 조합 (빌드/훅)
data/videos.json    →    (videoId 참조 + 분류 필드)  →  Channel / ContentCard /
data/shorts.json         content-curator 생산           Track / FeedView
youtube-data-pipeline                                   frontend-lead 소비
```

- **L1**은 youtube-data-pipeline 스크립트만 생산한다. 수동 편집 금지.
- **L2**는 L1을 복제하지 않고 `videoId`로 참조하며 분류 필드만 더한다. content-curator 생산.
- **L3**은 정적 파일이 아니다. 프론트 데이터 훅이 L1+L2를 `videoId`로 조인해 런타임 구성한다.

### 데이터 배치 전략 (결정)

| 데이터 | 배치 | 사유 |
|--------|------|------|
| channel.json | `public/data/` 정적 서빙 + fetch | 1KB, 변동 적음 |
| videos.json / shorts.json | `public/data/` 정적 서빙 + fetch | 합 2MB. 빌드타임 번들 주입 시 JS 비대 → 정적 fetch + 클라 캐시 |
| curated.json | `public/data/` 정적 서빙 + fetch | L1과 동일 위치에서 조인 |

> 주의: 현재 파일은 프로젝트 루트 `data/`에 있다. 프론트 빌드 시 `public/data/`로 복사하는 단계가 필요하다(frontend-lead 협의 사항). 경로는 `/data/*.json`으로 노출한다.

---

## 1. L1 — 원천: Channel (`data/channel.json`)

단일 객체. youtube-data-pipeline `channels.list` 산출.

| 필드 | 타입 | 필수 | 예시 | 출처 |
|------|------|:---:|------|------|
| channelId | string | O | `"UCNExEo8zrCEXs6DA6yeEcoA"` | channels.list id |
| title | string | O | `"꿀초아tv"` | snippet.title |
| handle | string | O | `"@youzin"` | snippet.customUrl |
| description | string | O | `"놀이터🌱실험실🍯꿀통..."` | snippet.description |
| publishedAt | string(ISO8601) | O | `"2005-08-15T06:31:25Z"` | snippet.publishedAt |
| thumbnails | Record<string, Thumbnail> | O | `{default,medium,high}` | snippet.thumbnails |
| statistics.subscriberCount | number | O | `19600` | statistics |
| statistics.videoCount | number | O | `1609` | statistics. **수집(1604)보다 큼** = 비공개/멤버십 영상 |
| statistics.viewCount | number | O | `5237615` | statistics |
| fetchedAt | string(ISO8601) | O | `"2026-06-10T20:08:39.689Z"` | 수집 시각 |

> 실측 주의: 채널 객체의 식별자 키는 `channelId`다 (`id` 아님). statistics는 영상 item의 statistics와 키 구성이 다르다(영상은 view/like/comment).

---

## 2. L1 — 원천: VideoItem / ShortItem (`data/videos.json`, `data/shorts.json`)

두 파일 모두 래퍼 `{ fetchedAt, count, items[] }`. item 스키마는 **동일** (구분은 `isShort` 필드).

| 필드 | 타입 | 필수 | 예시 | 출처 / 실측 주의 |
|------|------|:---:|------|------|
| videoId | string | O | `"6aFrhN_XFI8"` | 조인 키. **PK** |
| title | string | O | `"(바차타) 잭앤질 24관왕..."` | snippet.title. 분류의 1차 단서(태그 거의 없음) |
| description | string | O | `"00:00 인트로..."` | snippet.description. 타임코드/곡목록 다수 |
| publishedAt | string(ISO8601) | O | `"2026-04-20T12:57:59Z"` | snippet.publishedAt |
| duration | string(ISO8601 dur) | O | `"PT9M4S"` | contentDetails.duration |
| durationSeconds | number | O | `544` | 파생. videos 7~5815s / shorts 4~181s |
| thumbnails | Record<ThumbKey, Thumbnail> | O | `{default,medium,high,standard,maxres}` | **maxres는 결측 가능**: videos 41/179, shorts 5/1425 누락 → 폴백 체인 필수 |
| tags | string[] | O (빈 배열) | `[]` | snippet.tags. **videos 87%, shorts 99% 빈 배열** → 분류 근거로 신뢰 불가 |
| statistics.viewCount | number | O | `9311` | statistics |
| statistics.likeCount | number | O | `441` | statistics |
| statistics.commentCount | number | O | `15` | statistics |
| embeddable | boolean | O | `true` | status.embeddable. **실측 전건 true** (false 폴백은 방어적 유지) |
| isShort | boolean \| null | O | `false` | 숏츠 판별. **null=미확정**(추측 금지). 실측 전건 확정 |

> 실측 주의: 숏길이 영상 존재 — `durationSeconds ≤ 183`이면서 `isShort=false`인 영상 49건. 길이만으로 숏츠 판별 불가(HEAD 검증 결과 신뢰).

### Thumbnail
```
{ url: string; width: number; height: number }
```
**ThumbKey 폴백 우선순위 (프론트 필수 구현):** `maxres → standard → high → medium → default`. 단일 키 직접 접근 금지(maxres 결측으로 깨짐).

---

## 3. L2 — 큐레이션 계약: `data/curated.json` ★ 핵심 산출물

**생산자:** content-curator | **소비자:** frontend-lead | **분류 축 기준:** dance-curriculum-taxonomy 스킬

> 분류 enum은 taxonomy 스킬의 **구조(축·evidence·manual·tracks·stats)** 를 따르되, **값은 실데이터(라틴댄스)에 맞게 보정**한다. 스킬 예시의 K-POP enum(`kpop`/`tutorial` 등)은 이 채널과 불일치하므로 아래 보정 enum을 정본으로 한다. (producer-consumer 충돌 → 리더 중재 항목, §6 참조)

### 3.1 래퍼

| 필드 | 타입 | 필수 | 설명 |
|------|------|:---:|------|
| schemaVersion | string | O | `"1.0.0"` — 이 계약 버전. 불일치 시 프론트가 거부 |
| generatedAt | string(ISO8601) | O | 큐레이션 생성 시각 |
| items | CuratedItem[] | O | videoId 참조 분류 레코드 |
| tracks | Track[] | O | 커리큘럼 학습 경로(최소 3, 트랙당 콘텐츠 5건 이상) |
| stats | CuratedStats | O | 축별 분포 (검수용) |

### 3.2 CuratedItem

| 필드 | 타입 | 필수 | enum / 예시 | 비고 |
|------|------|:---:|------|------|
| videoId | string | O | `"6aFrhN_XFI8"` | L1 조인 키. RAW에 없는 id 금지 |
| type | ContentType | O | 아래 enum | 단일값 |
| genre | Genre | O | 아래 enum | 단일값(주 장르) |
| subGenres | Genre[] | △ | `["zouk"]` | 멀티장르(실측 87건) 보조. 없으면 생략 |
| difficulty | Difficulty \| null | △ | `"beginner"` | tutorial/lesson/practice에만. 그 외 null |
| song | Song | △ | `{title,artist}` | 추출 가능 시만(추측 금지) |
| relatedIds | string[] | O (빈 배열) | `["abc123"]` | 영상↔숏츠 매칭. 양방향 기록 |
| evidence | string | O | `"제목에 '(바차타)' + '워크샵'"` | 분류 근거(필수) |
| manual | boolean | O | `false` | true=사람 보정. 자동 재분류가 덮어쓰기 금지 |

### 3.3 Enum 정의 (라틴댄스 보정 — 실측 마커 기반)

**ContentType** (제목 마커 판별, 단서 없으면 `unclassified`):

| 값 | 판별 마커 (실측 빈도) |
|----|------|
| `workshop` | 워크샵(151), 클래스(36), 레슨, class(9) |
| `performance` | 데모(169), 공연(86), 쇼케이스(6), performance |
| `social` | 소셜(102), social, 페스티벌(43), festival(10), 파티 |
| `battle` | 배틀(17), 대회(4), 잭앤질 |
| `fancam` | 직캠(80) |
| `music_mix` | 믹스(10), music mix, playlist, 노동요 |
| `challenge` | 챌린지(6), challenge — 주로 숏츠 |
| `tutorial` | 배우기, 강좌, 튜토리얼, 거울모드, 느리게 |
| `basics` | 기초(2), 스트레칭, 웜업, 풋워크 |
| `vlog_etc` | 일상, 비하인드, 공지, 리뷰 |
| `unclassified` | 단서 불충분 — 별도 목록 보고 |

**Genre** (제목 마커, `(바차타)` 괄호/로마자 우선):

| 값 | 마커 (실측) |
|----|------|
| `bachata` | 바차타(1108), Bachata, 센슈얼/sensual(151), 도미니칸(29) — **69% 점유, 주력** |
| `salsa` | 살사(155) |
| `zouk` | 주크(136), Zouk |
| `kizomba` | 키좀바(4) |
| `latin_pop` | 라틴팝, Latin Pop, Lo-Fi Latin |
| `etc` | 장르 마커 없음(291건 다수가 music_mix) |

> 분포 경고: bachata 단일 69%. taxonomy 규칙 "80% 쏠림 = 변별력 없음"에 근접. 변별은 `type` 축과 `difficulty`가 담당하도록 설계. 장르 단독 필터는 보조 UI로 한정 권고.

**Difficulty** (workshop/tutorial/basics/practice에만, 그 외 `null`):

| 값 | 기준 |
|----|------|
| `beginner` | 기초/왕초보 명시, 느린 템포, 풋워크 입문 |
| `intermediate` | 일반 워크샵/클래스 기본값(명시 단서 없을 때) |
| `advanced` | 고급/고난도 명시, 잭앤질 워크샵, 긴 풀시퀀스 |

### 3.4 Song
```
{ title: string; artist?: string }
```
제목의 「」, '', 대괄호, 곡명·아티스트 패턴에서 추출. 불확실 시 song 자체 생략.

### 3.5 Track (커리큘럼)

| 필드 | 타입 | 필수 | 예시 |
|------|------|:---:|------|
| trackId | string | O | `"bachata-starter"` |
| title | string | O | `"바차타 입문 트랙"` |
| description | string | O | `"기초 풋워크부터 첫 소셜까지"` |
| genre | Genre | O | `"bachata"` — 같은 장르 내 구성 |
| steps | TrackStep[] | O | 순서 있는 학습 경로 |

**TrackStep:** `{ videoId: string; note: string }`
구성 원칙: ① 첫 스텝 beginner ② 난이도 단조 증가 ③ beginner→advanced 점프 금지 ④ 트랙당 5건 이상.

### 3.6 CuratedStats (검수용)
```
{ byType: Record<ContentType, number>;
  byGenre: Record<Genre, number>;
  byDifficulty: Record<string, number>;  // beginner/intermediate/advanced/none
  unclassified: number;
  total: number }
```

---

## 4. L3 — 프론트 View Model (런타임 조인, 정적 파일 아님)

프론트 데이터 훅이 L1(VideoItem) + L2(CuratedItem)를 `videoId`로 조인해 구성. 정의는 `src/lib/types.ts`.

- **ContentCard** = VideoItem ⨝ CuratedItem + 파생 필드(`thumbnailUrl` 폴백 적용, `publishedYear`, `formattedDuration`). 카드 그리드/피드 1차 소비 단위.
- **FeedView** = `{ videos: ContentCard[]; shorts: ContentCard[]; tracks: TrackView[] }`.
- **TrackView** = Track + steps가 ContentCard로 해석된 형태.

조인 정책: curated에 없는 videoId는 `category: "uncurated"`로 표시하되 카드는 노출(데이터 누락이 콘텐츠 소실로 이어지지 않게). curated에 있으나 RAW에 없는 videoId는 **오류**(드롭 + 경고 로그).

---

## 5. 파생 필드 선제 정의 (프론트 미요청分 포함)

정렬·필터에 필요해질 필드를 L3 파생으로 미리 규정(L1/L2 원본은 불변):

| 파생 필드 | 산출 | 용도 |
|----------|------|------|
| thumbnailUrl | maxres→…→default 폴백 | 깨진 썸네일 방지 |
| publishedYear | publishedAt.slice(0,4) | 연도 필터 |
| formattedDuration | durationSeconds → `9:04` | 카드 표기 |
| isPopular | viewCount 상위 백분위 | 인기순 정렬 |

---

## 6. 합의 / 충돌 / 마이그레이션

### Producer–Consumer 충돌 (리더 중재 필요)
- **taxonomy 스킬 enum(K-POP) ↔ 실데이터(라틴댄스) 불일치.** 본 계약은 실데이터를 정본으로 enum을 라틴댄스로 보정함. content-curator는 §3.3 enum을 사용해야 하며, taxonomy 스킬 문서의 enum 예시는 "구조 참조용"으로만 본다. → 스킬 enum 업데이트 여부는 리더 판단.

### 합의 필요 항목 (확정 전)
1. yt-pipeline-engineer(생산자): §1·§2가 스크립트 산출과 일치 확인 — **실데이터 대조 완료, 일치**.
2. frontend-lead(소비자): §3 curated 계약 + §4 view model + `/data/*.json` 경로/배치(§0) 확인 필요.
3. content-curator: §3.3 보정 enum 수용 확인 필요.

### 변경 이력
| 버전 | 날짜 | 변경 | 영향 파일 |
|------|------|------|----------|
| 1.0.0 | 2026-06-11 | 최초 작성. 실데이터 1604건 대조 후 L1/L2/L3 계약 정의 | `src/lib/types.ts` 신규 |

### 마이그레이션 규칙
- 필드 제거·개명은 소비자(프론트 훅·컴포넌트) 전수 조사 후에만. 본 표에 이력 기록.
- 재호출 시 이 문서를 새로 만들지 말고 버전을 올려 증분 수정.
