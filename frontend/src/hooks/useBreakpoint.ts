"use client";

import { useEffect, useState } from "react";

/**
 * Breakpoint tokens — must stay in sync with --bp-* in styles.css.
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 900,
  lg: 1180,
  xl: 1440,
} as const;

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

function pick(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xl) return "xl";
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  if (width >= BREAKPOINTS.sm) return "sm";
  return "xs";
}

/**
 * Returns the current viewport breakpoint as a string token.
 *
 * SSR-safe: returns "lg" on the server and on first client paint to avoid
 * hydration mismatch, then updates to the real value after mount.
 *
 * Consumers that need to gate large structural changes (e.g. mobile bottom-nav
 * vs full sidebar) should pair this with a `mounted` guard so the first paint
 * matches SSR.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>("lg");

  useEffect(() => {
    const update = () => setBp(pick(window.innerWidth));
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  return bp;
}

/**
 * Returns true once the component has mounted on the client.
 * Useful for gating breakpoint-dependent rendering to avoid SSR mismatches.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Convenience: is the viewport at or below the given breakpoint?
 * isAtMost("md") → true for xs, sm, md.
 */
export function isAtMost(current: Breakpoint, max: Breakpoint): boolean {
  const order: Breakpoint[] = ["xs", "sm", "md", "lg", "xl"];
  return order.indexOf(current) <= order.indexOf(max);
}
