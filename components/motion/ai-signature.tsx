'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { usePrefersReducedMotion } from '@/lib/motion/reduced-motion';
import { aiSparkleVariants } from '@/lib/motion/variants';

export function AISparkleIcon({
  size = 16,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();

  if (prefersReduced) {
    return <Sparkles size={size} className={className} />;
  }

  return (
    <motion.span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      variants={aiSparkleVariants}
      initial="initial"
      animate="animate"
    >
      <Sparkles size={size} />
    </motion.span>
  );
}

export function AIGenerationState({
  label = 'Synthesizing grounded workspace intelligence...',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();

  return (
    <div
      className={`relative overflow-hidden p-5 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/60 to-purple-50/50 text-[#2563EB] shadow-xs ${className}`}
    >
      {/* Subtle moving ambient gradient glow */}
      {!prefersReduced && (
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-300 via-indigo-200 to-transparent"
          animate={{
            opacity: [0.2, 0.45, 0.2],
            scale: [1, 1.05, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 4,
            ease: 'easeInOut',
          }}
          aria-hidden="true"
        />
      )}

      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-2.5">
          <AISparkleIcon size={16} className="text-[#2563EB]" />
          <span className="font-semibold text-xs tracking-tight text-[#1E40AF]">
            {label}
          </span>
        </div>

        {/* Shimmer skeleton lines */}
        <div className="space-y-2 pt-1">
          <div className="relative h-2.5 bg-blue-200/50 rounded-full overflow-hidden w-4/5">
            {!prefersReduced && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              />
            )}
          </div>
          <div className="relative h-2.5 bg-blue-200/40 rounded-full overflow-hidden w-full">
            {!prefersReduced && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut', delay: 0.2 }}
              />
            )}
          </div>
          <div className="relative h-2.5 bg-blue-200/30 rounded-full overflow-hidden w-3/5">
            {!prefersReduced && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut', delay: 0.4 }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProgressiveChunkReveal({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const paragraphs = text.split('\n\n').filter(Boolean);

  if (prefersReduced || paragraphs.length <= 1) {
    return <div className={`whitespace-pre-wrap ${className}`}>{text}</div>;
  }

  return (
    <div className={`space-y-3 whitespace-pre-wrap ${className}`}>
      {paragraphs.map((p, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.24,
            delay: i * 0.08,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {p}
        </motion.p>
      ))}
    </div>
  );
}
