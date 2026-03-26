import { useCallback } from "react";
import { useNames } from "../names";
import User from "../user";
import type { Props } from "./types";

/** Bridges the route loader data and the names context, passing the resolved display name to {@link User}. */
export default function UserRoute({ id, name, email }: Props) {
  const { names, setName } = useNames();
  const displayName = names[id] ?? name;

  const handleNameChange = useCallback(
    (value: string) => setName(id, value),
    [id, setName],
  );

  return (
    <User
      id={id}
      name={displayName}
      email={email}
      onNameChange={handleNameChange}
    />
  );
}
