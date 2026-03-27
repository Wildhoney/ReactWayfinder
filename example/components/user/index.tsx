import type { ReactElement } from "react";
import Navigation from "../navigation";
import { Page, Header, Avatar, Name, Label, Input } from "./styles";
import type { Props } from "./types";

/** User profile page with an editable name field, avatar, and email. */
export default function User({
  id,
  name,
  email,
  onNameChange,
}: Props): ReactElement {
  return (
    <>
      <Navigation />
      <Page>
        <Header>
          <Avatar src={`https://i.pravatar.cc/80?u=user${id}`} alt={name} />
          <Name>{name}</Name>
        </Header>
        <Label>
          Name
          <Input
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </Label>
        <p>Email: {email}</p>
      </Page>
    </>
  );
}
