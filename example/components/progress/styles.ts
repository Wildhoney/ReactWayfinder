import styled from "@emotion/styled";

/** Non-interactive wrapper that holds the progress bar at the top of the viewport. */
export const Container = styled.div`
  pointer-events: none;
`;

/** Fixed-position blue bar that slides from left to right as progress increases. */
export const Bar = styled.div`
  background: #29d;
  height: 2px;
  left: 0;
  margin-left: 0;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1031;
`;

/** Glowing highlight at the leading edge of the progress bar. */
export const Peg = styled.div`
  box-shadow:
    0 0 10px #29d,
    0 0 5px #29d;
  display: block;
  height: 100%;
  opacity: 1;
  position: absolute;
  right: 0;
  transform: rotate(3deg) translate(0px, -4px);
  width: 100px;
`;
