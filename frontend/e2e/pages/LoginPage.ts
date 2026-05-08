import { Page, Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;

  // Tab controls
  readonly signInTab: Locator;
  readonly createAccountTab: Locator;

  // Form fields
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly nameInput: Locator;
  readonly submitButton: Locator;

  // Role picker (sign-up only)
  readonly venueOwnerRoleButton: Locator;
  readonly brokerRoleButton: Locator;

  // Inline error banner
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;

    this.signInTab = page.locator(".login-tab", { hasText: "Sign In" });
    this.createAccountTab = page.locator(".login-tab", { hasText: "Create Account" });

    // Email input rendered by the Input component — label text "Email"
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.nameInput = page.locator('input[placeholder="Your name"]');

    this.submitButton = page.locator('button[type="submit"]');

    this.venueOwnerRoleButton = page.locator(".role-option", { hasText: "Venue Owner" });
    this.brokerRoleButton = page.locator(".role-option", { hasText: "Broker" });

    // The .login-error div rendered when state.error is set
    this.errorBanner = page.locator(".login-error");
  }

  async goto() {
    await this.page.goto("/login");
    await expect(this.signInTab).toBeVisible();
  }

  async signIn(email: string, password: string) {
    await this.signInTab.click();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async switchToCreateAccount() {
    await this.createAccountTab.click();
  }

  async register(name: string, email: string, password: string, role: "venue_operator" | "broker" = "venue_operator") {
    await this.switchToCreateAccount();
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    if (role === "broker") {
      await this.brokerRoleButton.click();
    } else {
      await this.venueOwnerRoleButton.click();
    }
    await this.submitButton.click();
  }
}
