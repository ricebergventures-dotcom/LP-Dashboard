"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 to `target` over `duration` ms using
 * an ease-out curve. Returns the current display value.
 */
export function useCountUp(target: number, duration = 900, delay = 0): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }

    let startTime: number | null = null;
    const startValue = 0;

    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      // ease-out cubic
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startValue + (target - startValue) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return value;
}
