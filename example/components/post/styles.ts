import styled from "@emotion/styled";

/** Padded page wrapper for the post detail view. */
export const Page = styled.div`
  padding: 24px;
`;

/** Full-width coloured banner whose background is derived from a hue value. */
export const Hero = styled.div<{ hue: number }>`
  height: 200px;
  border-radius: 12px;
  background: hsl(${({ hue }) => hue}, 60%, 85%);
  margin-bottom: 24px;
`;

/** Body paragraph text with relaxed line-height. */
export const Body = styled.p`
  line-height: 1.6;
  color: #444;
`;
