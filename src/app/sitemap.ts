import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getAllVideoIds, getTrackIds } from "@/lib/content";

/**
 * sitemap.xml (M3) — 정적 export 호환. 빌드 타임에 전 라우트를 열거해 emit.
 * (output: 'export' 에서는 dynamicParams 없이 빌드 시 1회 생성된다.)
 * trailingSlash: true 와 정합되도록 URL 에 슬래시 부착.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = ["", "learn", "library", "shorts", "about"].map(
    (path) => ({
      url: `${SITE_URL}/${path ? `${path}/` : ""}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })
  );

  const trackRoutes = getTrackIds().map((trackId) => ({
    url: `${SITE_URL}/learn/${trackId}/`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const watchRoutes = getAllVideoIds().map((videoId) => ({
    url: `${SITE_URL}/watch/${videoId}/`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...trackRoutes, ...watchRoutes];
}
