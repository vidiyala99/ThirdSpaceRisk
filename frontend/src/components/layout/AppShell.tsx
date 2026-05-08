"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  CheckSquare,
  FileSearch,
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

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const role = useRole();
  const tenantId = useTenantId();
  const [mobileOpen, setMobileOpen] = useState(false);

  // When the user is viewing a specific venue's terminal, the Incidents link
  // should keep that context so they don't get bounced to a global view.
  const terminalVenueMatch = pathname?.match(/^\/terminal\/([^/]+)/);
  const contextVenueId = terminalVenueMatch?.[1];
  const incidentsHref = contextVenueId
    ? `/incidents?venue=${encodeURIComponent(contextVenueId)}`
    : "/incidents";

  // Operators with no tenant_id (mid-onboarding) shouldn't see a Live Terminal
  // link at all — better than silently routing them to someone else's venue.
  const navItems: Array<{ href: string; label: string; icon: typeof LayoutDashboard; roles?: string[] }> = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/underwriter", label: "Reports", icon: FileSearch, roles: ["broker", "admin"] },
    ...(tenantId
      ? [{ href: `/terminal/${tenantId}`, label: "Live Terminal", icon: Activity, roles: ["venue_operator"] }]
      : []),
    { href: "/venues", label: "Venues", icon: Building2, roles: ["broker", "admin", "venue_operator"] },
    { href: incidentsHref, label: "Incidents", icon: AlertTriangle },
    { href: "/compliance", label: "Compliance", icon: CheckSquare },
  ];

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(role || "")
  );

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
          {filteredNav.map((item) => {
            const Icon = item.icon;
            // Compare against the path portion only — query strings (e.g. ?venue=)
            // shouldn't break the active state.
            const itemPath = item.href.split("?")[0];
            const isActive = pathname === itemPath || pathname?.startsWith(itemPath + "/");
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
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
