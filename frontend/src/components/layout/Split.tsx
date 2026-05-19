import { CSSProperties, ElementType, ReactNode } from "react";

type Gap = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type Collapse = "sm" | "md" | "lg" | "none";

interface SplitProps {
  children: ReactNode;
  /** CSS grid-template-columns. Defaults to two equal columns. */
  cols?: string;
  /** Below which breakpoint the split collapses to a single column. */
  collapse?: Collapse;
  gap?: Gap;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export function Split({
  children,
  cols,
  collapse = "md",
  gap = "lg",
  as: As = "div",
  className,
  style,
}: SplitProps) {
  const css: CSSProperties = {
    ["--tsr-gap" as string]: `var(--space-${gap})`,
    ...(cols ? { ["--tsr-cols" as string]: cols } : {}),
    ...style,
  };
  return (
    <As
      data-collapse={collapse}
      className={className ? `tsr-split ${className}` : "tsr-split"}
      style={css}
    >
      {children}
    </As>
  );
}
