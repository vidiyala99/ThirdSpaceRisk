import { Page, Locator, expect } from "@playwright/test";

export class VenuesPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly addVenueButton: Locator;
  readonly venuesGrid: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.locator("h1", { hasText: "Venues" });
    // "Add Venue" button in the page header
    this.addVenueButton = page.locator("button.btn.btn-primary", { hasText: "Add Venue" });
    this.venuesGrid = page.locator(".venues-grid");
  }

  async goto() {
    await this.page.goto("/venues");
    await expect(this.heading).toBeVisible({ timeout: 20000 });
  }

  venueCardByName(name: string): Locator {
    return this.page.locator(".venue-card h3", { hasText: name });
  }
}
