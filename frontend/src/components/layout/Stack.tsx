import { CSSProperties, ElementType, ReactNode } from "react";

type Gap = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
type Align = "start" | "center" | "end" | "stretch";

interface StackProps {
  children: ReactNode;
  gap?: Gap;
  align?: Align;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export function Stack({
  children,
  gap = "md",
  align,
  as: As = "div",
  className,
  style,
}: StackProps) {
  const css: CSSProperties = {
    ["--tsr-gap" as string]: `var(--space-${gap})`,
    ...style,
  };
  return (
    <As
      data-align={align}
      className={className ? `tsr-stack ${className}` : "tsr-stack"}
      style={css}
    >
      {children}
    </As>
  );
}
