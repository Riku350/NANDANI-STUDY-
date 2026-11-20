import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  formatter?: (val: number) => string;
  durationMs?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  formatter = (v) => String(Math.round(v)),
  durationMs = 550,
  className = '',
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const previousRef = useRef(value);

  useEffect(() => {
    const startVal = previousRef.current;
    const endVal = value;
    if (startVal === endVal) {
      setDisplay(endVal);
      return;
    }

    const startTime = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * eased;
      setDisplay(current);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousRef.current = endVal;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, durationMs]);

  return <span className={`tabular-nums ${className}`}>{formatter(display)}</span>;
}
