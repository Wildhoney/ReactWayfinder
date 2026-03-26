import { useCallback, useEffect, useRef, useState } from "react";
import { Route, url } from "react-wayfinder";
import { urls } from "../../utils";
import Navigation from "../navigation";
import {
  Page,
  List,
  Item,
  Thumbnail,
  Sentinel,
  LoadingIndicator,
} from "./styles";
import type { FeedItem } from "./types";

/** Number of items to load per page in the infinite-scroll feed. */
const PAGE_SIZE = 20;

/** Creates {@link count} feed items starting from the given {@link offset}. */
function generateItems(offset: number, count: number): FeedItem[] {
  return Array.from({ length: count }, (_, index) => {
    const id = offset + index + 1;
    return { id, title: `Post #${id}`, hue: (id * 47) % 360 };
  });
}

/** Infinite-scroll feed page. Scroll state and loaded items survive navigation via `<Activity>`. */
export default function Feed() {
  const [items, setItems] = useState<FeedItem[]>(() =>
    generateItems(0, PAGE_SIZE),
  );
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setItems((previous) => [
        ...previous,
        ...generateItems(previous.length, PAGE_SIZE),
      ]);
      setLoading(false);
    }, 600);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <>
      <Navigation />
      <Page>
        <h1>Feed</h1>
        <p>
          Scroll down to load more items, then navigate away and back &mdash;
          your scroll position and loaded items are preserved.
        </p>
        <List>
          {items.map((item) => (
            <Route key={item.id} href={url(urls.post, { id: item.id })}>
              {(route) => (
                <Item href={route.href} onClick={route.handler}>
                  <Thumbnail hue={item.hue} />
                  <span>{item.title}</span>
                </Item>
              )}
            </Route>
          ))}
        </List>
        {loading && <LoadingIndicator>Loading&hellip;</LoadingIndicator>}
        <Sentinel ref={sentinelRef} />
      </Page>
    </>
  );
}
