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

    // h1 contains "Operational Defense" for operators
    this.operatorHeading = page.locator("h1", { hasText: "Operational" });
    // h1 contains "Evidence-First Underwriting" for brokers
    this.brokerHeading = page.locator("h1", { hasText: "Evidence-First" });

    // The empty-state card links to /venues and contains "Set up your venue"
    this.setupVenueCta = page.locator("h2", { hasText: "Set up your venue" });

    // Broker portfolio section header
    this.portfolioGrid = page.locator("text=Portfolio —");

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
