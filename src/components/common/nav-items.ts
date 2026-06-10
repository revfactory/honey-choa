/** 글로벌 내비 항목 — copy_deck §1.2. 헤더/탭바/푸터 공유 단일 소스. */
export interface NavItem {
  href: string;
  label: string;
  /** 모바일 하단 탭바 1급 항목 여부(about 제외). */
  inTabBar: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "홈", inTabBar: true },
  { href: "/learn", label: "학습", inTabBar: true },
  { href: "/library", label: "라이브러리", inTabBar: true },
  { href: "/shorts", label: "숏츠", inTabBar: true },
  { href: "/about", label: "소개", inTabBar: false },
];

export const CHANNEL_URL = "https://youtube.com/@youzin";
