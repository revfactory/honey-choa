/**
 * player 컴포넌트 배럴 (player-integrator 소유)
 * 다른 에이전트·페이지는 `@/components/player` 에서 가져온다.
 */
export { LiteYouTubeEmbed, type LiteYouTubeEmbedProps } from "./LiteYouTubeEmbed";
export {
  WatchPlayer,
  type WatchPlayerProps,
  type WatchPlayerHandle,
} from "./WatchPlayer";
export { WatchPlayerClient } from "./WatchPlayerClient";
export { ShortsFeed, type ShortsFeedProps } from "./ShortsFeed";
export { ShortsFeedClient } from "./ShortsFeedClient";
export {
  buildEmbedUrl,
  youtubeWatchUrl,
  postPlayerCommand,
  EMBED_ALLOW,
  type EmbedParams,
} from "./youtube";
