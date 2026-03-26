/** Props for the {@link UserRoute} wrapper component. */
export type Props = {
  /** Unique user identifier from the URL. */
  id: string;
  /** Default display name from the route loader. */
  name: string;
  /** User's email address from the route loader. */
  email: string;
};
