"use client";

import { ComponentType } from "react";
import Link from "next/link";
import { clsx } from "clsx";

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  active?: boolean;
  badge?: number;
  variant?: "full" | "rail";
  onClick?: () => void;
}

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  variant = "full",
  onClick,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx("sidebar-nav-item", active && "sidebar-nav-item--active", `sidebar-nav-item--${variant}`)}
      aria-current={active ? "page" : undefined}
      title={variant === "rail" ? label : undefined}
    >
      <Icon size={16} aria-hidden />
      {variant === "full" ? <span className="sidebar-nav-item__label">{label}</span> : null}
      {badge && badge > 0 && variant === "full" ? (
        <span className="sidebar-nav-item__badge">{badge}</span>
      ) : null}
    </Link>
  );
}
