/** Props for the {@link User} profile component. */
export type Props = {
  /** Unique user identifier from the URL. */
  id: string;
  /** Current display name (may be overridden via the names context). */
  name: string;
  /** User's email address resolved by the route's `data` function. */
  email: string;
  /** Callback fired when the user edits the name input. */
  onNameChange: (name: string) => void;
};
