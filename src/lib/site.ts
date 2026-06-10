/**
 * src/lib/site.ts — 사이트 레벨 상수 (frontend-lead 소유)
 *
 * 절대 URL 기준(metadataBase·sitemap·canonical·og)의 단일 출처.
 * 배포 도메인 확정 전까지 placeholder. 빌드 시 NEXT_PUBLIC_SITE_URL 로 주입한다.
 *   예: NEXT_PUBLIC_SITE_URL=https://honey-choa.example npm run build
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://honey-choa.pages.dev";

export const SITE_NAME = "꿀초아tv";
