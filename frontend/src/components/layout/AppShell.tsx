"use client";

import { ReactNode, Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  CheckSquare,
  FileSearch,
  FileSpreadsheet,
  LogOut,
  Activity,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { useAuth, useRole, useTenantId } from "@/contexts/AuthContext";
import { useBreakpoint, useMounted } from "@/hooks/useBreakpoint";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

interface AppShellProps {
  children: ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  broker: "Broker",
  admin: "Admin",
  venue_operator: "Venue Operator",
};

type NavVariant = "full" | "rail" | "drawer";

interface NavLinksProps {
  role: string | null;
  tenantId: string | null;
  onNavigate: () => void;
  variant?: NavVariant;
}

// Reads useSearchParams() — must be wrapped in <Suspense> by the caller, or
// any page that goes through this layout will fail static prerender.
function NavLinks({ role, tenantId, onNavigate, variant = "full" }: NavLinksProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Priority: ?venue= query (set by dashboard switcher and /compliance,
  // /incidents pages) > /terminal/<id> path > primary tenantId.
  const queryVenueId = searchParams.get("venue");
  const terminalVenueMatch = pathname?.match(/^\/terminal\/([^/]+)/);
  const pathVenueId = terminalVenueMatch?.[1];
  const contextVenueId = queryVenueId ?? pathVenueId ?? tenantId ?? null;
  const venueQuery = contextVenueId ? `?venue=${encodeURIComponent(contextVenueId)}` : "";

  const navItems: Array<{ href: string; label: string; icon: typeof LayoutDashboard; roles?: string[] }> = [
    { href: `/dashboard${venueQuery}`, label: "Dashboard", icon: LayoutDashboard },
    { href: "/underwriter", label: "Reports", icon: FileSearch },
    ...(tenantId
      ? [{
          href: contextVenueId ? `/terminal/${contextVenueId}` : "/terminal",
          label: "Live Terminal",
          icon: Activity,
          roles: ["venue_operator"],
        }]
      : []),
    { href: "/venues", label: "Venues", icon: Building2, roles: ["broker", "admin", "venue_operator"] },
    { href: `/incidents${venueQuery}`, label: "Incidents", icon: AlertTriangle },
    { href: `/compliance${venueQuery}`, label: "Compliance", icon: CheckSquare },
    { href: `/alerts${venueQuery}`, label: "Alerts", icon: Bell },
    { href: "/claims", label: "Claims", icon: FileSpreadsheet },
  ];

  const filtered = navItems.filter(
    (item) => !item.roles || item.roles.includes(role || "")
  );

  return (
    <>
      {filtered.map((item) => {
        const Icon = item.icon;
        const itemPath = item.href.split("?")[0];
        const isActive = pathname === itemPath || pathname?.startsWith(itemPath + "/");
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`sidebar-nav-item sidebar-nav-item--${variant}${isActive ? " active" : ""}`}
            onClick={onNavigate}
            title={variant === "rail" ? item.label : undefined}
            aria-label={item.label}
          >
            <Icon size={18} />
            <span className="sidebar-nav-item__label">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const role = useRole();
  const tenantId = useTenantId();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Breakpoint gating. SSR + first paint render as "full" sidebar.
  const bp = useBreakpoint();
  const mounted = useMounted();
  const sidebarVariant: NavVariant = !mounted
    ? "full"
    : bp === "lg" || bp === "xl"
      ? "full"
      : bp === "md"
        ? "rail"
        : "drawer";
  const showBottomNav = mounted && (bp === "xs" || bp === "sm");

  const handleSignOut = () => {
    signOut();
    router.push("/login");
  };

  const sidebarContent = (
    <>
      <div className="sidebar-brand">
        <div className="sidebar-brand__mark">
          <span className="sidebar-brand__logo"><Building2 size={16} /></span>
          <div className="sidebar-brand__text">
            <h1>Third Space</h1>
            <p>Risk OS</p>
          </div>
        </div>
        <span className="sidebar-mission">Keep venues alive.</span>
      </div>

      <div className="sidebar-user">
        <span className="user-name">{user?.name}</span>
        <span className="user-role">{ROLE_LABELS[user?.role ?? ""] ?? user?.role}</span>
      </div>

      <nav className="sidebar-nav">
        <Suspense fallback={null}>
          <NavLinks
            role={role}
            tenantId={tenantId}
            onNavigate={() => setMobileOpen(false)}
            variant={sidebarVariant}
          />
        </Suspense>
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={handleSignOut}
          className={`sidebar-nav-item sidebar-nav-item--${sidebarVariant}`}
          title={sidebarVariant === "rail" ? "Sign Out" : undefined}
          aria-label="Sign Out"
        >
          <LogOut size={18} />
          <span className="sidebar-nav-item__label">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div
      className="app-shell"
      data-sidebar-variant={sidebarVariant}
      data-bottom-nav={showBottomNav ? "on" : "off"}
    >
      {/* Mobile top bar — visible only when sidebar is in drawer mode */}
      <div className="mobile-nav-bar">
        <span className="brand">Third Space</span>
        <button className="hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
          {mobileOpen ? <X size={22} color="var(--text-primary)" /> : <Menu size={22} color="var(--text-primary)" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`sidebar sidebar--${sidebarVariant}${mobileOpen ? " open" : ""}`}
        aria-label="Primary navigation"
      >
        {sidebarContent}
      </aside>

      <main className="main-content">
        {children}
      </main>

      {showBottomNav && (
        <Suspense fallback={null}>
          <MobileBottomNav />
        </Suspense>
      )}
    </div>
  );
}
