import styled from "@emotion/styled";

export const Page = styled.div`
  padding: 24px;
`;

export const SubNav = styled.nav`
  display: flex;
  gap: 4px;
  margin: 16px 0;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
`;

export const Tab = styled.a<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px 6px 0 0;
  text-decoration: none;
  color: ${({ active }) => (active ? "#111" : "#666")};
  background: ${({ active }) => (active ? "#f0f0f0" : "transparent")};
  font-weight: ${({ active }) => (active ? 600 : 400)};
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #f5f5f5;
  }
`;

export const Content = styled.div`
  padding: 16px 0;
`;
