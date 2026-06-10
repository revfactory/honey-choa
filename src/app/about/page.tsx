import type { Metadata } from "next";
import { AboutPage as AboutSection } from "@/components/sections/about/AboutPage";

export const metadata: Metadata = {
  title: "채널 소개",
  description: "라틴댄스를 같이 놀듯이. 꿀초아tv(@youzin)의 영상을 단계별로 모았어요.",
};

// 채널 소개 `/about` — wireframe §10. 본문: ui-craftsman.
export default function AboutRoute() {
  return <AboutSection />;
}
