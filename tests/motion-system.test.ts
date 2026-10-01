import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOTION_DURATIONS,
  MOTION_DURATIONS_MS,
  MOTION_EASINGS,
  MOTION_SPRINGS,
  MOTION_DELAYS,
} from '../lib/motion/tokens.ts';
import {
  pageVariants,
  fadeInVariants,
  slideUpVariants,
  scaleInVariants,
  staggerContainerVariants,
  staggerItemVariants,
  drawerRightVariants,
  badgePopVariants,
} from '../lib/motion/variants.ts';
import { isReducedMotionPreferred } from '../lib/motion/reduced-motion.ts';

void test('1. Motion System: Semantic Durations conform to target ranges', () => {
  // Instant: 80–120ms
  assert.ok(MOTION_DURATIONS_MS.instant >= 80 && MOTION_DURATIONS_MS.instant <= 120);
  assert.equal(MOTION_DURATIONS.instant, 0.1);

  // Fast: 140–180ms
  assert.ok(MOTION_DURATIONS_MS.fast >= 140 && MOTION_DURATIONS_MS.fast <= 180);
  assert.equal(MOTION_DURATIONS.fast, 0.16);

  // Standard: 180–240ms
  assert.ok(MOTION_DURATIONS_MS.standard >= 180 && MOTION_DURATIONS_MS.standard <= 240);
  assert.equal(MOTION_DURATIONS.standard, 0.22);

  // Emphasis: 240–340ms
  assert.ok(MOTION_DURATIONS_MS.emphasis >= 240 && MOTION_DURATIONS_MS.emphasis <= 340);
  assert.equal(MOTION_DURATIONS.emphasis, 0.28);

  // Page: 220–320ms
  assert.ok(MOTION_DURATIONS_MS.page >= 220 && MOTION_DURATIONS_MS.page <= 320);
  assert.equal(MOTION_DURATIONS.page, 0.24);
});

void test('2. Motion System: Natural Deceleration and Easing Curves', () => {
  assert.ok(Array.isArray(MOTION_EASINGS.easeOutExpo));
  assert.equal(MOTION_EASINGS.easeOutExpo.length, 4);
  assert.equal(MOTION_EASINGS.easeOutExpo[0], 0.16);
  assert.equal(MOTION_EASINGS.easeOutExpo[1], 1);

  assert.ok(Array.isArray(MOTION_EASINGS.easeInQuad));
  assert.equal(MOTION_EASINGS.easeInQuad.length, 4);

  assert.ok(MOTION_EASINGS.cssEaseOut.includes('cubic-bezier'));
  assert.ok(MOTION_EASINGS.cssEaseIn.includes('cubic-bezier'));
  assert.ok(MOTION_EASINGS.cssEaseInOut.includes('cubic-bezier'));
});

void test('3. Motion System: Calibrated Springs Settle Rapidly', () => {
  // Snappy spring
  assert.equal(MOTION_SPRINGS.snappy.type, 'spring');
  assert.ok(MOTION_SPRINGS.snappy.stiffness >= 400);
  assert.ok(MOTION_SPRINGS.snappy.damping >= 30);

  // Smooth spring for drawers
  assert.equal(MOTION_SPRINGS.smooth.type, 'spring');
  assert.ok(MOTION_SPRINGS.smooth.stiffness >= 300);

  // Gentle spring
  assert.equal(MOTION_SPRINGS.gentle.type, 'spring');
});

void test('4. Motion System: Page Variants have GPU-Friendly Transform and Opacity', () => {
  assert.ok(pageVariants.initial);
  assert.ok(pageVariants.animate);
  assert.ok(pageVariants.exit);

  // Initial state uses opacity and translateY
  const initial = pageVariants.initial as Record<string, unknown>;
  assert.equal(initial.opacity, 0);
  assert.equal(initial.y, 8);

  const animate = pageVariants.animate as Record<string, unknown>;
  assert.equal(animate.opacity, 1);
  assert.equal(animate.y, 0);

  const exit = pageVariants.exit as Record<string, unknown>;
  assert.equal(exit.opacity, 0);

  // Fade In and Slide Up
  assert.ok(fadeInVariants.initial);
  assert.ok(fadeInVariants.animate);
  assert.ok(slideUpVariants.initial);
  assert.ok(slideUpVariants.animate);
});

void test('5. Motion System: Stagger Container has rapid child delays', () => {
  assert.ok(MOTION_DELAYS.staggerFast <= 0.05); // Never make users wait
  assert.ok(staggerContainerVariants.animate);
  assert.ok(staggerItemVariants.animate);
});

void test('6. Motion System: Drawer and Popover Variants have clean coordinates', () => {
  const drawerInitial = drawerRightVariants.initial as Record<string, unknown>;
  assert.equal(drawerInitial.x, '100%');

  const drawerAnimate = drawerRightVariants.animate as Record<string, unknown>;
  assert.equal(drawerAnimate.x, 0);

  const scaleInitial = scaleInVariants.initial as Record<string, unknown>;
  assert.equal(scaleInitial.opacity, 0);
  assert.equal(scaleInitial.scale, 0.97);

  const badgeInitial = badgePopVariants.initial as Record<string, unknown>;
  assert.equal(badgeInitial.scale, 0.85);
});

void test('7. Motion System: Reduced Motion is safely resolved server-side without crashing', () => {
  // In Node test environment, window is undefined -> must safely return false without exception
  const result = isReducedMotionPreferred();
  assert.equal(typeof result, 'boolean');
  assert.equal(result, false);
});

void test('8. Phase 2.9 Motion Tokens: Primitives conform to duration, easing, spring, and distance tokens', async () => {
  const { motionTokens } = await import('../lib/motion/tokens.ts');
  assert.ok(motionTokens.duration.instant <= 0.12);
  assert.ok(motionTokens.duration.fast <= 0.18);
  assert.ok(motionTokens.duration.normal <= 0.25);
  assert.ok(motionTokens.duration.expressive <= 0.4);
  assert.ok(motionTokens.duration.cinematic <= 0.7);

  assert.equal(motionTokens.spring.responsive.type, 'spring');
  assert.ok(motionTokens.spring.responsive.stiffness >= 400);
  assert.ok(motionTokens.spring.magnetic.stiffness >= 450);

  assert.equal(motionTokens.distance.micro, 2);
  assert.equal(motionTokens.distance.small, 6);
  assert.equal(motionTokens.distance.medium, 12);
  assert.equal(motionTokens.distance.large, 24);
});

void test('9. Phase 2.9 Cinematic Route Variants: Correct scale, blur, and opacity choreography', async () => {
  const { cinematicRouteVariants } = await import('../lib/motion/variants.ts');
  const initial = cinematicRouteVariants.initial as Record<string, unknown>;
  assert.equal(initial.opacity, 0);
  assert.equal(initial.y, 10);
  assert.equal(initial.scale, 0.995);
  assert.equal(initial.filter, 'blur(4px)');

  const animate = cinematicRouteVariants.animate as Record<string, unknown>;
  assert.equal(animate.opacity, 1);
  assert.equal(animate.y, 0);
  assert.equal(animate.scale, 1);
  assert.equal(animate.filter, 'blur(0px)');

  const exit = cinematicRouteVariants.exit as Record<string, unknown>;
  assert.equal(exit.opacity, 0);
  assert.equal(exit.y, -6);
  assert.equal(exit.scale, 0.995);
  assert.equal(exit.filter, 'blur(3px)');
});

void test('10. Phase 2.9 AI Motion Language: aiSparkleVariants and hero choreography timing', async () => {
  const { aiSparkleVariants, heroChoreographyContainer, paretoBarVariants } = await import('../lib/motion/variants.ts');
  assert.ok(aiSparkleVariants.animate);
  assert.ok(heroChoreographyContainer.animate);
  assert.ok(typeof paretoBarVariants.animate === 'function');
  const barMotion = (paretoBarVariants.animate as (i: number) => Record<string, unknown>)(2);
  assert.equal(barMotion.scaleY, 1);
  assert.equal(barMotion.opacity, 1);
});

