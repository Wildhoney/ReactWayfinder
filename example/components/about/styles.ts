import styled from "@emotion/styled";

/** Padded page wrapper for the about view. */
export const Page = styled.div`
  padding: 24px;
`;

/** Horizontal flex row of team member profile cards. */
export const Profiles = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 16px;
`;

/** Clickable team member card that navigates to the user's profile. */
export const Card = styled.button`
  background: none;
  font-size: inherit;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #f5f5f5;
  }
`;

/** Circular avatar thumbnail for a team member. */
export const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
`;
