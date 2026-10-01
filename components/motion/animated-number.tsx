'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'motion/react';
import { usePrefersReducedMotion } from '@/lib/motion/reduced-motion';
import { MOTION_SPRINGS } from '@/lib/motion/tokens';

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  format,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedNumberProps) {
  const prefersReduced = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState<string>(
    format ? format(value) : `${prefix}${value.toLocaleString('id-ID')}${suffix}`,
  );

  const spring = useSpring(value, {
    stiffness: MOTION_SPRINGS.snappy.stiffness,
    damping: MOTION_SPRINGS.snappy.damping,
    mass: MOTION_SPRINGS.snappy.mass,
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    if (prefersReduced) return;

    const unsubscribe = spring.on('change', (latest) => {
      const rounded = Math.round(latest);
      if (format) {
        setDisplayValue(format(rounded));
      } else {
        setDisplayValue(`${prefix}${rounded.toLocaleString('id-ID')}${suffix}`);
      }
    });

    return () => unsubscribe();
  }, [spring, value, format, prefix, suffix, prefersReduced]);

  if (prefersReduced) {
    return (
      <span className={className}>
        {format ? format(value) : `${prefix}${value.toLocaleString('id-ID')}${suffix}`}
      </span>
    );
  }

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
    >
      {displayValue}
    </motion.span>
  );
}

export function AnimatedCurrency({
  value,
  compact = false,
  className = '',
}: {
  value: number;
  compact?: boolean;
  className?: string;
}) {
  const format = (n: number) => {
    if (compact) {
      if (Math.abs(n) >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1)}M`;
      if (Math.abs(n) >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1)}jt`;
      if (Math.abs(n) >= 1_000) return `Rp${(n / 1_000).toFixed(0)}K`;
      return `Rp${n.toLocaleString('id-ID')}`;
    }
    return `Rp${n.toLocaleString('id-ID')}`;
  };

  return <AnimatedNumber value={value} format={format} className={className} />;
}

export function AnimatedPercentage({
  value,
  className = '',
}: {
  value: number;
  className?: string;
}) {
  const format = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
  return <AnimatedNumber value={value} format={format} className={className} />;
}
