"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, AlertTriangle, CheckSquare, Bell } from "lucide-react";
import { useTenantId } from "@/contexts/AuthContext";

const ITEMS = [
  { key: "dashboard",  href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { key: "incidents",  href: "/incidents",  label: "Incidents",  icon: AlertTriangle },
  { key: "compliance", href: "/compliance", label: "Compliance", icon: CheckSquare },
  { key: "alerts",     href: "/alerts",     label: "Alerts",     icon: Bell },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantId = useTenantId();

  // Mirror the venue-context priority used in AppShell NavLinks so deep links
  // keep their venue when switching via bottom-nav.
  const queryVenueId = searchParams.get("venue");
  const terminalMatch = pathname?.match(/^\/terminal\/([^/]+)/);
  const contextVenueId = queryVenueId ?? terminalMatch?.[1] ?? tenantId ?? null;
  const venueQuery = contextVenueId ? `?venue=${encodeURIComponent(contextVenueId)}` : "";

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary (mobile)">
      {ITEMS.map(({ key, href, label, icon: Icon }) => {
        const fullHref = `${href}${venueQuery}`;
        const isActive = pathname === href || pathname?.startsWith(href + "/");
        return (
          <Link
            key={key}
            href={fullHref}
            className={`mobile-bottom-nav__item${isActive ? " active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            aria-label={label}
          >
            <Icon size={20} aria-hidden />
            <span className="mobile-bottom-nav__label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
