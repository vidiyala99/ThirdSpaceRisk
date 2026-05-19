import { CSSProperties, ElementType, ReactNode } from "react";

type Gap = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface GridProps {
  children: ReactNode;
  /** Minimum column width before wrapping. Defaults to 260px. */
  min?: string;
  gap?: Gap;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export function Grid({
  children,
  min = "260px",
  gap = "md",
  as: As = "div",
  className,
  style,
}: GridProps) {
  const css: CSSProperties = {
    ["--tsr-min" as string]: min,
    ["--tsr-gap" as string]: `var(--space-${gap})`,
    ...style,
  };
  return (
    <As
      className={className ? `tsr-grid ${className}` : "tsr-grid"}
      style={css}
    >
      {children}
    </As>
  );
}
