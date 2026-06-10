import type { Metadata } from "next";
import { LearnHub } from "@/components/sections/learn/LearnHub";

export const metadata: Metadata = {
  title: "학습 트랙",
  description: "어디서 시작할지 모르겠다면, 여기서부터. 순서대로 따라가는 라틴댄스 학습 트랙.",
};

// 학습 허브 `/learn` — wireframe §5. 본문: ui-craftsman.
export default function LearnPage() {
  return <LearnHub />;
}
