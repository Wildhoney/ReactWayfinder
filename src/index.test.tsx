import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Route, Router, useRouter } from "./index";

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

describe("useRouter().url()", () => {
  function UrlTest({
    pattern,
    params,
  }: {
    pattern: string;
    params?: Record<string, string | number>;
  }) {
    const router = useRouter();
    const result = (
      router.url as (
        pattern: string,
        params?: Record<string, string | number>,
      ) => string
    )(pattern, params);
    return <span data-testid="url-result">{result}</span>;
  }

  function renderWithRouter(element: React.ReactNode, base = "") {
    const routes = [{ url: "/", component: () => element }];
    return render(<Router routes={routes} base={base} />);
  }

  it("returns a static path as-is", () => {
    renderWithRouter(<UrlTest pattern="/about" />);
    expect(screen.getByTestId("url-result").textContent).toBe("/about");
  });

  it("substitutes params into the pattern", () => {
    renderWithRouter(<UrlTest pattern="/users/:id" params={{ id: 42 }} />);
    expect(screen.getByTestId("url-result").textContent).toBe("/users/42");
  });

  it("substitutes multiple params", () => {
    renderWithRouter(
      <UrlTest
        pattern="/posts/:slug/comments/:cid"
        params={{ slug: "hello", cid: 5 }}
      />,
    );
    expect(screen.getByTestId("url-result").textContent).toBe(
      "/posts/hello/comments/5",
    );
  });

  it("encodes param values", () => {
    renderWithRouter(
      <UrlTest pattern="/users/:name" params={{ name: "hello world" }} />,
    );
    expect(screen.getByTestId("url-result").textContent).toBe(
      "/users/hello%20world",
    );
  });

  it("prefixes base path", () => {
    renderWithRouter(<UrlTest pattern="/about" />, "/app");
    expect(screen.getByTestId("url-result").textContent).toBe("/app/about");
  });

  it("prefixes base path to root", () => {
    renderWithRouter(<UrlTest pattern="/" />, "/app");
    expect(screen.getByTestId("url-result").textContent).toBe("/app/");
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

describe("useRouter", () => {
  it("provides idle status by default", () => {
    function Status() {
      const router = useRouter();
      return <span data-testid="status">{router.status}</span>;
    }

    const routes = [{ url: "/", component: () => <Status /> }];

    render(<Router routes={routes} />);
    expect(screen.getByTestId("status").textContent).toBe("idle");
  });
});
