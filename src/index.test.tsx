import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { url, Route, Router, useNavigation } from "./index";

// Mock the Navigation API.
const mockNavigation = {
  currentEntry: { index: 0, key: "", id: "", url: "", sameDocument: true },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  navigate: vi.fn(),
};

Object.defineProperty(globalThis, "navigation", {
  value: mockNavigation,
  writable: true,
});

beforeEach(() => {
  mockNavigation.addEventListener.mockClear();
  mockNavigation.removeEventListener.mockClear();
  mockNavigation.navigate.mockClear();
});

describe("url()", () => {
  it("returns a static path as-is", () => {
    expect(url("/about")).toBe("/about");
  });

  it("substitutes params into the pattern", () => {
    expect(url("/users/:id", { id: 42 })).toBe("/users/42");
  });

  it("substitutes multiple params", () => {
    expect(url("/posts/:slug/comments/:cid", { slug: "hello", cid: 5 })).toBe(
      "/posts/hello/comments/5",
    );
  });

  it("encodes param values", () => {
    expect(url("/users/:name", { name: "hello world" })).toBe(
      "/users/hello%20world",
    );
  });
});

describe("Router", () => {
  it("renders the matched route component", () => {
    const routes = [{ url: "/", component: () => <h1>Home</h1> }];

    render(<Router routes={routes} />);
    expect(screen.getByText("Home")).toBeDefined();
  });

  it("renders nothing when no route matches", () => {
    const routes = [{ url: "/about", component: () => <h1>About</h1> }];

    const { container } = render(<Router routes={routes} />);
    expect(container.querySelector("h1")).toBeNull();
  });

  it("renders the wildcard route for unmatched paths", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/unknown" },
      writable: true,
    });

    const routes = [
      { url: "/", component: () => <h1>Home</h1> },
      { url: "*", component: () => <h1>404</h1> },
    ];

    render(<Router routes={routes} />);
    expect(screen.getByText("404")).toBeDefined();

    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
    });
  });

  it("renders children alongside route content", () => {
    const routes = [{ url: "/", component: () => <h1>Home</h1> }];

    render(
      <Router routes={routes}>
        <div data-testid="progress">Loading</div>
      </Router>,
    );

    expect(screen.getByTestId("progress")).toBeDefined();
    expect(screen.getByText("Home")).toBeDefined();
  });
});

describe("Route", () => {
  it("passes href and active state to children", () => {
    const routes = [
      {
        url: "/",
        component: () => (
          <Route href="/about">
            {(route) => (
              <a href={route.href} data-active={route.active}>
                About
              </a>
            )}
          </Route>
        ),
      },
    ];

    render(<Router routes={routes} />);

    const link = screen.getByText("About");
    expect(link.getAttribute("href")).toBe("/about");
    expect(link.getAttribute("data-active")).toBe("false");
  });

  it("marks the current route as active", () => {
    const routes = [
      {
        url: "/",
        component: () => (
          <Route href="/">
            {(route) => (
              <a href={route.href} data-active={String(route.active)}>
                Home
              </a>
            )}
          </Route>
        ),
      },
    ];

    render(<Router routes={routes} />);

    const link = screen.getByText("Home");
    expect(link.getAttribute("data-active")).toBe("true");
  });

  it("calls navigation.navigate for non-anchor elements", () => {
    const routes = [
      {
        url: "/",
        component: () => (
          <Route href="/users/1">
            {(route) => <button onClick={route.handler}>Go</button>}
          </Route>
        ),
      },
    ];

    render(<Router routes={routes} />);

    act(() => {
      screen.getByText("Go").click();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/users/1");
  });

  it("does not call navigation.navigate for anchor elements", () => {
    const routes = [
      {
        url: "/",
        component: () => (
          <Route href="/about">
            {(route) => (
              <a href={route.href} onClick={route.handler}>
                About
              </a>
            )}
          </Route>
        ),
      },
    ];

    render(<Router routes={routes} />);

    act(() => {
      screen.getByText("About").click();
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });
});

describe("useNavigation", () => {
  it("provides idle status by default", () => {
    function Status() {
      const { status } = useNavigation();
      return <span data-testid="status">{status}</span>;
    }

    const routes = [{ url: "/", component: () => <Status /> }];

    render(<Router routes={routes} />);
    expect(screen.getByTestId("status").textContent).toBe("idle");
  });

  it("provides the current url", () => {
    function CurrentUrl() {
      const { url } = useNavigation();
      return <span data-testid="url">{url}</span>;
    }

    const routes = [{ url: "/", component: () => <CurrentUrl /> }];

    render(<Router routes={routes} />);
    expect(screen.getByTestId("url").textContent).toBe("/");
  });
});
