import styled from "@emotion/styled";

/** Padded page wrapper for the feed view. */
export const Page = styled.div`
  padding: 24px;
`;

/** Vertical list of feed items with no default list styling. */
export const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

/** Clickable row linking to a single post detail page. */
export const Item = styled.a`
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;

  &:hover {
    background: #f5f5f5;
  }
`;

/** Coloured square thumbnail whose background is derived from a hue value. */
export const Thumbnail = styled.div<{ hue: number }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: hsl(${({ hue }) => hue}, 60%, 85%);
  flex-shrink: 0;
`;

/** Invisible element observed by `IntersectionObserver` to trigger loading the next page. */
export const Sentinel = styled.div`
  height: 1px;
`;

/** Centred "Loading..." text shown while the next page of items is being generated. */
export const LoadingIndicator = styled.p`
  text-align: center;
  color: #999;
  padding: 16px 0;
`;
