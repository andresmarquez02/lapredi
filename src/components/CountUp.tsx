"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  ease?: string;
  className?: string;
}

/**
 * Minimal GSAP-driven number tween - the react-bits CountUp component pulls
 * in `motion` (Framer Motion) as its only variant's dependency, which would
 * add a second animation runtime alongside GSAP. Tweens a plain object and
 * writes the formatted text directly to the DOM node (no per-frame React
 * state), which is the standard low-overhead GSAP count-up pattern.
 */
export function CountUp({ value, duration = 0.8, decimals = 0, prefix = "", suffix = "", ease = "power2.out", className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const state = { val: fromRef.current };
    const tween = gsap.to(state, {
      val: value,
      duration,
      ease,
      onUpdate: () => {
        el.textContent = `${prefix}${state.val.toFixed(decimals)}${suffix}`;
      },
      onComplete: () => {
        fromRef.current = value;
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, duration, decimals, prefix, suffix, ease]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
