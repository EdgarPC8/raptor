import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { PanelSkeleton } from "../../../../components/ContentSkeleton.jsx";

/**
 * Monta children solo cuando el bloque entra cerca del viewport.
 * Evita disparar 10+ endpoints pesados al abrir el dashboard.
 */
export default function DeferredMount({
  children,
  height = 280,
  rootMargin = "240px",
  minDelayMs = 0,
}) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const el = ref.current;
    if (!el) return undefined;

    const reveal = () => {
      if (cancelled || ready) return;
      if (minDelayMs > 0) {
        timer = window.setTimeout(() => {
          if (!cancelled) setReady(true);
        }, minDelayMs);
      } else {
        setReady(true);
      }
    };

    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return () => {
        cancelled = true;
        if (timer) window.clearTimeout(timer);
      };
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reveal();
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [rootMargin, minDelayMs, ready]);

  return (
    <Box ref={ref} sx={{ minWidth: 0, width: "100%" }}>
      {ready ? children : <PanelSkeleton height={height} />}
    </Box>
  );
}
