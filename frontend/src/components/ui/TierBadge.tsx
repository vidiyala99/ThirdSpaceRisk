"use client";

import { clsx } from "clsx";

export type Tier = "A" | "B" | "C" | "D";

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  return <span className={clsx("tier-badge", `tier-badge--${tier.toLowerCase()}`, className)}>{tier}</span>;
}
