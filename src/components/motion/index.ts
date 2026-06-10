// motion-engineer 배럴 export — ui-craftsman/player-integrator 는 여기서 가져온다.
//   import { HeroBackground, Reveal, BeatPulse, HoverTilt, PageTransition } from "@/components/motion";
//
// 모든 컴포넌트: 'use client', transform/opacity 전용, prefers-reduced-motion 폴백 내장.

export { default as HeroBackground } from "./HeroBackground";
export type { HeroBackgroundProps } from "./HeroBackground";

export { default as HoneyFlowBackground } from "./HoneyFlowBackground";
export type { HoneyFlowBackgroundProps } from "./HoneyFlowBackground";

export { default as Spotlight } from "./Spotlight";
export type { SpotlightProps } from "./Spotlight";

export { default as Reveal } from "./Reveal";
export type { RevealProps } from "./Reveal";

export { default as BeatPulse } from "./BeatPulse";
export type { BeatPulseProps } from "./BeatPulse";

export { default as HoverTilt } from "./HoverTilt";
export type { HoverTiltProps } from "./HoverTilt";

export { default as PageTransition } from "./PageTransition";
export type { PageTransitionProps } from "./PageTransition";

export { useReducedMotion } from "./useReducedMotion";
