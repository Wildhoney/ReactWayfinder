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
    const routes = [{ url: "/", match: () => element }];
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
    const routes = [{ url: "/", match: () => <h1>Home</h1> }];

    render(<Router routes={routes} />);
    expect(screen.getByText("Home")).toBeDefined();
  });

  it("renders nothing when no route matches", () => {
    const routes = [{ url: "/about", match: () => <h1>About</h1> }];

    const { container } = render(<Router routes={routes} />);
    expect(container.querySelector("h1")).toBeNull();
  });

  it("renders the wildcard route for unmatched paths", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/unknown" },
      writable: true,
    });

    const routes = [
      { url: "/", match: () => <h1>Home</h1> },
      { url: "*", match: () => <h1>404</h1> },
    ];

    render(<Router routes={routes} />);
    expect(screen.getByText("404")).toBeDefined();

    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
    });
  });

  it("renders children alongside route content", () => {
    const routes = [{ url: "/", match: () => <h1>Home</h1> }];

    render(
      <Router routes={routes}>
        <div data-testid="progress">Loading</div>
      </Router>,
    );

    expect(screen.getByTestId("progress")).toBeDefined();
    expect(screen.getByText("Home")).toBeDefined();
  });

  it("redirects on initial mount via the redirect prop", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/cats" },
      writable: true,
    });

    const routes = [
      { url: "/cats/:index", match: () => <h1>Cat</h1> },
      { url: "*", redirect: "/cats/0" },
    ];

    const { container } = render(<Router routes={routes} />);
    expect(mockNavigation.navigate).toHaveBeenCalledWith("/cats/0", {
      history: "replace",
    });
    expect(container.querySelector("h1")).toBeNull();

    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
    });
  });

  it("redirect callback receives router for type-safe navigation", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/cats" },
      writable: true,
    });

    const routes = [
      { url: "/cats/:index", match: () => <h1>Cat</h1> },
      {
        url: "*",
        redirect: ({ router }: { router: { url: (p: string) => string } }) =>
          router.url("/cats/0"),
      },
    ];

    render(<Router routes={routes} />);
    expect(mockNavigation.navigate).toHaveBeenCalledWith("/cats/0", {
      history: "replace",
    });

    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
    });
  });

  it("does not double-prepend base when redirect uses router.url under a non-empty base", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/cats/unknown/path" },
      writable: true,
    });

    const routes = [
      { url: "/:index", match: () => <h1>Cat</h1> },
      {
        url: "*",
        redirect: ({
          router,
        }: {
          router: {
            url: (
              p: string,
              params?: Record<string, string | number>,
            ) => string;
          };
        }) => router.url("/:index", { index: 0 }),
      },
    ];

    render(<Router routes={routes} base="/cats" />);
    expect(mockNavigation.navigate).toHaveBeenCalledWith("/cats/0", {
      history: "replace",
    });

    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
    });
  });
});

describe("Route", () => {
  it("passes href and active state to children", () => {
    const routes = [
      {
        url: "/",
        match: () => (
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
        match: () => (
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
        match: () => (
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

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/users/1", {
      history: "auto",
    });
  });

  it("calls navigation.navigate when handler is used on a button", () => {
    const routes = [
      {
        url: "/",
        match: () => (
          <Route href="/about">
            {(route) => <button onClick={route.handler}>About</button>}
          </Route>
        ),
      },
    ];

    render(<Router routes={routes} />);

    act(() => {
      screen.getByText("About").click();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/about", {
      history: "auto",
    });
  });

  it("uses history: replace when replace prop is set", () => {
    const routes = [
      {
        url: "/",
        match: () => (
          <Route href="/login" replace>
            {(route) => <button onClick={route.handler}>Login</button>}
          </Route>
        ),
      },
    ];

    render(<Router routes={routes} />);

    act(() => {
      screen.getByText("Login").click();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/login", {
      history: "replace",
    });
  });
});

describe("useRouter().navigate()", () => {
  it("pushes by default", () => {
    function Trigger() {
      const router = useRouter();
      return <button onClick={() => router.navigate("/users/1")}>Go</button>;
    }
    const routes = [{ url: "/", match: () => <Trigger /> }];

    render(<Router routes={routes} />);
    act(() => {
      screen.getByText("Go").click();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/users/1", {
      history: "auto",
    });
  });

  it("replaces when { replace: true } is passed", () => {
    function Trigger() {
      const router = useRouter();
      return (
        <button onClick={() => router.navigate("/login", { replace: true })}>
          Sign in
        </button>
      );
    }
    const routes = [{ url: "/", match: () => <Trigger /> }];

    render(<Router routes={routes} />);
    act(() => {
      screen.getByText("Sign in").click();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/login", {
      history: "replace",
    });
  });
});

describe("useRouter", () => {
  it("provides idle status by default", () => {
    function Status() {
      const router = useRouter();
      return <span data-testid="status">{router.status}</span>;
    }

    const routes = [{ url: "/", match: () => <Status /> }];

    render(<Router routes={routes} />);
    expect(screen.getByTestId("status").textContent).toBe("idle");
  });
});
