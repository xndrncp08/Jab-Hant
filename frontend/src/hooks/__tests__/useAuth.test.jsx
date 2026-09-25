import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../useAuth.jsx";

function TestConsumer() {
  const { isAuthenticated, login, logout, authHeader } = useAuth();
  return (
    <div>
      <div data-testid="auth-state">
        {isAuthenticated ? "authenticated" : "anonymous"}
      </div>
      <div data-testid="auth-header">{JSON.stringify(authHeader)}</div>
      <button onClick={() => login("alice", "sekret")}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function renderConsumer() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

describe("useAuth", () => {
  it("starts logged out when sessionStorage is empty", () => {
    renderConsumer();
    expect(screen.getByTestId("auth-state")).toHaveTextContent("anonymous");
    expect(screen.getByTestId("auth-header")).toHaveTextContent("{}");
  });

  it("logs in, stores an Authorization header, and persists to sessionStorage", async () => {
    const user = userEvent.setup();
    renderConsumer();

    await user.click(screen.getByText("login"));

    expect(screen.getByTestId("auth-state")).toHaveTextContent("authenticated");
    const expected = `Basic ${btoa("alice:sekret")}`;
    expect(screen.getByTestId("auth-header")).toHaveTextContent(expected);
    expect(sessionStorage.getItem("job-hunter-auth")).toBe(
      btoa("alice:sekret"),
    );
  });

  it("logs out and clears sessionStorage", async () => {
    const user = userEvent.setup();
    renderConsumer();

    await user.click(screen.getByText("login"));
    expect(screen.getByTestId("auth-state")).toHaveTextContent("authenticated");

    await user.click(screen.getByText("logout"));
    expect(screen.getByTestId("auth-state")).toHaveTextContent("anonymous");
    expect(sessionStorage.getItem("job-hunter-auth")).toBeNull();
  });

  it("picks up a credential already in sessionStorage on mount", () => {
    sessionStorage.setItem("job-hunter-auth", btoa("bob:hunter2"));
    renderConsumer();
    expect(screen.getByTestId("auth-state")).toHaveTextContent("authenticated");
  });
});
