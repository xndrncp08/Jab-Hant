import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "../Login.jsx";
import { AuthProvider, useAuth } from "../../hooks/useAuth.jsx";

// Mock the API call the login form makes to verify credentials, so these
// tests don't need a real backend running.
vi.mock("../../api/client.js", () => ({
  verifyCredentials: vi.fn(),
}));
import { verifyCredentials } from "../../api/client.js";

function AuthStateProbe() {
  const { isAuthenticated } = useAuth();
  return (
    <div data-testid="auth-state">
      {isAuthenticated ? "authenticated" : "anonymous"}
    </div>
  );
}

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <Login />
        <AuthStateProbe />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("Login form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders accessible, labeled username and password fields", () => {
    renderLogin();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /submit credentials/i }),
    ).toBeInTheDocument();
  });

  it("shows a validation message when submitted empty", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(
      screen.getByRole("button", { name: /submit credentials/i }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/enter both/i);
  });

  it("logs in and updates auth state on correct credentials", async () => {
    verifyCredentials.mockResolvedValue(true);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/username/i), "derran");
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(
      screen.getByRole("button", { name: /submit credentials/i }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent(
        "authenticated",
      );
    });
    expect(verifyCredentials).toHaveBeenCalledWith(
      "derran",
      "correct-password",
    );
  });

  it("shows an error and stays logged out on incorrect credentials", async () => {
    verifyCredentials.mockResolvedValue(false);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/username/i), "derran");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(
      screen.getByRole("button", { name: /submit credentials/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /incorrect username or password/i,
    );
    expect(screen.getByTestId("auth-state")).toHaveTextContent("anonymous");
  });

  it("shows a network error message if the request fails outright", async () => {
    verifyCredentials.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/username/i), "derran");
    await user.type(screen.getByLabelText(/password/i), "anything");
    await user.click(
      screen.getByRole("button", { name: /submit credentials/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't reach the server/i,
    );
  });

  it("disables the submit button while checking credentials", async () => {
    let resolvePromise;
    verifyCredentials.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/username/i), "derran");
    await user.type(screen.getByLabelText(/password/i), "somepass");
    await user.click(
      screen.getByRole("button", { name: /submit credentials/i }),
    );

    expect(screen.getByRole("button", { name: /checking/i })).toBeDisabled();

    // Resolve and wait for the pending state update to flush, so this test
    // doesn't leak an unresolved promise/act() warning into the next test.
    resolvePromise(true);
    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent(
        "authenticated",
      );
    });
  });
});
