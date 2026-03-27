import { useState, useEffect, type ReactElement } from "react";
import { useNProgress } from "@tanem/react-nprogress";
import { useRouter } from "react-wayfinder";
import { Container, Bar, Peg } from "./styles";

/** Top-of-page progress bar that animates while any navigation loader is running. */
export default function Progress(): ReactElement {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { animationDuration, isFinished, progress } = useNProgress({
    isAnimating: mounted && router.status === "navigating",
  });

  return (
    <Container
      style={{
        opacity: isFinished ? 0 : 1,
        transition: `opacity ${animationDuration}ms linear`,
      }}
    >
      <Bar
        style={{
          marginLeft: `${(-1 + progress) * 100}%`,
          transition: isFinished
            ? "none"
            : `margin-left ${animationDuration}ms linear`,
        }}
      >
        <Peg />
      </Bar>
    </Container>
  );
}
