import { App, route, type Routes } from "react-wayfinder";
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
 * Per-app handle. URLs are declared inline; the `const` modifier on App's
 * generic preserves the literal pattern types so `app.urls.user({ id })`
 * is fully typed without an `as const` annotation.
 *
 * Components inside this App use `app.useRouter()` (auto-typed). Cross-app
 * shared components use `shared.useRouter<typeof app | typeof otherApp>()`.
 */
export const app = App({
  urls: {
    home: "/",
    about: "/about",
    contact: "/contact/:method",
    feed: "/feed",
    post: "/feed/:id",
    user: "/users/:id",
  },
});

/** Application route definitions with `data` functions for data-fetching routes. */
export const routes = [
  route({
    url: app.urls.home,
    match() {
      return <Home />;
    },
  }),
  route({
    url: app.urls.about,
    match() {
      return <About />;
    },
  }),
  route({
    url: "/contact",
    redirect: ({ router }) => router.url(app.urls.contact({ method: "email" })),
  }),
  route({
    url: "/contact/postal",
    async data({ signal, cache }) {
      if (cache) return cache as { address: string };
      await sleep(500 + Math.random() * 500, signal);
      return { address: "42 Wayfinder Lane, London, EC1A 1BB, United Kingdom" };
    },
    match({ status, data, error }) {
      switch (status) {
        case "loading":
          return <Contact method="postal" status="loading" />;
        case "error":
          return <Contact method="postal" status="error" error={error} />;
        case "ready":
          return (
            <Contact method="postal" status="ready" address={data.address} />
          );
      }
    },
  }),
  route({
    url: app.urls.contact,
    match({ params }) {
      return <Contact method={params.method as "email" | "telephone"} />;
    },
  }),
  route({
    url: app.urls.feed,
    match() {
      return <Feed />;
    },
  }),
  route({
    url: app.urls.post,
    async data({ params, signal, cache }) {
      if (cache) return cache as { title: string };
      await sleep(500 + Math.random() * 500, signal);
      return { title: `Post #${params.id}` };
    },
    match({ status, params, data, error }) {
      switch (status) {
        case "loading":
          return <PostSkeleton />;
        case "error":
          return <p>Error: {error.message}</p>;
        case "ready":
          return <Post id={params.id} title={data.title} />;
      }
    },
  }),
  route({
    url: app.urls.user,
    async data({ params, signal, cache }) {
      if (cache) return cache as { name: string; email: string };
      await sleep(500 + Math.random() * 500, signal);
      return {
        name: `User ${params.id}`,
        email: `user${params.id}@example.com`,
      };
    },
    match({ status, params, data, error }) {
      switch (status) {
        case "loading":
          return <UserSkeleton />;
        case "error":
          return <p>Error: {error.message}</p>;
        case "ready":
          return (
            <UserRoute id={params.id} name={data.name} email={data.email} />
          );
      }
    },
  }),
  route({
    url: "*",
    match() {
      return <NotFound />;
    },
  }),
] satisfies Routes;

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
