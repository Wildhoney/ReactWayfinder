# Cancellation

Every `data` function receives an `AbortSignal` via `args.signal`. The signal is aborted when:

- The user presses **Escape** during a pending navigation.
- A new navigation supersedes the current one (clicking User 2 while User 1's data is loading).

Pass `signal` to `fetch` and the in-flight request gets aborted by the browser:

```tsx
async data({ params, signal }) {
  const response = await fetch(`/api/users/${params.id}`, { signal });
  return response.json();
}
```

If you're not using `fetch`, plumb the signal through to whatever async work you do. For a setTimeout-based delay:

```tsx
async function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}
```

## What "cancelled" means at the router level

When the in-flight `data` is aborted:

- The router restores the previous route and URL &mdash; the user stays on whatever they were looking at when they pressed Escape.
- The `data-direction` attribute on `<html>` is cleared so view-transition CSS doesn't trail an animation for a navigation that never happened.
- The status flips back to `"idle"`.

The user never sees a stale `"loading"` state for the cancelled URL.

## Escape only works while in-flight

Pressing Escape after navigation completes does nothing &mdash; there's no in-flight `data` to abort. This means Escape acts as "cancel the thing that's clearly happening", not "go back" &mdash; for back, use the browser button or `router.navigate.back()`.

## Cancellation vs reload

`router.navigate.reload()` re-runs the current route's `data` function. If a reload is already in flight when another reload (or any navigation) fires, the existing reload is aborted via its `AbortSignal`, same as any other supersession. Your data function should always pass `signal` through and assume it can be aborted at any await point.

## Detecting cancellation explicitly

The signal also fires a synchronous `signal.aborted` you can poll between work units:

```tsx
async data({ params, signal }) {
  const { token } = await authenticate({ signal });
  if (signal.aborted) return cache<User>() ?? null;
  const user = await fetchUser(params.id, { token, signal });
  return user;
}
```

The early return after the abort check is defensive &mdash; if the navigation was superseded, the router will discard whatever you return anyway, but returning early saves a wasted fetch.
