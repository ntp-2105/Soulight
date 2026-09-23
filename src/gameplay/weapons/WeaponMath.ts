import type { Vector2Like } from '../../game/types';

export function canFire(nowMs: number, lastFiredAtMs: number, cooldownMs: number): boolean {
  return nowMs - lastFiredAtMs >= cooldownMs;
}

export function spreadAngles(baseAngle: number, count: number, spreadDegrees: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [baseAngle];

  const spreadRadians = PhaserMath.degToRad(spreadDegrees);
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
  const minimumDot = Math.cos(PhaserMath.degToRad(arcDegrees / 2));
  return dot >= minimumDot;
}

export function consumeSingleHit(active: boolean): { accepted: boolean; active: boolean } {
  return active ? { accepted: true, active: false } : { accepted: false, active: false };
}

const PhaserMath = {
  degToRad: (degrees: number) => (degrees * Math.PI) / 180,
};
