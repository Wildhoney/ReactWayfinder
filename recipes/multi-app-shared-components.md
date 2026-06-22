# Multi-app shared components

In a monorepo, several apps often share a UI kit &mdash; a `<Header>`, a `<SignOutButton>`, a feature flag banner. Each app declares its own `Router([...])` with its own `Routes` enum, so the shared component can't just `import { router } from "./router"` &mdash; it doesn't know which one to pick.

`shared.useContext<U>()` is the escape hatch. Pass the **union of every host's routes type** as the generic, and the same component reads whichever host router is currently mounted.

## Setting up each app

Every app exports its own `Routes` enum and `router` definition. Re-export `Routes` (the value/type pair) so cross-app consumers can pick it up by name:

```ts
// apps/web/router.ts
import { Router, route } from "react-wayfinder";

export enum Routes {
  Home = "/",
  Dashboard = "/dashboard",
}

export const router = Router([
  route({ name: "home", url: Routes.Home, match: () => <Home /> }),
  route({ name: "dashboard", url: Routes.Dashboard, match: () => <Dashboard /> }),
]);
```

```ts
// apps/mobile/router.ts — symmetrical, different routes
export enum Routes {
  Home = "/",
  Profile = "/profile",
}

export const router = Router([
  route({ name: "home", url: Routes.Home, match: () => <Home /> }),
  route({ name: "profile", url: Routes.Profile, match: () => <Profile /> }),
]);
```

## The cross-app component

Import both apps' `Routes` enums and union them. Pass the union to `shared.useContext` &mdash; the handle exposes `url` and `params` for **only the keys present on every arm**:

```tsx
// shared/header.tsx
import { shared } from "react-wayfinder";
import * as web from "@app/web/router";
import * as mobile from "@app/mobile/router";

type AnyRoutes = typeof web.Routes | typeof mobile.Routes;

export function Header() {
  const context = shared.useContext<AnyRoutes>();
  // `Home` exists on both arms — direct access type-checks
  return <a href={context.url.home()}>Home</a>;
}
```

## Narrowing with `is*App` type guards

When the shared component needs to render an app-specific link, write a type guard per host. The guard returns a `context is Router<typeof Routes>` predicate &mdash; everything inside the `if` block then sees one concrete set of routes:

```tsx
import type { Router } from "react-wayfinder";
import * as web from "@app/web/router";
import * as mobile from "@app/mobile/router";

type AnyRoutes = typeof web.Routes | typeof mobile.Routes;

// `Dashboard` only exists on the web app — that's our discriminator
function isWebApp(context: Router<AnyRoutes>): context is Router<typeof web.Routes> {
  return "dashboard" in context.url;
}

function isMobileApp(context: Router<AnyRoutes>): context is Router<typeof mobile.Routes> {
  return "profile" in context.url;
}

export function ContextLink() {
  const context = shared.useContext<AnyRoutes>();

  if (isWebApp(context)) {
    // narrowed to Router<typeof web.Routes> — `context.url.dashboard()` AND
    // `context.params.dashboard` are now typed against the web app
    return <a href={context.url.dashboard()}>Dashboard</a>;
  }

  if (isMobileApp(context)) {
    return <a href={context.url.profile()}>Profile</a>;
  }

  return null;
}
```

Putting the discrimination logic in named guards has two payoffs:

- **One place to change** if you ever add a third app &mdash; you write `isAdminApp`, not edit every shared component that reaches for `"dashboard" in context.url`.
- **Reads as intent**, not mechanics &mdash; the call site asks "which app am I in?" instead of "does this key exist?", and the answer is a fully-typed `Router<SingleApp>` handle.

## Same key, different params

If two apps name the same route but with different `:params`, the union narrowing via `"key" in context.url` is no help &mdash; the key exists on both arms. Use the builder's `.pattern` brand to discriminate instead:

```tsx
enum SoloRoutes { user = "/users/:id" }
enum TeamRoutes { user = "/teams/:tid/users/:uid" }

function isSoloApp(
  context: Router<typeof SoloRoutes | typeof TeamRoutes>,
): context is Router<typeof SoloRoutes> {
  return context.url.user.pattern === "/users/:id";
}

function UserLink() {
  const context = shared.useContext<typeof SoloRoutes | typeof TeamRoutes>();

  if (isSoloApp(context)) {
    return <a href={context.url.user({ id: "5" })}>User 5</a>;
  }
  return <a href={context.url.user({ tid: "1", uid: "5" })}>Team 1 / User 5</a>;
}
```

## When *not* to reach for `shared`

`shared.useContext<U>()` is one generic longer at every call site, and its narrowing isn't free &mdash; you write a `Router<U>` annotation on every guard. Reach for it **only** when a component must work under more than one host. Anything that belongs to a single app should keep importing that app's `router` and call `router.useContext()` directly &mdash; the urls type comes through automatically, no generics required.
