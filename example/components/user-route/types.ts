/** Props for the {@link UserRoute} wrapper component. */
export type Props = {
  /** Unique user identifier from the URL. */
  id: string;
  /** Default display name from the route's `data` function. */
  name: string;
  /** User's email address from the route's `data` function. */
  email: string;
};
