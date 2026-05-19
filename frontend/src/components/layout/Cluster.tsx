import { CSSProperties, ElementType, ReactNode } from "react";

type Gap = "xs" | "sm" | "md" | "lg" | "xl";
type Justify = "start" | "center" | "end" | "between";
type Align = "start" | "center" | "baseline";

interface ClusterProps {
  children: ReactNode;
  gap?: Gap;
  justify?: Justify;
  align?: Align;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export function Cluster({
  children,
  gap = "sm",
  justify,
  align,
  as: As = "div",
  className,
  style,
}: ClusterProps) {
  const css: CSSProperties = {
    ["--tsr-gap" as string]: `var(--space-${gap})`,
    ...style,
  };
  return (
    <As
      data-justify={justify}
      data-align={align}
      className={className ? `tsr-cluster ${className}` : "tsr-cluster"}
      style={css}
    >
      {children}
    </As>
  );
}
