import styled from "@emotion/styled";

/** Horizontal flex container for navigation links. */
export const Container = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-bottom: 1px solid #eee;
`;

/** Navigation link with active-state highlighting. */
export const A = styled.a<{ active?: boolean }>`
  font-weight: ${({ active }) => (active ? "bold" : "normal")};
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  background: ${({ active }) => (active ? "#f0f0f0" : "transparent")};

  &:hover {
    background: #f5f5f5;
  }
`;
