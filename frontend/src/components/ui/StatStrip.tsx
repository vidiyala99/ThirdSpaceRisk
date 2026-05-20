"use client";

import { ReactNode } from "react";
import { clsx } from "clsx";

interface StatStripProps {
  children: ReactNode;
  className?: string;
}

export function StatStrip({ children, className }: StatStripProps) {
  return <div className={clsx("stat-strip", className)}>{children}</div>;
}
