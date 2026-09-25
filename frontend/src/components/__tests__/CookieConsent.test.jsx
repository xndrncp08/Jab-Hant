import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CookieConsent, {
  getStoredConsent,
  hasOptionalConsent,
} from "../CookieConsent.jsx";

function renderBanner() {
  return render(
    <MemoryRouter>
      <CookieConsent />
    </MemoryRouter>,
  );
}

describe("CookieConsent", () => {
  it("shows the banner as a labeled dialog when no choice has been made yet", () => {
    renderBanner();
    const dialog = screen.getByRole("dialog", {
      name: /cookie & storage preferences/i,
    });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("does not render if a consent choice already exists in localStorage", () => {
    localStorage.setItem(
      "job-hunter-cookie-consent",
      JSON.stringify({
        level: "necessary",
        decidedAt: new Date().toISOString(),
      }),
    );
    renderBanner();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("moves focus into the dialog on mount (first focusable element)", () => {
    renderBanner();
    expect(
      screen.getByRole("button", { name: /accept necessary storage only/i }),
    ).toHaveFocus();
  });

  it("'Accept all' stores level=all and hides the banner", async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(
      screen.getByRole("button", { name: /accept all storage/i }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getStoredConsent()).toMatchObject({ level: "all" });
    expect(hasOptionalConsent()).toBe(true);
  });

  it("'Accept necessary only' stores level=necessary and hides the banner", async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(
      screen.getByRole("button", { name: /accept necessary storage only/i }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getStoredConsent()).toMatchObject({ level: "necessary" });
    expect(hasOptionalConsent()).toBe(false);
  });

  it("pressing Escape accepts necessary-only (the safe default) rather than doing nothing", async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getStoredConsent()).toMatchObject({ level: "necessary" });
  });

  it("traps Tab focus within the dialog (wraps from last back to first)", async () => {
    const user = userEvent.setup();
    renderBanner();

    const cookiePolicyLink = screen.getByRole("link", {
      name: /cookie policy/i,
    });
    const necessaryBtn = screen.getByRole("button", {
      name: /accept necessary storage only/i,
    });
    const acceptAllBtn = screen.getByRole("button", {
      name: /accept all storage/i,
    });

    // Focus starts on the "necessary only" button (deliberately, not the
    // link) so keyboard users land on a safe, explicit choice immediately.
    expect(necessaryBtn).toHaveFocus();

    // DOM/tab order inside the dialog is: link, necessary button, accept-all
    // button. From the necessary button, Tab moves to the next element...
    await user.tab();
    expect(acceptAllBtn).toHaveFocus();

    // ...and from the last focusable element, Tab wraps back to the first
    // one in the dialog (the link), rather than escaping the dialog.
    await user.tab();
    expect(cookiePolicyLink).toHaveFocus();
  });

  it("hasOptionalConsent returns false when nothing has been decided yet", () => {
    expect(hasOptionalConsent()).toBe(false);
  });
});
