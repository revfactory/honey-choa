import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { SiteHeader } from "@/components/common/SiteHeader";
import { SiteFooter } from "@/components/common/SiteFooter";
import { MobileTabBar } from "@/components/common/MobileTabBar";

export const metadata: Metadata = {
  // M3: 절대 URL 기준. og/canonical 의 상대경로가 이 base 로 절대화된다.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "꿀초아tv · 라틴댄스 학습",
    template: "%s · 꿀초아tv",
  },
  description:
    "바차타·살사 1,604개 영상을 단계별 학습 동선으로. 꿀초아tv(@youzin) 비공식 큐레이션",
  applicationName: "꿀초아tv",
  alternates: { canonical: "/" },
  openGraph: {
    title: "꿀초아tv · 라틴댄스를 순서대로 배우다",
    description:
      "바차타·살사 1,604개 영상을 단계별 학습 동선으로. 꿀초아tv(@youzin) 비공식 큐레이션",
    type: "website",
    locale: "ko_KR",
    siteName: "꿀초아tv",
    url: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0908",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* hero 폰트 우선 로드(design_system §3) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      </head>
      <body>
        {/* M4: 키보드 사용자용 본문 건너뛰기 링크. 포커스 시에만 노출. */}
        <a href="#main" className="skip-link">
          본문으로 건너뛰기
        </a>
        {/* 글로벌 셸 — 헤더 / 본문 / 푸터 / 모바일 하단 탭바.
            배경 모션 마운트 지점은 motion-engineer 가 layout 또는 페이지에 주입. */}
        <SiteHeader />
        <main id="main" className="min-h-[60dvh]">
          {children}
        </main>
        <SiteFooter />
        <MobileTabBar />
      </body>
    </html>
  );
}
