---
name: interactive-motion
description: "배경 애니메이션·스크롤 인터랙션·마이크로 모션의 구현 패턴과 성능 규칙. 캔버스 파티클, 배경 이펙트, 스포트라이트 효과, 스크롤 등장 애니메이션, 호버 인터랙션, 전환 효과, 모션 성능 최적화 작업 시 반드시 이 스킬을 사용할 것. 모션이 느리다·끊긴다는 피드백 대응도 포함. 모션의 색·컨셉 정의는 honey-choa-design-system 영역."
---

# Interactive Motion — 모션 구현 패턴

## 성능 헌장 (모든 모션의 전제)

1. **합성 전용 속성만 애니메이션**: `transform`, `opacity`, `filter`만. `top/left/width/margin` 애니메이션은 매 프레임 레이아웃을 다시 계산시킨다.
2. **캔버스는 단일 rAF 루프**: 배경 이펙트가 여러 개라도 requestAnimationFrame 루프는 하나로 통합한다. 루프가 N개면 프레임 예산도 N분할된다.
3. **화면 밖이면 정지**: IntersectionObserver로 오프스크린 캔버스의 루프를 멈춘다. 탭 비활성 시 rAF는 자동 정지되지만 화면 밖 정지는 직접 구현해야 한다.
4. **DPR 캡 2.0**: `devicePixelRatio`가 3인 기기에서 캔버스를 3배로 그리면 픽셀 수는 9배가 된다. 시각 차이는 거의 없으므로 2.0으로 캡한다.
5. **reduced-motion은 의무**: `prefers-reduced-motion: reduce`에서는 앰비언트 모션 정지 + 정적 그라데이션 대체, 등장 애니메이션은 즉시 표시.

```ts
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

## 패턴 1: Honey Flow 배경 (캔버스 앰비언트)

꿀이 흐르는 점성의 유체 곡선. 핵심은 **느림** — 빠르면 꿀이 아니라 물이다.

```ts
// 구조: 소수의 대형 블롭(5~8개)을 저속 이동 + 대형 블러
// 1) 오프스크린 캔버스에 블롭을 그리고
// 2) ctx.filter = 'blur(80px)' 로 본 캔버스에 합성 (또는 CSS filter)
// 3) 각 블롭은 사인파 기반 궤도: x = cx + sin(t*speed + phase) * radius
// 색: --honey-glow 계열, 배경 --stage-950 위에 'lighter' 합성
// 속도: 한 사이클 12~20초. 프레임당 이동 1px 미만
```

블롭 수를 늘리는 것보다 블러 반경을 키우는 쪽이 풍성해 보이고 싸다. 파티클 수백 개는 이 컨셉에 맞지 않는다 — 꿀은 입자가 아니라 덩어리다.

## 패턴 2: Spotlight (커서 추적 글로우)

```css
/* CSS 변수 주입 방식 — JS는 좌표만 갱신, 페인트는 CSS가 */
.spotlight {
  background: radial-gradient(600px circle at var(--mx) var(--my),
              var(--honey-glow), transparent 70%);
}
```

```ts
// pointermove에서 직접 스타일 갱신 금지 — rAF로 스로틀 + lerp로 지연 추적
let tx = 0, ty = 0, x = 0, y = 0;
addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
function loop() {
  x += (tx - x) * 0.08; y += (ty - y) * 0.08;  // lerp 0.08 = 꿀의 점성
  el.style.setProperty('--mx', x + 'px');
  el.style.setProperty('--my', y + 'px');
  requestAnimationFrame(loop);
}
```

터치 기기에는 커서가 없다 — 모바일에서는 스크롤 위치 기반 글로우로 대체하거나 비활성화한다.

## 패턴 3: Stage Reveal (스크롤 등장)

```ts
// IntersectionObserver 1개를 공유 — 요소마다 새 옵저버 생성 금지
// threshold: 0.15, 등장 후 unobserve (재등장 반복은 산만함)
// CSS: .reveal { opacity: 0; transform: translateY(24px); }
//      .reveal.in { opacity: 1; transform: none;
//                   transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
// 그리드 아이템은 transition-delay: calc(var(--i) * 60ms) 로 스태거
```

스태거 지연 총합이 0.5s를 넘지 않게 — 카드 20장에 60ms씩이면 마지막 카드는 1.2초를 기다린다. 8장 이후는 지연을 고정하라.

## 패턴 4: Beat Pulse / 마이크로 인터랙션

- CTA 펄스: `scale(1)→scale(1.03)` 0.6s 1회성(호버 시) — 무한 반복 펄스는 시선을 영구히 빼앗으므로 페이지당 1요소 이하
- 카드 호버: `translateY(-4px)` + 글로우 보더 0.2s — JS 불필요, CSS만
- 3D 틸트는 선택 요소: `perspective(800px) rotateX/Y(±6deg)` 이내, pointermove + rAF

## 컴포넌트 인터페이스 규약

모든 모션 컴포넌트는 튜닝 가능한 props를 노출한다 — 디자이너가 코드 수정 없이 조정할 수 있어야 한다:

```ts
interface MotionProps {
  intensity?: number;  // 0~1, 기본 0.6 — 블롭 크기·글로우 강도
  speed?: number;      // 0~1, 기본 0.3 — 앰비언트 주기
  paused?: boolean;    // 외부 제어용
}
```

## 검증 체크리스트 (모션 완성 보고 전 자가 점검)

- [ ] DevTools Performance에서 스크롤 중 프레임 16.7ms 이내인가
- [ ] 화면 밖에서 rAF 루프가 실제로 멈추는가 (console.count로 확인)
- [ ] reduced-motion에서 정적 대체가 보이는가
- [ ] SSR에서 window 참조로 빌드가 깨지지 않는가 (클라이언트 경계 확인)
- [ ] 모바일 뷰포트(390px)에서 모션이 레이아웃을 밀지 않는가
