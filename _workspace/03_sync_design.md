# 03 · 데이터 동기화 파이프라인 설계 (api-engineer)

**작성:** api-engineer · Phase 3
**소유:** `scripts/sync.mjs`, 데이터 갱신 자동화, `package.json` sync 스크립트 항목
**상태:** 구현·검증 완료. 빌드 게이트(`npm run build` ✓ / `typecheck` ✓) 통과 데이터로 동작.

> 이 문서는 sync 파이프라인의 계약·검증 규칙·운영 절차를 명문화한다.
> 게이트 규칙 변경은 스크립트 주석이 아니라 이 문서의 §3·§7 에 사유와 함께 기록한다.

---

## 1. 명령어 / 옵션 / 환경변수

| 명령 | 동작 | API 호출 | data/ 변경 |
|------|------|:---:|:---:|
| `npm run sync` | 전체 갱신: 수집→L1검증→분류→L2검증→원자적 교체→보고 | O | 검증 통과 시만 |
| `npm run data:sync` | `sync` 별칭(동일) | O | 검증 통과 시만 |
| `npm run sync -- --dry-run` | 수집+L1 검증만, 보고 후 폐기 | O | 변경 안 함 |
| `npm run sync -- --max <N>` | 수집 상한 N건(쿼터 절약·테스트) | O | 검증 통과 시만 |
| `npm run data:validate` | 기존 data/ 만 검증(`--validate-only`) | **X** | 변경 안 함 |

- **환경변수 `GOOGLE_API_KEY` 필수**(수집 모드). 하드코딩 금지 — 코드·파일 어디에도 키 없음.
- `--validate-only` 는 키 없이도 동작(CI 의 빌드 전 데이터 게이트로 사용 가능).
- 옵션 조합 가능: `npm run sync -- --dry-run --max 100`.

### 종료 코드 (자동화 분기용)
| 코드 | 의미 | data/ 상태 |
|:---:|------|------|
| 0 | 성공 / dry-run·validate 통과 | 갱신됨(또는 무변경) |
| 1 | 설정 오류(키 없음, 인자 오류) | **무변경** |
| 2 | 수집/API 오류 | **무변경(보존)** |
| 3 | 검증 게이트 실패 | **무변경(복원)** |

> **sync 실패 ≠ build 실패.** 키 차단/만료·부분 수집은 기존 data/ 를 보존/복원하므로
> `npm run build` 는 직전 정상 데이터로 항상 계속 가능하다.

---

## 2. 파이프라인 단계 (원자성 보장)

```
[수집] fetch_channel_resilient.mjs --out .sync-staging
   │   (실패→staging 폐기, data/ 무변경, exit 2)
   ▼
[L1 검증] .sync-staging 의 channel/videos/shorts
   │   (실패→staging 폐기, data/ 무변경, exit 3)
   ▼
[백업] data/*.json → .sync-backup  (교체 직전 스냅샷)
   ▼
[L1 승격] staging channel/videos/shorts → data/   (curated 아직 미변경)
   ▼
[분류] classify.mjs  (data/videos+shorts 읽고, 기존 curated 의 manual:true 보존하며 새 curated 작성)
   │   (실패→백업 복원, exit 2)
   ▼
[L2 검증] data/curated.json
   │   (실패→백업 복원, exit 3)
   ▼
[성공] staging·backup 정리, 보고, exit 0
```

- **원자성:** 새 데이터는 항상 `.sync-staging/` 에 먼저 쓰고, L1 통과 후에만 data/ 로 승격.
  분류·L2 단계에서 실패하면 `.sync-backup/` 스냅샷으로 **전체 복원**한다.
  분류가 data/ 를 직접 쓰는 구조(아래 §6)라 백업-복원 방식으로 원자성을 확보했다.
- 두 임시 디렉토리(`.sync-staging`, `.sync-backup`)는 성공·실패 양쪽에서 정리된다.
  (.gitignore 권고 — frontend-lead 의 `public/data` 와 동일 취급)

---

## 3. 검증 게이트 규칙 (근거성 90)

### L1 — channel/videos/shorts
- `channel.json`: 필수 필드(`channelId,title,statistics,fetchedAt`), `channelId === UCNExEo8zrCEXs6DA6yeEcoA`, `statistics.videoCount` 존재.
- `videos.json`/`shorts.json`: `items` 배열, 각 item 필수 필드(`videoId,title,duration,durationSeconds,thumbnails,statistics,isShort,tags[]`).
- **건수 급감 게이트:** 직전 대비 **30% 초과 감소** 시 중단(exit 3).
  - **사유:** API 일시 장애로 절반만 수집된 데이터가 배포되면 사이트 콘텐츠가 통째로 누락된다. 정상 운영에서 영상이 30% 이상 사라질 일은 없으므로(삭제는 점진적), 30% 초과 급감은 수집 결함의 강한 신호다.
- `videos` 최소 1건(0건은 무조건 실패).
- `isShort === null`(판별 미확정)은 **경고만**(치명 아님) — 추측 분류 금지 원칙상 보고서에 명시하되 빌드는 막지 않는다.

### L2 — curated.json
- `schemaVersion === "1.0.0"` — **불일치 시 프론트(`src/lib/content.ts`)가 빌드 throw**하므로 여기서 선제 차단.
- `items`/`tracks`/`stats` 구조 존재.
- **enum 유효성:** `type`(11종), `genre`(6종), `difficulty`(beginner/intermediate/advanced 또는 null) — 스키마 §3.3 정본.
- **참조 무결성:** 모든 curated `videoId` 가 RAW(videos+shorts)에 존재해야 함. 고아 id 는 조인 시 드롭되므로 오류로 본다.
- 각 item: `evidence`(비어있지 않은 문자열), `manual`(boolean), `relatedIds`(배열) 필수.
- `tracks` ≥ 3, 각 track `steps` ≥ 5 (스키마 §3.1·§3.5).
- curated 건수 급감(-30% 초과) 게이트.

> 게이트 임계값(`DROP_THRESHOLD=0.30`, `MIN_TRACKS=3` 등)은 `scripts/sync.mjs` 상단 상수로 모아두었다. **변경 시 이 문서 §3·§7 에 사유를 먼저 기록**하고 상수를 수정한다.

---

## 4. manual:true 보존 (계획성 85)

- 자동 갱신이 사람의 수동 보정(난이도 수정 등)을 덮어쓰지 않는다.
- 보존은 `classify.mjs` 가 담당: 기존 `data/curated.json` 에서 `manual:true` 항목을 읽어
  videoId 별로 그대로 이월하고, 나머지만 규칙 기반으로 재분류한다.
- sync 는 분류 **전에** 기존 curated 를 백업하고, 분류 **후** L2 검증 + 보고에서
  `manual보존 N건` 을 출력해 보존 결과를 가시화한다.
- **필드 우선순위:** manual 항목 = 사람 보정값이 자동 분류값보다 우선(전체 레코드 이월).

---

## 5. 보고 형식 (사회성 30 — 기계적 명확성)

성공 시 stderr 에 출력:
```
================= 동기화 보고 =================
신규(N): _건  /  갱신(M): _건  /  삭제: _건  /  실패(K): 0건
전체 RAW: _건 (videos+shorts)
  videos=_ (이전 _), shorts=_ (이전 _)
큐레이션: items=_, tracks=_, manual보존=_건, unclassified=_
==============================================
```
- 신규 = 이전에 없던 videoId, 갱신 = 제목/조회수/좋아요 변동, 삭제 = 이전엔 있었으나 사라진 id.
- 모든 로그는 stderr(`[sync]` 프리픽스), 데이터 산출물은 파일 → 파이프 안전.

---

## 6. 협력 / 단일 소스 / 알려진 드리프트

- **수집:** `_workspace/fetch_channel_resilient.mjs`(인계서 지정 검증본)를 자식 프로세스로 호출. 로직 미복제.
- **분류:** `_workspace/classify.mjs`(content-curator 소유)를 자식 프로세스로 호출.
  - classify 는 경로가 프로젝트 루트 `data/` 에 하드코딩되어 있어 임시 디렉토리로 리다이렉트 불가.
    → sync 는 백업-후-실행-실패시-복원 패턴으로 원자성을 우회 확보(§2).
- **⚠ 드리프트 보고(리더·yt-pipeline-engineer 판단 필요):**
  - 스킬 번들 `.claude/skills/youtube-data-pipeline/scripts/fetch_channel.mjs` 의 `ytRetry` 는 `tries=3`, 5xx 만 재시도.
  - 인계서 지정 `_workspace/fetch_channel_resilient.mjs` 는 `tries=8` + 키 전파 불균일 `expired`(badRequest) 재시도 포함 — **검증된 상위 호환본**.
  - 단일 소스 원칙상 둘 중 하나로 수렴해야 하나, 스킬 번들 수정은 본 작업 범위(소유권) 밖이라 보류.
  - **권고:** resilient 변형을 스킬 번들 정본으로 승격(또는 그 반대)해 드리프트 제거. sync.mjs 는 인계서 지정대로 resilient 본을 호출 중이므로, 정본이 바뀌면 `FETCH_SCRIPT` 경로 한 줄만 바꾸면 된다.

---

## 7. 운영 절차 + 향후 CI 확장

### 수동 갱신(현재)
```bash
export GOOGLE_API_KEY=<유효한 키>
npm run sync -- --dry-run    # 1) 먼저 dry-run 으로 수집·L1 확인(권장)
npm run sync                 # 2) 실제 갱신(원자적)
npm run build                # 3) prebuild copy-data 가 public/data 반영, 정합 빌드
```

### 향후 CI 스케줄(확장 포인트)
- 주기 실행(예: 주 1회) 시 `npm run sync` → 종료 코드 분기:
  - `0`: 변경분 커밋/배포.
  - `2`(API): 알림만, 기존 데이터로 재배포 불필요(무변경).
  - `3`(검증): 알림 + 차단. data/ 는 복원되어 있으므로 직전 빌드 유지.
- 빌드 전 게이트로 `npm run data:validate`(키 불필요)를 파이프라인 앞단에 둘 수 있다.
- 쿼터: 전체 수집 ~30유닛(일 10,000). 주기 실행해도 안전.

### 키 차단/만료 대응
- `API_KEY_SERVICE_BLOCKED`/`forbidden`: Cloud Console > 사용자 인증 정보 > 키 > API 제한사항에
  YouTube Data API v3 추가(또는 프로젝트에서 API 사용 설정). 전파에 수 분 소요.
  resilient 본이 일시 `expired` 는 자동 재시도하나, 영구 차단은 즉시 exit 2 + 진단 메시지.
- 어느 경우든 **기존 data/ 보존** → 빌드 계속 가능.

---

## 8. 검증 로그 (구현 시점)
- `npm run data:validate` ✓ — 기존 data/(curated 1604건) 게이트 통과, exit 0.
- 변조 테스트 ✓ — schemaVersion/enum/고아참조 주입 시 4건 검출 + exit 3.
- 건수 급감 산술 ✓ — videos 179→100(-44.1%) 차단, shorts 1425→1200(-15.8%) 통과.
- 키 부재 ✓ — exit 1, data/ 무변경.
- 실 API dry-run(`--max 100`) — 현재 환경의 `GOOGLE_API_KEY` 가 `forbidden`(API_KEY_SERVICE_BLOCKED)
  반환 → sync 가 정확히 진단·exit 2·staging 정리·data/ 보존(1604건 유지). **더미 데이터 미사용.**
  (유효 키 확보 후 `npm run sync` 1회로 실제 갱신 검증 가능.)
- `npm run build` ✓ — exit 0, 1,615 static pages(데이터 무변경).
