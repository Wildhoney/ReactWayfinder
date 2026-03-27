interface NavigationDestination {
  url: string;
  index: number;
}

interface NavigationCurrentEntry {
  index: number;
}

interface NavigateEvent extends Event {
  canIntercept: boolean;
  hashChange: boolean;
  destination: NavigationDestination;
  navigationType: "push" | "replace" | "reload" | "traverse";
  intercept(options: {
    scroll?: "after-transition" | "manual";
    handler?: () => Promise<void>;
  }): void;
}

interface Navigation extends EventTarget {
  currentEntry: NavigationCurrentEntry | null;
  navigate(
    url: string,
    options?: { history?: "auto" | "push" | "replace" },
  ): void;
  addEventListener(
    type: "navigate",
    listener: (event: NavigateEvent) => void,
  ): void;
  removeEventListener(
    type: "navigate",
    listener: (event: NavigateEvent) => void,
  ): void;
}

interface Document {
  startViewTransition?: (callback: () => void) => void;
}

declare const navigation: Navigation;
