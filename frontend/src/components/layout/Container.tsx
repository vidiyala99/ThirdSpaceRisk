import { ElementType, ReactNode } from "react";

type Variant = "narrow" | "default" | "wide" | "full";

interface ContainerProps {
  children: ReactNode;
  variant?: Variant;
  as?: ElementType;
  className?: string;
}

export function Container({
  children,
  variant = "default",
  as: As = "div",
  className,
}: ContainerProps) {
  return (
    <As
      data-variant={variant}
      className={className ? `tsr-container ${className}` : "tsr-container"}
    >
      {children}
    </As>
  );
}
