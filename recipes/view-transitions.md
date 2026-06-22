# View transitions

Every route swap goes through `document.startViewTransition()` when the browser supports it. The router also sets a `data-direction="forward" | "back"` attribute on `<html>` for the duration of the swap so you can write direction-aware CSS without any JS.

## Direction-aware CSS

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

@keyframes slide-out-left { to { transform: translateX(-100%); } }
@keyframes slide-in-from-right { from { transform: translateX(100%); } }
@keyframes slide-out-right { to { transform: translateX(100%); } }
@keyframes slide-in-from-left { from { transform: translateX(-100%); } }
```

The `[data-direction="..."]` selector scopes the animation to the right traversal direction &mdash; back-button traversals slide the opposite way to forward pushes.

## How direction is decided

The router reads `event.navigationType === "traverse"` and compares `event.destination.index` against `window.navigation.currentEntry?.index`:

- destination's index is **lower** → `"back"` (the user pressed the browser back button, or `router.navigate.back()`).
- otherwise → `"forward"` (push or replace).

Cancelled navigations (the user pressed Escape mid-fetch) clear the attribute so the next navigation doesn't inherit stale direction state.

## Per-route or per-page transitions

Use a unique `view-transition-name` on a per-route element to opt into element-level transitions:

```css
.user-avatar {
  view-transition-name: user-avatar;
}
```

When two routes both render an element with the same `view-transition-name`, the browser morphs between them &mdash; great for shared-element transitions (a list item's image growing into the detail page's hero).

## Disabling transitions for specific routes

If a particular transition is jarring (e.g. switching tabs inside the same page), wrap that navigation in a way that bypasses `document.startViewTransition`. The simplest path is to read `router.status` &mdash; if you're navigating between sub-tabs of the same page, the rendered route doesn't unmount, and the view transition has nothing meaningful to animate. Add a CSS guard:

```css
[data-direction="forward"][data-route="tabs"]::view-transition-old(root),
[data-direction="forward"][data-route="tabs"]::view-transition-new(root) {
  animation: none;
}
```

(You'd need to set `data-route` yourself based on the active route.)

## Browser support

`document.startViewTransition` is Chromium-only at time of writing. The router checks `if (document.startViewTransition)` before calling it &mdash; in unsupported browsers, the route swap happens without an animated transition (no error, no flash). Your CSS animations on `::view-transition-old/new` simply don't fire.

## Pair with cache for free continuity

If a re-visit hits `cache<D>()` and returns immediately, the route's `data` resolves synchronously &mdash; the view transition then animates between two fully-rendered states without an intermediate spinner frame. Deferred mode (the default) keeps the previous page on screen while data is in flight, so even a cold visit gives the view transition something to animate from.
