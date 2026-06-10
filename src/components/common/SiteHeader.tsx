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
 * 상단 sticky 헤더 — design_system §5.6.
 * stage-950 88% + backdrop blur + 하단 stage-700 보더.
 * 좌측 로고(워드마크), 우측 메뉴. 활성 메뉴는 honey-300 + 하단 인디케이터.
 * (스크롤 축소·테마토글은 motion-engineer/후속 확장 지점.)
 */
export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  return (
    <header
      className="sticky top-0 z-[var(--z-sticky-nav)] border-b border-[var(--stage-700)] backdrop-blur-[12px]"
      style={{ backgroundColor: "color-mix(in srgb, var(--stage-950) 88%, transparent)" }}
    >
      <div className="mx-auto flex h-[64px] max-w-[var(--content-max)] items-center justify-between px-[var(--gutter)]">
        <Link
          href="/"
          aria-label="꿀초아tv 홈으로"
          className="font-[family-name:var(--font-display)] text-[length:var(--text-h3)] font-extrabold text-[var(--text-primary)]"
        >
          꿀초아tv
        </Link>

        <nav aria-label="주요 메뉴" className="hidden md:block">
          <ul className="flex items-center gap-[var(--space-6)]">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="relative">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "text-[length:var(--text-base)] transition-colors",
                      active
                        ? "text-[var(--honey-300)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {item.label}
                  </Link>
                  {active && (
                    <span
                      aria-hidden
                      className="absolute -bottom-[21px] left-0 h-0.5 w-full bg-[var(--honey-400)]"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
