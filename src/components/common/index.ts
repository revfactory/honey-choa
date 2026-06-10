/**
 * common 컴포넌트 배럴 — 다른 에이전트는 `@/components/common` 에서 가져온다.
 *
 * B1(Phase 4): 이 배럴은 데이터-무관 프리미티브만 re-export 한다.
 * 글로벌 셸(SiteHeader/SiteFooter/MobileTabBar)은 data import(getChannel 등)를
 * 거쳐 curated.json 을 끌어오므로, 이 배럴에 두면 배럴을 import 하는 'use client'
 * 섹션들이 데이터 1.9MB 를 client 청크로 동반한다(Next 의 배럴 트리셰이킹 한계).
 * → 셸은 배럴에서 제외하고 layout.tsx 가 각 파일에서 직접 import 한다.
 *   (셸은 layout 에서만 쓰이므로 배럴 노출이 불필요하다.)
 */
export { Button, type ButtonVariant } from "./Button";
export { DifficultyBadge, GenreBadge, TypeBadge } from "./Badge";
export { FilterChip } from "./FilterChip";
export { VideoCard } from "./VideoCard";
export { ShortsCard } from "./ShortsCard";
export {
  Skeleton,
  VideoCardSkeleton,
  ShortsCardSkeleton,
  CardGridSkeleton,
} from "./Skeleton";
export { EmptyState, ErrorState } from "./StateView";
export { Section, SectionHeader } from "./Section";
export { NAV_ITEMS, CHANNEL_URL, type NavItem } from "./nav-items";
