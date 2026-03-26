import styled from "@emotion/styled";

/** Fixed top-right anchor containing the GitHub octocat SVG with a hover wave animation. */
export const Corner = styled.a`
  position: fixed;
  top: 0;
  right: 0;
  z-index: 999;

  svg {
    fill: #151513;
    color: #fff;
    width: 80px;
    height: 80px;
  }

  .octo-arm {
    transform-origin: 130px 106px;
  }

  &:hover .octo-arm {
    animation: octocat-wave 560ms ease-in-out;
  }

  @keyframes octocat-wave {
    0%,
    100% {
      transform: rotate(0);
    }
    20%,
    60% {
      transform: rotate(-25deg);
    }
    40%,
    80% {
      transform: rotate(10deg);
    }
  }
`;
