import type { Vector2Like } from '../../game/types';

export function canFire(nowMs: number, lastFiredAtMs: number, fireIntervalMs: number): boolean {
  return nowMs - lastFiredAtMs >= fireIntervalMs;
}

export function spreadAngles(baseAngle: number, count: number, spreadDegrees: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [baseAngle];

  const spreadRadians = spreadDegrees * Math.PI / 180;
  const start = baseAngle - spreadRadians / 2;
  const step = spreadRadians / (count - 1);
  return Array.from({ length: count }, (_, index) => start + index * step);
}

export function isWithinMeleeArc(
  origin: Vector2Like,
  target: Vector2Like,
  aim: Vector2Like,
  range: number,
  arcDegrees: number,
  targetRadius = 0,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance > range + targetRadius) return false;
  if (distance === 0) return true;

  const aimLength = Math.hypot(aim.x, aim.y);
  if (aimLength === 0) return false;

  const dot = (dx / distance) * (aim.x / aimLength) + (dy / distance) * (aim.y / aimLength);
  const minimumDot = Math.cos((arcDegrees / 2) * Math.PI / 180);
  return dot >= minimumDot;
}

/** Moves (x,y) by (dx,dy) in steps of at most maxStep px; stops at the first position where blocked() is true. */
export function advance(
  x: number,
  y: number,
  dx: number,
  dy: number,
  maxStep: number,
  blocked: (x: number, y: number) => boolean,
): { x: number; y: number; hit: boolean } {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / maxStep));
  for (let i = 0; i < steps; i++) {
    x += dx / steps;
    y += dy / steps;
    if (blocked(x, y)) return { x, y, hit: true };
  }
  return { x, y, hit: false };
}
