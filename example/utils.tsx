import { Router, Redirect, route, type RoutesOf } from "react-wayfinder";
import Home from "./components/home";
import About from "./components/about";
import Contact from "./components/contact";
import Feed from "./components/feed";
import Post from "./components/post";
import UserRoute from "./components/user-route";
import NotFound from "./components/missing";
import PostSkeleton from "./components/post/skeleton";
import UserSkeleton from "./components/user/skeleton";

/**
 * Per-app routes. Each named route's `name` is a key of the inferred
 * `Urls` shape and its `url` is the matching pattern. `Router()` infers
 * the urls type from the entries; consumers can re-export it via
 * `RoutesOf<typeof router>` if they need it elsewhere.
 *
 * Components inside this app use `router.useContext()` (auto-typed).
 * Cross-app shared components use `shared.useContext<Urls | OtherUrls>()`
 * with a user-defined `is*App` type guard to narrow which host they're
 * rendering under.
 */
export const router = Router([
  route({
    name: "home",
    url: "/",
    match() {
      return <Home />;
    },
  }),
  route({
    name: "about",
    url: "/about",
    match() {
      return <About />;
    },
  }),
  route({
    url: "/contact",
    match: () => <Redirect href={router.url.contact({ method: "email" })} />,
  }),
  route({
    url: "/contact/postal",
    async data({ signal, cache }) {
      const cached = cache<{ address: string }>();
      if (cached) return cached;
      await sleep(500 + Math.random() * 500, signal);
      return { address: "42 Wayfinder Lane, London, EC1A 1BB, United Kingdom" };
    },
    match({ status, error, data }) {
      if (status === "loading")
        return <Contact method="postal" status="loading" />;
      if (status === "error")
        return <Contact method="postal" status="error" error={error} />;
      if (status === "ready")
        return (
          <Contact method="postal" status="ready" address={data.address} />
        );
      return null;
    },
  }),
  route({
    name: "contact",
    url: "/contact/:method",
    match({ params }) {
      if (!isContactMethod(params.method)) return <NotFound />;
      return <Contact method={params.method} />;
    },
  }),
  route({
    name: "feed",
    url: "/feed",
    match() {
      return <Feed />;
    },
  }),
  route({
    name: "post",
    url: "/feed/:id",
    async data({ params, signal, cache }) {
      const cached = cache<{ title: string }>();
      if (cached) return cached;
      await sleep(500 + Math.random() * 500, signal);
      return { title: `Post #${params.id}` };
    },
    match({ status, params, data, error }) {
      if (status === "loading") return <PostSkeleton />;
      if (status === "error") return <p>Error: {error.message}</p>;
      if (status === "ready") return <Post id={params.id} title={data.title} />;
      return null;
    },
  }),
  route({
    name: "user",
    url: "/users/:id",
    async data({ params, signal, cache }) {
      const cached = cache<{ name: string; email: string }>();
      if (cached) return cached;
      await sleep(500 + Math.random() * 500, signal);
      return {
        name: `User ${params.id}`,
        email: `user${params.id}@example.com`,
      };
    },
    match({ status, params, data, error }) {
      if (status === "loading") return <UserSkeleton />;
      if (status === "error") return <p>Error: {error.message}</p>;
      if (status === "ready")
        return <UserRoute id={params.id} name={data.name} email={data.email} />;
      return null;
    },
  }),
  route({
    url: "*",
    match() {
      return <NotFound />;
    },
  }),
]);

/** Re-exported url-pattern shape — usable by cross-app shared components via `shared.useContext<Urls>()`. */
export type Routes = RoutesOf<typeof router>;

/** Narrows the raw `:method` url param to the closed set of known contact methods. */
function isContactMethod(value: string): value is "email" | "telephone" {
  return value === "email" || value === "telephone";
}

/** Returns a promise that resolves after {@link ms} milliseconds, or rejects if {@link signal} is aborted. */
function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}
