/** Shape of the names context value shared via {@link NamesProvider}. */
export type NamesContext = {
  /** Map of user ID to display name override. */
  names: Record<string, string>;
  /** Stores a display name override for the given user ID. */
  setName: (id: string, name: string) => void;
};
