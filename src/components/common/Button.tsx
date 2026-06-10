import Link from "next/link";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";

/** design_system §5.4 — variant별 비주얼. 최소 높이 44px(터치 타깃). */
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--honey-400)] text-[var(--text-on-honey)] hover:bg-[var(--honey-500)] font-semibold",
  secondary:
    "bg-transparent border border-[var(--honey-400)] text-[var(--honey-300)] hover:bg-[var(--honey-glow)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--stage-800)] hover:text-[var(--text-primary)]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 min-h-[44px] px-[var(--space-6)] " +
  "rounded-[var(--radius-chip)] text-[var(--text-base)] leading-none " +
  "transition-colors duration-[var(--dur-micro)] ease-[var(--ease-hover)] " +
  "disabled:opacity-50 disabled:pointer-events-none select-none";

interface CommonProps {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}

/** href 있으면 next/link 앵커, 없으면 button. external=true면 새 탭. */
type ButtonProps = CommonProps &
  (
    | ({ href: string; external?: boolean } & Omit<
        React.AnchorHTMLAttributes<HTMLAnchorElement>,
        "href" | "className"
      >)
    | ({ href?: undefined } & Omit<
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        "className"
      >)
  );

export function Button(props: ButtonProps) {
  const { variant = "primary", className, children, ...rest } = props;
  const classes = cn(BASE, VARIANT_CLASS[variant], className);

  if ("href" in props && props.href !== undefined) {
    const { href, external, ...anchorRest } =
      rest as React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        href: string;
        external?: boolean;
      };
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
          {...anchorRest}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
