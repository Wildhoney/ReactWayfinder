import styled from "@emotion/styled";

/** Padded page wrapper matching the post detail layout. */
export const Page = styled.div`
  padding: 24px;
`;

/** Pulsing grey placeholder for the post hero banner. */
export const HeroPlaceholder = styled.div`
  height: 200px;
  border-radius: 12px;
  background: #eee;
  margin-bottom: 24px;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
`;
