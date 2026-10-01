'use client';

import React, { useRef, useState } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { usePrefersReducedMotion } from '@/lib/motion/reduced-motion';
import { motionTokens } from '@/lib/motion/tokens';

export interface MagneticButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  strength?: number;
}

export function MagneticButton({
  children,
  strength = 0.25,
  className = '',
  onClick,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const prefersReduced = usePrefersReducedMotion();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (prefersReduced || typeof window === 'undefined') return;
    // Don't calculate for coarse pointers (touch)
    if (window.matchMedia('(pointer: coarse)').matches) return;

    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    // Clamp maximum translation between -3px and 3px to keep it tasteful
    const clampedX = Math.max(-3, Math.min(3, deltaX));
    const clampedY = Math.max(-3, Math.min(3, deltaY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
    setIsPressed(false);
  };

  if (prefersReduced) {
    return (
      <motion.button ref={ref} className={className} onClick={onClick} {...props}>
        {children}
      </motion.button>
    );
  }

  return (
    <motion.button
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={onClick}
      animate={{
        x: position.x,
        y: position.y,
        scale: isPressed ? 0.975 : position.x !== 0 || position.y !== 0 ? 1.01 : 1,
      }}
      transition={motionTokens.spring.magnetic}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export interface MagneticLinkProps extends Omit<HTMLMotionProps<'a'>, 'children'> {
  children: React.ReactNode;
  strength?: number;
}

export function MagneticLink({
  children,
  href = '#',
  strength = 0.25,
  className = '',
  ...props
}: MagneticLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const prefersReduced = usePrefersReducedMotion();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (prefersReduced || typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    const clampedX = Math.max(-3, Math.min(3, deltaX));
    const clampedY = Math.max(-3, Math.min(3, deltaY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
    setIsPressed(false);
  };

  if (prefersReduced) {
    return (
      <motion.a ref={ref} href={href} className={className} {...props}>
        {children}
      </motion.a>
    );
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      animate={{
        x: position.x,
        y: position.y,
        scale: isPressed ? 0.975 : position.x !== 0 || position.y !== 0 ? 1.01 : 1,
      }}
      transition={motionTokens.spring.magnetic}
      {...props}
    >
      {children}
    </motion.a>
  );
}
