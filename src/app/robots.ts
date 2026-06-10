import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** robots.txt (M3) — 정적 export 호환. 전체 크롤 허용 + sitemap 지시. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
