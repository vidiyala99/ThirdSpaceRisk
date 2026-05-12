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
  Menu,
  X,
} from "lucide-react";
import { useAuth, useRole, useTenantId } from "@/contexts/AuthContext";

interface AppShellProps {
  children: ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  broker: "Broker",
  admin: "Admin",
  venue_operator: "Venue Operator",
};

interface NavLinksProps {
  role: string | null;
  tenantId: string | null;
  onNavigate: () => void;
}

// Reads useSearchParams() — must be wrapped in <Suspense> by the caller, or
// any page that goes through this layout will fail static prerender.
function NavLinks({ role, tenantId, onNavigate }: NavLinksProps) {
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
    { href: "/underwriter", label: "Reports", icon: FileSearch, roles: ["broker", "admin"] },
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
            className={`sidebar-nav-item ${isActive ? "active" : ""}`}
            onClick={onNavigate}
          >
            <Icon size={18} />
            <span>{item.label}</span>
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

  const handleSignOut = () => {
    signOut();
    router.push("/login");
  };

  const sidebarContent = (
    <>
      <div className="sidebar-brand">
        <h1>Third Space</h1>
        <p>Risk OS</p>
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
          />
        </Suspense>
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleSignOut} className="sidebar-nav-item">
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      {/* Mobile nav bar */}
      <div className="mobile-nav-bar">
        <span className="brand">Third Space</span>
        <button className="hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
          {mobileOpen ? <X size={22} color="var(--text-primary)" /> : <Menu size={22} color="var(--text-primary)" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar${mobileOpen ? " open" : ""}`}>
        {sidebarContent}
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
