<div align="center">

<img src="media/logo.png" alt="react-wayfinder" width="500" />

![build](https://github.com/Wildhoney/ReactWayfinder/actions/workflows/ci.yml/badge.svg)

Strongly-typed React router built on the [Navigation API](https://web.dev/blog/baseline-navigation-api). No outlets, no nesting &mdash; just routes, loaders, and a URL builder.

</div>

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Navigation State](#navigation-state)
3. [Cancellation](#cancellation)
4. [Caching](#caching)
5. [View Transitions](#view-transitions)
6. [Router Modes](#router-modes)
7. [Sub-Routes](#sub-routes)
8. [API](#api)

---

## Getting Started

Install `react-wayfinder` using your preferred package manager:

```sh
yarn add react-wayfinder
```

Define your URL patterns in a central `urls` object so every route definition, `url()` call, and `<Route>` reference points to a single source of truth. Changing a pattern updates every call site at once:

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
];

createRoot(document.getElementById("root")!).render(
  <Router routes={routes} />
);
```

Routes **without** a loader receive `params` and `url`. Routes **with** a loader receive a discriminated union &mdash; narrow `data` via `status` (`"loading"`, `"ready"`, `"error"`). Use `"*"` as a catch-all for unmatched routes.

---

## Navigation State

Wrap any navigable element in `<Route>` to get `active`, `pending`, and `handler`. For `<a>` tags, attach `handler` as `onClick` &mdash; the Navigation API intercepts the click natively, and `handler` marks the instance. For `<button>` elements, `handler` also calls `navigation.navigate()`. Only the element you physically clicked shows `pending: true`:

```tsx
import { Route, url } from "react-wayfinder";

<Route href={url(urls.user, { id: 1 })}>
  {route => (
    <a href={route.href} onClick={route.handler}>
      User 1 {route.pending ? <Spinner /> : null}
    </a>
  )}
</Route>

<Route href={url(urls.user, { id: 1 })}>
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

---

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

---

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

---

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

---

## Router Modes

The `mode` prop controls how the router transitions between routes with loaders:

```tsx
import { Router } from "react-wayfinder";

<Router routes={routes} mode="deferred" />
```

| Mode | Behaviour |
|---|---|
| `"deferred"` (default) | Keeps the previous page on screen while the loader runs. Inline spinners via `<Route>` show on the clicked element. |
| `"immediate"` | Switches to the new route immediately with `status: "loading"` so you can render skeletons. Escape restores the previous route from the preserved `<Activity>`. |

---

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
];
```

The key points:

- **Default redirect** &mdash; a bare `/contact` route calls `navigation.navigate()` with `{ history: "replace" }` so the redirect does not create a back-button entry.
- **Specific before generic** &mdash; `/contact/postal` is listed before `/contact/:method` so it matches first and runs its loader. All other methods fall through to the parameterised route.
- **Sub-navigation** &mdash; the component renders `<Route>` links for each method, using `url(urls.contact, { method: "email" })` to build the hrefs. The `active` state highlights the current tab.

---

## API

### `Router`

Top-level component powered by the Navigation API. Intercepts all navigations &mdash; link clicks, back/forward, form submissions, and `navigation.navigate()` calls. Accepts `children` for persistent elements like progress bars.

```tsx
<Router routes={routes} mode="deferred">
  <Progress />
</Router>
```

### `route()`

Strongly-typed route definition. Infers param types from the URL pattern and loader return type for the component's `data`.

### `url()`

Strongly-typed URL builder. Returns a `string` &mdash; does not trigger navigation.

```tsx
import { url } from "react-wayfinder";

<a href={url(urls.user, { id: 42 })}>User 42</a>
```

### `Route`

Render-prop component scoped to a single `href`. Provides `active`, `pending`, and `handler`. Only the physically clicked instance shows pending.

```tsx
<Route href={url(urls.about)}>
  {route => (
    <a href={route.href} onClick={route.handler}>
      About {route.pending ? <Spinner /> : null}
    </a>
  )}
</Route>
```

### `Routes`

Utility type for validating route arrays at the type level. Use with `satisfies` to catch misconfigurations while preserving inferred types:

```tsx
import { route } from "react-wayfinder";
import type { Routes } from "react-wayfinder";

export const routes = [
  route({ url: urls.home, component() { return <Home />; } }),
  route({ url: "*", component() { return <Missing />; } }),
] satisfies Routes;
```

### `useNavigation()`

Hook for global navigation status. Useful for top-level progress bars.

```tsx
const navigation = useNavigation();
// navigation.status: "idle" | "navigating"
```
