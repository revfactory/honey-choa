---
name: honey-choa-orchestrator
description: "꿀초아tv(@youzin) 댄스 교육 사이트 구축·운영의 15-에이전트 하네스를 조율하는 오케스트레이터. 사이트 구축, 사이트 만들기, 유튜브 데이터 수집·갱신, 콘텐츠 정리, 페이지 추가, 디자인 변경, 모션 추가 등 이 프로젝트의 개발 작업 전반에 반드시 이 스킬을 사용할 것. 후속 작업 — 다시 실행, 재실행, 업데이트, 수정, 보완, 개선, 부분 재실행(예: 디자인만 다시, 데이터만 갱신, 숏츠 피드만 수정), 이전 결과 기반 작업 요청 시에도 반드시 이 스킬을 사용. 단순 질문·파일 1개 수정 같은 경량 작업은 직접 처리 가능."
---

# Honey-Choa Orchestrator — 댄스 교육 사이트 하네스

꿀초아tv 채널(ID: `UCNExEo8zrCEXs6DA6yeEcoA`) 콘텐츠 기반 댄스 교육 사이트를 구축·운영하는 15-에이전트 하네스의 조율 스킬.

## 실행 모드: 하이브리드

| Phase | 작업 | 모드 | 이유 |
|-------|------|------|------|
| 1 | 데이터 파이프라인 | 에이전트 팀 (3명) | 스키마는 생산자-소비자 합의가 필요 — 실시간 조율 |
| 2 | 기획·설계 | 에이전트 팀 (4명) | 기획↔UX↔디자인↔카피의 상호 참조·회람 필수 |
| 3 | 구현 | 에이전트 팀 (5명) + QA 서브 | 구현자 간 경계 조율 + 모듈 완성 즉시 독립 QA |
| 4 | 품질 감사 | 서브 에이전트 (2명 병렬) | 독립 검증 — 팀 통신이 오히려 독립성을 해침 |
| 5 | 릴리스 | 서브 에이전트 (1명) | 단독 수렴 작업, 통신 불필요 |

팀은 세션당 1개만 활성 가능 — Phase 전환 시 반드시 `TeamDelete` 후 다음 팀을 `TeamCreate`한다. 산출물은 `_workspace/`에 보존되므로 다음 팀이 Read로 이어받는다.

## 에이전트 구성 (15명)

| 에이전트 | Phase | 역할 | 주 스킬 | 산출물 |
|---------|-------|------|--------|--------|
| yt-pipeline-engineer | 1 | 유튜브 수집 | youtube-data-pipeline | data/channel·videos·shorts.json |
| data-architect | 1 | 스키마 설계 | youtube-data-pipeline | _workspace/01_schema.md, types |
| content-curator | 1 | 교육 분류 | dance-curriculum-taxonomy | data/curated.json |
| product-strategist | 2 | IA·기능 명세 | (오케스트레이터 명세 표준) | _workspace/02_product_spec.md |
| ux-architect | 2 | 와이어프레임 | honey-choa-design-system | _workspace/02_wireframes.md |
| design-director | 2 | 디자인 시스템 | honey-choa-design-system | _workspace/02_design_system.md |
| copy-writer | 2 | 카피·문구 | dance-curriculum-taxonomy | _workspace/02_copy_deck.md |
| frontend-lead | 3 | 아키텍처·공통 | frontend-standards | 스캐폴딩, common/, lib/ |
| ui-craftsman | 3 | 페이지·섹션 | frontend-standards, honey-choa-design-system | sections/, app/ |
| motion-engineer | 3 | 배경·인터랙션 | interactive-motion | motion/ |
| player-integrator | 3 | 플레이어·피드 | frontend-standards | player/ |
| api-engineer | 3 | 동기화·빌드 통합 | youtube-data-pipeline | scripts/sync.mjs |
| qa-inspector | 3·4 | 경계면 검증 | integration-qa | _workspace/04_qa_report_*.md |
| perf-auditor | 4 | 성능·접근성·SEO | integration-qa | _workspace/04_audit_report.md |
| release-conductor | 5 | 통합·릴리스 | (체크리스트 내장) | README, 05_release_report.md |

모든 Agent/TeamCreate 호출에 `model: "opus"`를 명시한다.

## 워크플로우

### Phase 0: 컨텍스트 확인 (모든 실행의 시작점)

1. `_workspace/`와 `data/`, `src/` 존재 여부 확인
2. 실행 모드 결정:
   - **모두 미존재** → 초기 실행: Phase 1부터 전체 진행
   - **존재 + 부분 수정 요청** (예: "디자인만 바꿔줘", "데이터 갱신해줘") → **부분 재실행**: 아래 라우팅 표로 해당 에이전트만 호출. 단일 에이전트면 서브 모드로 충분
   - **존재 + 새 입력/전면 재구축 요청** → 기존 `_workspace/`를 `_workspace_prev_{YYYYMMDD}/`로 이동 후 초기 실행
3. 부분 재실행 시 이전 산출물 경로를 에이전트 프롬프트에 포함한다 (각 에이전트 정의의 "재호출 지침"이 증분 처리를 담당)

**부분 재실행 라우팅:**

| 요청 유형 | 호출 에이전트 (서브 모드) | 후속 QA |
|----------|------------------------|--------|
| 데이터 갱신·재수집 | yt-pipeline-engineer → content-curator | 경계면 1·2 검증 |
| 분류·트랙 수정 | content-curator | 경계면 4 검증 |
| 디자인·스타일 변경 | design-director → ui-craftsman | 경계면 6 검증 |
| 모션 수정·추가 | motion-engineer | 성능 체크리스트 |
| 페이지·섹션 추가 | ux-architect → ui-craftsman | 해당 모듈 QA |
| 플레이어·피드 수정 | player-integrator | 경계면 5 검증 |
| 카피 수정 | copy-writer → ui-craftsman | 없음 |
| 성능 개선 | perf-auditor → (권고에 따라 구현자) | 재감사 |

### Phase 1: 데이터 파이프라인 — **실행 모드: 에이전트 팀**

1. `_workspace/` 생성, 사전 점검: `GOOGLE_API_KEY` 설정 여부 확인 — 미설정/차단이면 사용자에게 안내 후 중단 (더미 데이터 진행 금지)
2. `TeamCreate(team_name: "data-team", members: [yt-pipeline-engineer, data-architect, content-curator])` — 각 `model: "opus"`
3. TaskCreate:
   - ① 채널 수집 (yt-pipeline-engineer)
   - ② 실데이터 기반 스키마 확정 (data-architect, depends_on: ①)
   - ③ 교육 분류·트랙 구성 (content-curator, depends_on: ①·②)
4. 통신 규칙: 파이프라인 → 큐레이터에게 수집 통계 공유, 큐레이터 → 아키텍트에게 분류 필드 요구
5. 완료 게이트: `data/*.json` 4종 존재 + 스키마 문서 + unclassified 비율 보고
6. `TeamDelete`

### Phase 2: 기획·설계 — **실행 모드: 에이전트 팀**

1. `TeamCreate("design-team", [product-strategist, ux-architect, design-director, copy-writer])`
2. TaskCreate: 명세(전략가) → 와이어프레임(UX, depends_on 명세) ∥ 디자인 시스템(디렉터) ∥ 카피 덱(카피, depends_on 와이어프레임)
3. 통신 규칙: 명세 초안은 UX·디자인에 회람, 디자인 시스템 확정본은 전체 공지
4. 완료 게이트: `_workspace/02_*` 4종 + 디자인 시스템이 `honey-choa-design-system` 스킬에 반영됨
5. `TeamDelete`

### Phase 3: 구현 — **실행 모드: 에이전트 팀 + QA 서브**

1. `TeamCreate("build-team", [frontend-lead, ui-craftsman, motion-engineer, player-integrator, api-engineer])`
2. 순서: frontend-lead가 기반(스캐폴딩+공통+데이터 훅) 완성 공지 → 나머지 4명 병렬 착수 (소유권 표 준수)
3. **Incremental QA**: 팀원이 모듈 완성을 보고할 때마다 리더가 `Agent(qa-inspector, model: "opus", run_in_background: true)`를 서브로 호출해 해당 모듈 즉시 검증. BLOCKER는 담당 팀원에게 SendMessage로 즉시 전달
4. 완료 게이트: `npm run build` 성공 + 모듈별 QA 보고서에 BLOCKER 0건
5. `TeamDelete`

### Phase 4: 품질 감사 — **실행 모드: 서브 에이전트 (병렬)**

단일 메시지에서 동시 호출:
- `Agent(qa-inspector, model: "opus", run_in_background: true)` — 전체 회귀 + 경계면 지도 전 항목
- `Agent(perf-auditor, model: "opus", run_in_background: true)` — 성능·접근성·SEO 감사

결과 수집 후 BLOCKER/기준 미달 항목은 해당 구현 에이전트를 서브로 재호출해 수정 → 수정 항목만 재검증.

### Phase 5: 릴리스 — **실행 모드: 서브 에이전트**

`Agent(release-conductor, model: "opus")` — 통합 빌드, README, 릴리스 리포트. 완료 후 사용자에게 결과 요약 + 알려진 이슈 보고, 피드백 기회 제공 ("개선할 부분이 있나요?").

## 데이터 흐름

```
[Phase 1: data-team]                [Phase 2: design-team]
 yt-pipeline → data/*.json    →    product-spec → wireframes
 data-architect → schema/types →   design-system → copy-deck
 content-curator → curated.json          ↓
                                  [Phase 3: build-team]
                                   frontend-lead 기반 → 4명 병렬 구현
                                       ↓ (모듈 완성마다)
                                   qa-inspector (서브, incremental)
                                       ↓
                                  [Phase 4: 서브 병렬] qa 회귀 ∥ perf 감사
                                       ↓
                                  [Phase 5: 서브] release-conductor → 배포 산출물
```

파일 컨벤션: `_workspace/{phase번호}_{agent}_{artifact}.md`. 중간 산출물은 삭제하지 않는다 (감사 추적).

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| API 키 차단/미설정 (Phase 1) | 즉시 중단, youtube-data-pipeline 스킬의 해결 표를 사용자에게 안내. 더미 데이터 진행 금지 |
| 팀원 1명 실패/유휴 | SendMessage로 상태 확인 → 재시작 → 실패 시 작업을 동일 Phase 팀원에게 재할당 |
| 팀원 과반 실패 | 사용자에게 보고 후 진행 여부 확인 |
| QA BLOCKER 반복 (같은 모듈 2회+) | 담당 에이전트 재호출 대신 frontend-lead에게 구조 검토 요청 (반복 결함은 구조 문제 신호) |
| 산출물 상충 (스키마 vs 구현) | 실데이터를 기준으로 판정, 양측 주장은 출처 병기로 보존 |
| Phase 게이트 미통과 | 다음 Phase로 넘어가지 않는다 — 미완 항목을 명시하고 해소 후 진행 |

## 테스트 시나리오

### 정상 흐름 (초기 구축)
1. 사용자: "사이트 구축해줘" → Phase 0: 빈 프로젝트 확인 → 초기 실행
2. Phase 1: data-team이 수집(영상 N건·숏츠 M건)·스키마·분류 산출
3. Phase 2: design-team이 명세·와이어프레임·디자인 시스템·카피 산출
4. Phase 3: build-team 구현 + 모듈 5건 incremental QA (BLOCKER 0)
5. Phase 4: 회귀 QA + 성능 감사 통과 → Phase 5: 릴리스 리포트
6. 예상 결과: `npm run build` 성공하는 정적 사이트 + README + 05_release_report.md

### 에러 흐름 (API 차단)
1. Phase 1 사전 점검에서 403 API_KEY_SERVICE_BLOCKED 감지
2. 수집 중단, 해결 절차(Cloud Console 키 제한 설정) 안내 후 사용자 응답 대기
3. 키 복구 후 "데이터 수집부터 다시 해줘" → Phase 0이 부분 재실행으로 라우팅 → Phase 1만 재실행 후 정상 흐름 복귀

### 에러 흐름 (구현 결함 반복)
1. Phase 3에서 shorts-feed 모듈 QA가 BLOCKER 2회 반복
2. 리더가 frontend-lead에게 구조 검토 요청 → 컴포넌트 경계 재정의
3. player-integrator 재작업 → QA 통과 → 진행
