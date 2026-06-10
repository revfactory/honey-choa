/**
 * src/components/player/youtube.ts — 유튜브 임베드 공유 유틸 (player-integrator 소유)
 * ----------------------------------------------------------------------------
 * frontend-standards 유튜브 임베드 규약:
 *   - 도메인은 youtube-nocookie.com 고정 (개인정보·쿠키 최소화)
 *   - 문서화된 파라미터만 사용 (비공식 트릭 금지 — 정책 변경 한 번에 전체가 깨진다)
 *   - 모바일 자동재생은 음소거 시에만 동작 → autoplay 실패 전제로 재생 버튼 항상 노출
 *
 * 이 모듈은 순수 함수만 노출한다. iframe 마운트/언마운트는 컴포넌트가 담당.
 */

/** youtube-nocookie 임베드 베이스. enablejsapi=1 로 postMessage 제어(타임코드 seek) 가능. */
const EMBED_BASE = "https://www.youtube-nocookie.com/embed";

export interface EmbedParams {
  /** 자동재생 시도. 모바일은 mute 동반해야 실제 재생됨. 기본 true(클릭으로 마운트되므로). */
  autoplay?: boolean;
  /** 음소거 시작. 숏츠 피드처럼 자동재생 보장이 필요하면 true. */
  muted?: boolean;
  /** 종료 후 같은 채널 관련영상 노출 억제(rel=0). 기본 true. */
  noRelated?: boolean;
  /** 반복 재생(숏츠 피드). loop=1 단독은 무효 → playlist=videoId 동반 필요. */
  loop?: boolean;
  /** 컨트롤 표시. 0이면 숨김(숏츠 몰입). 기본 1. */
  controls?: boolean;
  /** IFrame Player API(postMessage) 활성. 타임코드 seek·재생제어에 필요. 기본 false. */
  jsApi?: boolean;
  /** 시작 지점(초). 타임코드 딥링크. */
  start?: number;
  /** 재생 페이지 출처(origin). jsApi 사용 시 권장(보안). 클라에서 location.origin 주입. */
  origin?: string;
}

/**
 * 임베드 URL 생성. 문서화된 IFrame Player 파라미터만 사용한다.
 * 참조: developers.google.com/youtube/player_parameters
 */
export function buildEmbedUrl(videoId: string, params: EmbedParams = {}): string {
  const {
    autoplay = true,
    muted = false,
    noRelated = true,
    loop = false,
    controls = true,
    jsApi = false,
    start,
    origin,
  } = params;

  const q = new URLSearchParams();
  if (autoplay) q.set("autoplay", "1");
  if (muted) q.set("mute", "1");
  if (noRelated) q.set("rel", "0");
  if (!controls) q.set("controls", "0");
  if (loop) {
    q.set("loop", "1");
    // loop=1 은 단독으로 동작하지 않는다 — playlist 에 자기 자신을 넣어야 반복(공식 문서).
    q.set("playlist", videoId);
  }
  if (jsApi) q.set("enablejsapi", "1");
  if (typeof start === "number" && start > 0) q.set("start", String(Math.floor(start)));
  if (origin) q.set("origin", origin);
  // 모던 임베드 권장 파라미터(문서화됨).
  q.set("playsinline", "1"); // iOS 인라인 재생(전체화면 강제 방지)

  return `${EMBED_BASE}/${videoId}?${q.toString()}`;
}

/** iframe allow 속성 — 자동재생·전체화면·PiP 허용(frontend-standards 규약 값). */
export const EMBED_ALLOW =
  "autoplay; encrypted-media; picture-in-picture; fullscreen";

/** 임베드 차단(embeddable=false) 시 유튜브 새 탭 폴백 URL. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * IFrame Player API 로 제어 명령 전송(타임코드 seek 등).
 * enablejsapi=1 임베드에 postMessage 로 함수 호출. SDK 로드 불필요(경량).
 * 참조: IFrame API postMessage 프로토콜.
 */
export function postPlayerCommand(
  iframe: HTMLIFrameElement | null,
  func: "seekTo" | "playVideo" | "pauseVideo" | "mute" | "unMute" | "stopVideo",
  args: Array<number | boolean> = []
): void {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: "command", func, args }),
    "*"
  );
}
