import { Page, Locator, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;

  // The main headings differ by role
  readonly operatorHeading: Locator;
  readonly brokerHeading: Locator;

  // Venue-operator empty state CTA
  readonly setupVenueCta: Locator;

  // Broker portfolio cards container
  readonly portfolioGrid: Locator;

  // Sidebar nav items
  readonly dashboardNavItem: Locator;
  readonly venuesNavItem: Locator;
  readonly portfolioLabel: Locator;

  constructor(page: Page) {
    this.page = page;

    // Operator h1: "Your shift, defended by evidence."
    this.operatorHeading = page.locator("h1", { hasText: /your shift|defended/i });
    // Broker h1: "The room is louder than the model."
    this.brokerHeading = page.locator("h1", { hasText: /louder|the model/i });

    // The empty-state card links to /venues and contains "Set up your venue"
    this.setupVenueCta = page.locator("h2", { hasText: /set up.*your venue/i });

    // Broker dashboard is now a triage console — "The Book" header in
    // .lc-triage__title replaced the card-grid "Portfolio" .lc-rule__label.
    this.portfolioGrid = page.locator(".lc-triage__title", { hasText: /^The Book$/ });

    // Sidebar navigation links — labels are editorial ("The Book" for dashboard
    // in the v3 sidebar redesign); accept legacy "Dashboard" too for safety.
    this.dashboardNavItem = page.locator(".sidebar-nav-item", { hasText: /The Book|Dashboard/ });
    this.venuesNavItem = page.locator(".sidebar-nav-item", { hasText: "Venues" });

    // Broker-only "Reports" nav item
    this.portfolioLabel = page.locator(".sidebar-nav-item", { hasText: "Reports" });
  }

  async waitForLoad() {
    // Wait until the spinner disappears — page-loading div removed from DOM
    await this.page.waitForSelector(".page-loading", { state: "detached", timeout: 20000 });
  }

  async goto() {
    await this.page.goto("/dashboard");
  }

  async isOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
}
