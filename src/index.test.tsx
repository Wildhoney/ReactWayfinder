import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { App, Route, Router, Using, useRouter } from "./index";

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

describe("useRouter().url() — base-prefixer", () => {
  function UrlTest({ href }: { href: string }) {
    const router = useRouter();
    return <span data-testid="url-result">{router.url(href)}</span>;
  }

  function renderWithRouter(element: React.ReactNode, base = "") {
    const routes = [{ url: "/", match: () => element }];
    return render(<Router routes={routes} base={base} />);
  }

  it("returns the href unchanged when no base is set", () => {
    renderWithRouter(<UrlTest href="/about" />);
    expect(screen.getByTestId("url-result").textContent).toBe("/about");
  });

  it("prefixes base path", () => {
    renderWithRouter(<UrlTest href="/about" />, "/app");
    expect(screen.getByTestId("url-result").textContent).toBe("/app/about");
  });

  it("prefixes base path to root", () => {
    renderWithRouter(<UrlTest href="/" />, "/app");
    expect(screen.getByTestId("url-result").textContent).toBe("/app/");
  });
});

describe("App({ urls }) — callable url builders", () => {
  const testApp = App({
    urls: {
      home: "/",
      user: "/users/:id",
      post: "/posts/:slug/comments/:cid",
      escape: "/users/:name",
    },
  });

  it("returns the pattern for a zero-param builder", () => {
    expect(testApp.urls.home()).toBe("/");
  });

  it("substitutes a single param", () => {
    expect(testApp.urls.user({ id: 42 })).toBe("/users/42");
  });

  it("substitutes multiple params", () => {
    expect(testApp.urls.post({ slug: "hello", cid: 5 })).toBe(
      "/posts/hello/comments/5",
    );
  });

  it("encodes param values", () => {
    expect(testApp.urls.escape({ name: "hello world" })).toBe(
      "/users/hello%20world",
    );
  });

  it("exposes the source pattern via .pattern", () => {
    expect(testApp.urls.user.pattern).toBe("/users/:id");
  });

  it("composes with router.url() for base prefixing", () => {
    function Built() {
      const router = testApp.useRouter();
      return (
        <span data-testid="built">
          {router.url(router.urls.user({ id: 42 }))}
        </span>
      );
    }
    render(
      <testApp.Router
        routes={[{ url: "/", match: () => <Built /> }]}
        base="/app"
      />,
    );
    expect(screen.getByTestId("built").textContent).toBe("/app/users/42");
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

    try {
      const routes = [
        { url: "/:index", match: () => <h1>Cat</h1> },
        {
          url: "*",
          redirect: ({ router }: { router: { url: (p: string) => string } }) =>
            router.url("/0"),
        },
      ];

      render(<Router routes={routes} base="/cats" />);
      expect(mockNavigation.navigate).toHaveBeenCalledWith("/cats/0", {
        history: "replace",
      });
    } finally {
      Object.defineProperty(window, "location", {
        value: { href: "http://localhost/" },
        writable: true,
      });
    }
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

  it("replaces when Using.Replace is passed, reading the href from app.urls", () => {
    const loginApp = App({ urls: { login: "/login" } });

    function Trigger() {
      const router = loginApp.useRouter();
      return (
        <button
          onClick={() => router.navigate(router.urls.login(), Using.Replace)}
        >
          Sign in
        </button>
      );
    }

    render(
      <loginApp.Router routes={[{ url: "/", match: () => <Trigger /> }]} />,
    );
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
