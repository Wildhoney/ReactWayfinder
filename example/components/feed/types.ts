/** A single post entry in the infinite-scroll feed list. */
export type FeedItem = {
  /** Unique numeric identifier for the post. */
  id: number;
  /** Display title shown in the feed row. */
  title: string;
  /** HSL hue value used to generate the coloured thumbnail. */
  hue: number;
};
