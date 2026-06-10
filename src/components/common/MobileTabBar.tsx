"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/components/common/nav-items";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * 모바일 하단 탭바 — spec §2.1 / copy_deck §1.2.
 * 1급 항목 4개(홈/학습/라이브러리/숏츠). about은 제외.
 * md 이상에서 숨김. 숏츠 풀스크린 피드와 충돌 시 페이지에서 숨김 처리(후속).
 */
export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const items = NAV_ITEMS.filter((i) => i.inTabBar);

  return (
    <nav
      aria-label="모바일 메뉴"
      className="fixed inset-x-0 bottom-0 z-[var(--z-sticky-nav)] border-t border-[var(--stage-700)] backdrop-blur-[12px] md:hidden"
      style={{ backgroundColor: "color-mix(in srgb, var(--stage-950) 92%, transparent)" }}
    >
      <ul className="flex items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[length:var(--text-xs)]",
                  active ? "text-[var(--honey-300)]" : "text-[var(--text-muted)]"
                )}
              >
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
