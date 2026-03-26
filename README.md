<div align="center">

<img src="media/logo.png" alt="react-wayfinder" width="500" />

![build](https://github.com/Wildhoney/ReactWayfinder/actions/workflows/ci.yml/badge.svg)

Strongly-typed React router built on the [Navigation API](https://web.dev/blog/baseline-navigation-api). No outlets, no nesting &mdash; just routes, loaders, and a URL builder.

</div>

## Table of Contents

1. [Getting Started](#getting-started)
2. [Navigation State](#navigation-state)
3. [Cancellation](#cancellation)
4. [Caching](#caching)
5. [View Transitions](#view-transitions)
6. [Router Modes](#router-modes)
7. [Sub-Routes](#sub-routes)


## Getting Started

Install `react-wayfinder` using your preferred package manager:

```sh
yarn add react-wayfinder
```

Define your URL patterns in a central `urls` object so every route definition, `router.url()` call, and `<Route>` reference points to a single source of truth. Changing a pattern updates every call site at once:

```tsx
export const urls = {
  home: "/",
  user: "/users/:id",
} as const;
```

Define your routes and render the router:

```tsx
import { createRoot } from "react-dom/client";
import { route, Router } from "react-wayfinder";
import type { Routes } from "react-wayfinder";

const routes = [
  route({
    url: urls.home,
    component() {
      return <h1>Home</h1>;
    },
  }),
  route({
    url: urls.user,
    async loader({ params, signal }) {
      return fetchUser(params.id, { signal });
    },
    component({ status, params, data, error }) {
      switch (status) {
        case "loading": return <p>Loading&hellip;</p>;
        case "error":   return <p>{error.message}</p>;
        case "ready":   return <User id={params.id} name={data.name} />;
      }
    },
  }),
] satisfies Routes;

createRoot(document.getElementById("root")!).render(
  <Router routes={routes} />
);
```

Routes **without** a loader receive `params` and `url`. Routes **with** a loader receive a discriminated union &mdash; narrow `data` via `status` (`"loading"`, `"ready"`, `"error"`). Use `"*"` as a catch-all for unmatched routes.


## Navigation State

Wrap any navigable element in `<Route>` to get `active`, `pending`, and `handler`. For `<a>` tags, attach `handler` as `onClick` &mdash; the Navigation API intercepts the click natively, and `handler` marks the instance. For `<button>` elements, `handler` also calls `navigation.navigate()`. Only the element you physically clicked shows `pending: true`:

```tsx
import { Route, useRouter } from "react-wayfinder";

const router = useRouter();

<Route href={router.url(urls.user, { id: 1 })}>
  {route => (
    <a href={route.href} onClick={route.handler}>
      User 1 {route.pending ? <Spinner /> : null}
    </a>
  )}
</Route>

<Route href={router.url(urls.user, { id: 1 })}>
  {route => (
    <button onClick={route.handler}>
      User 1 {route.pending ? <Spinner /> : null}
    </button>
  )}
</Route>
```

| Property | Type | Description |
|---|---|---|
| `href` | `string` | The resolved URL string |
| `active` | `boolean` | `true` if this href matches the currently rendered route |
| `pending` | `boolean` | `true` if this instance was clicked AND a loader is running |
| `handler` | `(event?) => void` | Attach as `onClick` &mdash; marks instance, navigates for non-anchors |


## Cancellation

Every loader receives an `AbortSignal` via `signal`. The signal is aborted when:

- The user presses **Escape** during a pending navigation
- A new navigation supersedes the current one (clicking User 2 while User 1 is loading)

```tsx
async loader({ params, signal }) {
  const response = await fetch(`/api/users/${params.id}`, { signal });
  return response.json();
}
```

When cancelled, the router restores the previous route and URL &mdash; no stale state. Escape only fires when a loader is in-flight; pressing Escape after navigation completes does nothing.


## Caching

Every loader receives `cache` &mdash; the previously loaded data for that route, or `undefined` on first visit. The router always calls the loader; you decide the caching strategy:

```tsx
async loader({ params, signal, cache }) {
  if (cache) return cache;

  const response = await fetch(`/api/users/${params.id}`, { signal });
  return response.json();
}
```

Previously visited routes are preserved in the DOM using React `<Activity>` &mdash; their component state, scroll position, and form inputs survive navigation. The example app's `/feed` route demonstrates this: scroll down to load more items via the infinite loader, navigate away, then come back &mdash; your scroll position and every loaded item are still there.


## View Transitions

The router automatically wraps route swaps in `document.startViewTransition()` when the browser supports it. It sets `data-direction="forward"` or `data-direction="back"` on `<html>` so you can style direction-aware animations with CSS:

```css
:root {
  --transition-duration: 250ms;
}

[data-direction="forward"]::view-transition-old(root) {
  animation: slide-out-left var(--transition-duration) ease-in-out;
}
[data-direction="forward"]::view-transition-new(root) {
  animation: slide-in-from-right var(--transition-duration) ease-in-out;
}

[data-direction="back"]::view-transition-old(root) {
  animation: slide-out-right var(--transition-duration) ease-in-out;
}
[data-direction="back"]::view-transition-new(root) {
  animation: slide-in-from-left var(--transition-duration) ease-in-out;
}
```

Direction is detected via the Navigation API &mdash; `"back"` when traversing to a lower history index, `"forward"` otherwise. Cancel clears the `data-direction` attribute to prevent unwanted animations.


## Router Modes

The `mode` prop controls how the router transitions between routes with loaders:

```tsx
<Router routes={routes} mode="deferred" />
```

| Mode | Behaviour |
|---|---|
| `"deferred"` (default) | Keeps the previous page on screen while the loader runs. Inline spinners via `<Route>` show on the clicked element. |
| `"immediate"` | Switches to the new route immediately with `status: "loading"` so you can render skeletons. Escape restores the previous route from the preserved `<Activity>`. |

When deploying to a sub-path (e.g. `https://example.com/my-app/`), pass `base` so the router strips the prefix before matching &mdash; route patterns stay root-relative. With Vite, use `import.meta.env.BASE_URL` to keep it in sync with your config:

```tsx
<Router routes={routes} base={import.meta.env.BASE_URL} />
```

Use `useRouter()` for navigation status and the base-aware URL builder:

```tsx
const router = useRouter();
// router.status: "idle" | "navigating"
// router.url(urls.user, { id: 42 }): "/users/42"
```


## Sub-Routes

Because route matching is flat and first-match, you can model sub-routes by combining a parameterised pattern with more specific patterns listed earlier. For example, a contact page with postal, telephone, and email sections where only postal needs a loader:

```tsx
export const urls = {
  contact: "/contact/:method",
} as const;

const routes = [
  // Bare /contact redirects to the default sub-route
  route({
    url: "/contact",
    component() {
      navigation.navigate("/contact/email", { history: "replace" });
      return null;
    },
  }),

  // Specific sub-route with a loader &mdash; listed before the parameterised catch-all
  route({
    url: "/contact/postal",
    async loader({ signal, cache }) {
      if (cache) return cache;
      const response = await fetch("/api/postal-address", { signal });
      return response.json();
    },
    component({ status, data, error }) {
      switch (status) {
        case "loading": return <p>Loading address&hellip;</p>;
        case "error":   return <p>{error.message}</p>;
        case "ready":   return <PostalDetails address={data.address} />;
      }
    },
  }),

  // Parameterised catch-all for sub-routes without loaders
  route({
    url: urls.contact,
    component({ params }) {
      return <Contact method={params.method} />;
    },
  }),
] satisfies Routes;
```

The component rendered by each sub-route uses `<Route>` to build its own tab navigation. Because every sub-route renders the same `Contact` shell, the tabs appear on all of them &mdash; and `active` highlights whichever tab matches the current URL:

```tsx
import { Route, useRouter } from "react-wayfinder";

const methods = ["email", "telephone", "postal"] as const;

function Contact({ method }: { method: string }) {
  const router = useRouter();

  return (
    <nav>
      {methods.map(value => (
        <Route key={value} href={router.url(urls.contact, { method: value })}>
          {route => (
            <a
              href={route.href}
              onClick={route.handler}
              className={route.active ? "active" : ""}
            >
              {value}
              {route.pending ? <Spinner /> : null}
            </a>
          )}
        </Route>
      ))}
    </nav>
  );
}
```

The key points:

- **Default redirect** &mdash; a bare `/contact` route calls `navigation.navigate()` with `{ history: "replace" }` so the redirect does not create a back-button entry.
- **Specific before generic** &mdash; `/contact/postal` is listed before `/contact/:method` so it matches first and runs its loader. All other methods fall through to the parameterised route.
- **Sub-navigation** &mdash; each component renders `<Route>` links for every method. `active` highlights the current tab and `pending` shows a spinner only on the tab that was clicked.


