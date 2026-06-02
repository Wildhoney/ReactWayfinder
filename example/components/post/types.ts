/** Props for the {@link Post} detail page component. */
export type Props = {
  /** Numeric post identifier extracted from the URL. */
  id: string;
  /** Post title resolved by the route's `data` function. */
  title: string;
};
