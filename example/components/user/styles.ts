import styled from "@emotion/styled";

/** Padded page wrapper for the user profile view. */
export const Page = styled.div`
  padding: 24px;
`;

/** Horizontal layout for the user avatar and name heading. */
export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
`;

/** Circular user avatar image. */
export const Avatar = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
`;

/** User display name heading with no default margin. */
export const Name = styled.h1`
  margin: 0;
`;

/** Block-level label for the editable name input. */
export const Label = styled.label`
  display: block;
  margin-bottom: 12px;
`;

/** Text input for editing the user's display name. */
export const Input = styled.input`
  margin-left: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #ddd;
`;
