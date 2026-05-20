"use client";

import { clsx } from "clsx";
import { ReactNode } from "react";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

interface StatusPillProps {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}

export function StatusPill({ tone = "neutral", children, className }: StatusPillProps) {
  return <span className={clsx("status-pill", `status-pill--${tone}`, className)}>{children}</span>;
}
