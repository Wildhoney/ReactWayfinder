import styled from "@emotion/styled";

/** Horizontal flex container for the mode switcher row. */
export const ModeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  border-bottom: 1px solid #eee;
`;

/** Small label text beside the mode dropdown. */
export const ModeLabel = styled.label`
  font-size: 13px;
  color: #666;
`;

/** Dropdown for switching between deferred and immediate router modes. */
export const ModeSelect = styled.select`
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
`;

/** Inline CSS-only loading spinner. */
export const Spinner = styled.span`
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
