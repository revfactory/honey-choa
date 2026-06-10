/** @type {import('next').NextConfig} */
const nextConfig = {
  // 정적 내보내기 — 서버 불필요. 데이터는 빌드 타임 JSON.
  output: "export",
  reactStrictMode: true,
  // 상위 디렉토리의 lockfile 자동 추론 경고 차단 — 이 프로젝트가 워크스페이스 루트.
  outputFileTracingRoot: import.meta.dirname,
  images: {
    // next/image 최적화는 정적 export에서 빌드 서버가 없으므로 비활성.
    // 유튜브 썸네일은 원본 도메인에서 직접 lazy-load 한다.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
    ],
  },
  // 정적 호스팅에서 새로고침 404 방지(디렉토리/index.html)
  trailingSlash: true,
};

export default nextConfig;
