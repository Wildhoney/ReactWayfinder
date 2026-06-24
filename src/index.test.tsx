import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Router, Route, Redirect, route, shared, useRouter } from "./index";
import type { RoutesOf, RoutesShape } from "./types";

// Mock the Navigation API.
const mockNavigation = {
  currentEntry: { index: 0, key: "", id: "", url: "", sameDocument: true },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  navigate: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
};

Object.defineProperty(globalThis, "navigation", {
  value: mockNavigation,
  writable: true,
});

beforeEach(() => {
  mockNavigation.addEventListener.mockClear();
  mockNavigation.removeEventListener.mockClear();
  mockNavigation.navigate.mockClear();
  mockNavigation.back.mockClear();
  mockNavigation.forward.mockClear();
});

describe("Router(routes) — callable url builders", () => {
  // urls inferred by Router() from each route's name/url pair
  const testRouter = Router([
    route({ name: "home", url: "/", match: () => null }),
    route({ name: "user", url: "/users/:id", match: () => null }),
    route({
      name: "post",
      url: "/posts/:slug/comments/:cid",
      match: () => null,
    }),
    route({ name: "escape", url: "/users/:name", match: () => null }),
  ]);

  it("returns the pattern for a zero-param builder", () => {
    expect(testRouter.url.home()).toBe("/");
  });

  it("substitutes a single param", () => {
    expect(testRouter.url.user({ id: 42 })).toBe("/users/42");
  });

  it("substitutes multiple params", () => {
    expect(testRouter.url.post({ slug: "hello", cid: 5 })).toBe(
      "/posts/hello/comments/5",
    );
  });

  it("encodes param values", () => {
    expect(testRouter.url.escape({ name: "hello world" })).toBe(
      "/users/hello%20world",
    );
  });

  it("exposes the source pattern via .pattern", () => {
    expect(testRouter.url.user.pattern).toBe("/users/:id");
  });

  it("bakes base into builders accessed via the hook", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/app/" },
      writable: true,
    });

    try {
      // urls inferred by Router()
      const localRoutes = Router([
        route({ name: "home", url: "/", match: () => <Built /> }),
        route({ name: "user", url: "/users/:id", match: () => null }),
      ]);

      function Built() {
        const router = localRoutes.useContext();
        return <span data-testid="built">{router.url.user({ id: 42 })}</span>;
      }

      render(<localRoutes.Router base="/app" />);
      expect(screen.getByTestId("built").textContent).toBe("/app/users/42");
    } finally {
      Object.defineProperty(window, "location", {
        value: { href: "http://localhost/" },
        writable: true,
      });
    }
  });
});

describe("<Router using>", () => {
  it("renders the matched route component", () => {
    // urls inferred by Router()
    const router = Router([
      route({ name: "home", url: "/", match: () => <h1>Home</h1> }),
    ]);

    render(<router.Router />);
    expect(screen.getByText("Home")).toBeDefined();
  });

  it("renders nothing when no route matches", () => {
    // urls inferred by Router()
    const router = Router([
      route({ name: "about", url: "/about", match: () => <h1>About</h1> }),
    ]);

    const { container } = render(<router.Router />);
    expect(container.querySelector("h1")).toBeNull();
  });

  it("renders the wildcard route for unmatched paths", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/unknown" },
      writable: true,
    });

    // urls inferred by Router()
    const router = Router([
      route({ name: "home", url: "/", match: () => <h1>Home</h1> }),
      route({ url: "*", match: () => <h1>404</h1> }),
    ]);

    render(<router.Router />);
    expect(screen.getByText("404")).toBeDefined();

    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
    });
  });

  it("renders children alongside route content", () => {
    // urls inferred by Router()
    const router = Router([
      route({ name: "home", url: "/", match: () => <h1>Home</h1> }),
    ]);

    render(
      <router.Router>
        <div data-testid="progress">Loading</div>
      </router.Router>,
    );

    expect(screen.getByTestId("progress")).toBeDefined();
    expect(screen.getByText("Home")).toBeDefined();
  });

  it("redirects from a match callback returning <Redirect>", async () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/cats" },
      writable: true,
    });

    // urls inferred by Router()
    const router = Router([
      route({ name: "cats", url: "/cats/:index", match: () => <h1>Cat</h1> }),
      route({
        url: "*",
        match: () => <Redirect href={router.url.cats({ index: 0 })} />,
      }),
    ]);

    render(<router.Router />);
    await Promise.resolve();
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
  // urls inferred by Router()

  it("passes href and active state to children", () => {
    const router = Router([
      route({
        name: "home",
        url: "/",
        match: () => (
          <Route href="/about">
            {(state) => (
              <a href={state.href} data-active={state.active}>
                About
              </a>
            )}
          </Route>
        ),
      }),
      route({ name: "about", url: "/about", match: () => null }),
    ]);

    render(<router.Router />);

    const link = screen.getByText("About");
    expect(link.getAttribute("href")).toBe("/about");
    expect(link.getAttribute("data-active")).toBe("false");
  });

  it("marks the current route as active", () => {
    const router = Router([
      route({
        name: "home",
        url: "/",
        match: () => (
          <Route href="/">
            {(state) => (
              <a href={state.href} data-active={String(state.active)}>
                Home
              </a>
            )}
          </Route>
        ),
      }),
    ]);

    render(<router.Router />);

    const link = screen.getByText("Home");
    expect(link.getAttribute("data-active")).toBe("true");
  });

  it("calls navigation.navigate for non-anchor elements", () => {
    const router = Router([
      route({
        name: "home",
        url: "/",
        match: () => (
          <Route href="/users/1">
            {(state) => <button onClick={state.handler}>Go</button>}
          </Route>
        ),
      }),
    ]);

    render(<router.Router />);

    act(() => {
      screen.getByText("Go").click();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/users/1", {
      history: "auto",
    });
  });

  it("exposes navigate.push/replace/back/forward on render-prop state", () => {
    const router = Router([
      route({
        name: "home",
        url: "/",
        match: () => (
          <Route href="/users/2">
            {(state) => (
              <>
                <button onClick={() => state.navigate.push(state.href)}>
                  Push
                </button>
                <button onClick={() => state.navigate.replace(state.href)}>
                  Replace
                </button>
                <button onClick={() => state.navigate.back()}>Back</button>
                <button onClick={() => state.navigate.forward()}>
                  Forward
                </button>
              </>
            )}
          </Route>
        ),
      }),
    ]);

    render(<router.Router />);

    act(() => {
      screen.getByText("Push").click();
    });
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith("/users/2", {
      history: "auto",
    });

    act(() => {
      screen.getByText("Replace").click();
    });
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith("/users/2", {
      history: "replace",
    });

    act(() => {
      screen.getByText("Back").click();
    });
    expect(mockNavigation.back).toHaveBeenCalledTimes(1);

    act(() => {
      screen.getByText("Forward").click();
    });
    expect(mockNavigation.forward).toHaveBeenCalledTimes(1);
  });

  it("uses history: replace when replace prop is set", () => {
    const router = Router([
      route({
        name: "home",
        url: "/",
        match: () => (
          <Route href="/login" replace>
            {(state) => <button onClick={state.handler}>Login</button>}
          </Route>
        ),
      }),
    ]);

    render(<router.Router />);

    act(() => {
      screen.getByText("Login").click();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/login", {
      history: "replace",
    });
  });
});

describe("router.useContext().navigate", () => {
  // urls inferred by Router()

  it(".push pushes a new history entry", () => {
    const router = Router([
      route({ name: "home", url: "/", match: () => <Trigger /> }),
      route({ name: "user", url: "/users/:id", match: () => null }),
    ]);

    function Trigger() {
      const context = router.useContext();
      return (
        <button
          onClick={() => context.navigate.push(context.url.user({ id: 1 }))}
        >
          Go
        </button>
      );
    }

    render(<router.Router />);
    act(() => {
      screen.getByText("Go").click();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/users/1", {
      history: "auto",
    });
  });

  it(".replace swaps the current history entry", () => {
    const loginRouter = Router([
      route({ name: "home", url: "/", match: () => <SignIn /> }),
      route({ name: "login", url: "/login", match: () => null }),
    ]);

    function SignIn() {
      const context = loginRouter.useContext();
      return (
        <button onClick={() => context.navigate.replace(context.url.login())}>
          Sign in
        </button>
      );
    }

    render(<loginRouter.Router />);
    act(() => {
      screen.getByText("Sign in").click();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/login", {
      history: "replace",
    });
  });

  it(".back traverses one entry back", () => {
    const router = Router([
      route({ name: "home", url: "/", match: () => <Back /> }),
    ]);

    function Back() {
      const context = router.useContext();
      return <button onClick={() => context.navigate.back()}>Back</button>;
    }

    render(<router.Router />);
    act(() => {
      screen.getByText("Back").click();
    });

    expect(mockNavigation.back).toHaveBeenCalledTimes(1);
  });

  it(".forward traverses one entry forward", () => {
    const router = Router([
      route({ name: "home", url: "/", match: () => <Forward /> }),
    ]);

    function Forward() {
      const context = router.useContext();
      return (
        <button onClick={() => context.navigate.forward()}>Forward</button>
      );
    }

    render(<router.Router />);
    act(() => {
      screen.getByText("Forward").click();
    });

    expect(mockNavigation.forward).toHaveBeenCalledTimes(1);
  });
});

describe("router.useContext()", () => {
  it("provides idle status by default", () => {
    // urls inferred by Router()
    const router = Router([
      route({ name: "home", url: "/", match: () => <Status /> }),
    ]);

    function Status() {
      const context = router.useContext();
      return <span data-testid="status">{context.status}</span>;
    }

    render(<router.Router />);
    expect(screen.getByTestId("status").textContent).toBe("idle");
  });

  it("exposes Urls via the RoutesOf<typeof routes> extractor", () => {
    // urls inferred by Router()
    const local = Router([
      route({ name: "home", url: "/", match: () => null }),
      route({ name: "user", url: "/users/:id", match: () => null }),
    ]);
    type Extracted = RoutesOf<typeof local>;
    const probe: Extracted = { home: "/", user: "/users/:id" };
    expect(probe.home).toBe("/");
    expect(local.url.user({ id: 1 })).toBe("/users/1");
  });

  it("exposes router.params.X — typed params for the active route, undefined otherwise", () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/users/42" },
      writable: true,
    });

    try {
      const router = Router([
        route({ name: "home", url: "/", match: () => null }),
        route({ name: "user", url: "/users/:id", match: () => <Probe /> }),
      ]);

      function Probe() {
        const context = router.useContext();
        // home isn't the active route — its params are undefined.
        const homeParams = context.params.home;
        // user IS active — params is { id: string }.
        const userParams = context.params.user;
        return (
          <span data-testid="probe">
            {homeParams === undefined ? "home:undefined" : "home:set"}|
            {userParams ? `user:${userParams.id}` : "user:undefined"}
          </span>
        );
      }

      render(<router.Router />);
      expect(screen.getByTestId("probe").textContent).toBe(
        "home:undefined|user:42",
      );
    } finally {
      Object.defineProperty(window, "location", {
        value: { href: "http://localhost/" },
        writable: true,
      });
    }
  });
});

describe("useRouter() — standalone hook", () => {
  it("reads the active host router's url builders", () => {
    const router = Router([
      route({ name: "home", url: "/", match: () => <Link /> }),
      route({ name: "profile", url: "/profile", match: () => null }),
    ]);

    function Link() {
      const router = useRouter();
      return <a href={router.url.profile()}>Profile</a>;
    }

    render(<router.Router />);
    expect(screen.getByText("Profile").getAttribute("href")).toBe("/profile");
  });

  it("exposes navigate.push/replace/back/forward", () => {
    // urls inferred by Router()
    const router = Router([
      route({ name: "home", url: "/", match: () => <Probe /> }),
    ]);

    function Probe() {
      const router = useRouter();
      return (
        <span data-testid="probe">
          {typeof router.navigate.push} {typeof router.navigate.replace}{" "}
          {typeof router.navigate.back} {typeof router.navigate.forward}
        </span>
      );
    }

    render(<router.Router />);
    expect(screen.getByTestId("probe").textContent).toBe(
      "function function function function",
    );
  });
});

describe("route() — match auto-typed from url params AND data return", () => {
  // Compile-time assertion helper — TS will error if T is not exactly Expected.
  type Equals<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
      ? true
      : false;
  function assertExact<X, Y>(value: Equals<X, Y>) {
    /* no-op — only the type system runs this */
    void value;
  }

  it("types data() params from the url literal, and match args from both", async () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/users/7" },
      writable: true,
    });

    try {
      // urls inferred by Router()
      const router = Router([
        route({
          name: "user",
          url: "/users/:id",
          async data({ params }) {
            // params is typed against the url pattern: `{ id: string }`
            assertExact<typeof params, { id: string }>(true);
            return { id: params.id, label: `User ${params.id}` };
          },
          match({ status, params, data, error }) {
            // Destructured discriminated union: TS 5.4+ narrows sibling
            // fields on the same object when the discriminant is destructured.
            assertExact<typeof params, { id: string }>(true);

            if (status === "loading") {
              return <span data-testid="state">loading</span>;
            }
            if (status === "error") {
              // `error` narrowed to Error in this branch.
              assertExact<typeof error, Error>(true);
              return (
                <span data-testid="state">{`error:${error.message}`}</span>
              );
            }
            // status === "ready" — `data` narrowed to the data fn's return.
            assertExact<typeof data, { id: string; label: string }>(true);
            return (
              <span data-testid="state">
                {`ready:${data.label}:${params.id}`}
              </span>
            );
          },
        }),
      ]);

      render(<router.Router />);
      await screen.findByText(/^ready:/);
      expect(screen.getByTestId("state").textContent).toBe("ready:User 7:7");
    } finally {
      Object.defineProperty(window, "location", {
        value: { href: "http://localhost/" },
        writable: true,
      });
    }
  });

  it("types static match params from the url literal", () => {
    // urls inferred by Router()
    const router = Router([
      route({
        name: "post",
        url: "/posts/:slug/comments/:cid",
        match({ params }) {
          // params: { slug: string; cid: string }
          assertExact<typeof params, { slug: string; cid: string }>(true);
          return (
            <span data-testid="static">{`${params.slug}/${params.cid}`}</span>
          );
        },
      }),
    ]);

    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/posts/hello/comments/5" },
      writable: true,
    });

    try {
      render(<router.Router />);
      expect(screen.getByTestId("static").textContent).toBe("hello/5");
    } finally {
      Object.defineProperty(window, "location", {
        value: { href: "http://localhost/" },
        writable: true,
      });
    }
  });
});

describe("shared.useContext<U>() — cross-app handle", () => {
  type WebUrls = { home: "/"; dashboard: "/dashboard" };
  type MobileUrls = { home: "/"; profile: "/profile" };
  type AnyUrls = WebUrls | MobileUrls;

  it("reads the active host router's url builders", () => {
    const router = Router([
      route({ name: "home", url: "/", match: () => <Profile /> }),
      route({ name: "profile", url: "/profile", match: () => null }),
    ]);

    function Profile() {
      const router = shared.useContext<MobileUrls>();
      return <span data-testid="profile-href">{router.url.profile()}</span>;
    }

    render(<router.Router base="/app" />);
    expect(screen.getByTestId("profile-href").textContent).toBe("/app/profile");
  });

  it("narrows via a user-defined is-this-app type guard", () => {
    const router = Router([
      route({ name: "home", url: "/", match: () => <Banner /> }),
      route({ name: "dashboard", url: "/dashboard", match: () => null }),
    ]);

    function isWebApp(
      value: object,
    ): value is { url: { dashboard: () => string } } {
      return "dashboard" in (value as { url: object }).url;
    }

    function Banner() {
      const router = shared.useContext<AnyUrls>();
      if (isWebApp(router)) {
        return <a href={router.url.dashboard()}>Dashboard</a>;
      }
      return <a href={router.url.home()}>Home</a>;
    }

    render(<router.Router />);
    expect(screen.getByText("Dashboard").getAttribute("href")).toBe(
      "/dashboard",
    );
  });

  it("typecheck — RoutesShape unions distribute through AppUrls", () => {
    function _typecheck() {
      type A = { foo: "/foo" };
      type B = { bar: "/bar" };
      const router = shared.useContext<A | B>();
      const _foo = "foo" in router.url ? router.url.foo() : null;
      const _bar = "bar" in router.url ? router.url.bar() : null;
      return [_foo, _bar];
    }
    expect(typeof _typecheck).toBe("function");
  });

  it("narrows same-key/different-params variants via the .pattern brand", () => {
    type SoloUrls = { home: "/"; user: "/users/:id" };
    type TeamUrls = { home: "/"; user: "/teams/:tid/users/:uid" };

    const router = Router([
      route({ name: "home", url: "/", match: () => <Link /> }),
      route({ name: "user", url: "/users/:id", match: () => null }),
    ]);

    function Link() {
      const router = shared.useContext<SoloUrls | TeamUrls>();
      if (router.url.user.pattern === "/users/:id") {
        return <a href={router.url.user({ id: "5" })}>User 5</a>;
      }
      return (
        <a href={router.url.user({ tid: "1", uid: "5" })}>Team 1 / User 5</a>
      );
    }

    render(<router.Router />);
    expect(screen.getByText("User 5").getAttribute("href")).toBe("/users/5");
  });
});

function _unused(value: RoutesShape) {
  return value;
}
void _unused;
