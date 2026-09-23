import type { Vector2Like } from '../types';

export function normalizeMovement(x: number, y: number): Vector2Like {
  const length = Math.hypot(x, y);
  if (length <= 1) return { x, y };
  return { x: x / length, y: y / length };
}

export function normalizeAim(x: number, y: number, fallback: Vector2Like): Vector2Like {
  const length = Math.hypot(x, y);
  if (length < 0.0001) return { ...fallback };
  return { x: x / length, y: y / length };
}
