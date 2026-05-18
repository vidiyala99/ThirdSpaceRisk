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

    // Broker portfolio section label (em-dash was removed in redesign)
    this.portfolioGrid = page.locator(".lc-rule__label", { hasText: /^Portfolio$/ });

    // Sidebar navigation links — use role=link with exact name
    this.dashboardNavItem = page.locator(".sidebar-nav-item", { hasText: "Dashboard" });
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
