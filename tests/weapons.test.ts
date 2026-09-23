import { describe, expect, it } from 'vitest';
import { canFire, consumeSingleHit, isWithinMeleeArc, spreadAngles } from '../src/gameplay/weapons/WeaponMath';

describe('weapon rules', () => {
  it('enforces fire cooldowns at the exact boundary', () => {
    expect(canFire(219, 0, 220)).toBe(false);
    expect(canFire(220, 0, 220)).toBe(true);
  });

  it('generates an evenly centered shotgun spread', () => {
    const angles = spreadAngles(0, 7, 28);
    expect(angles).toHaveLength(7);
    expect(angles[0]).toBeCloseTo((-14 * Math.PI) / 180);
    expect(angles[3]).toBeCloseTo(0);
    expect(angles[6]).toBeCloseTo((14 * Math.PI) / 180);
  });

  it('checks both melee range and facing arc', () => {
    const origin = { x: 0, y: 0 };
    const aim = { x: 1, y: 0 };
    expect(isWithinMeleeArc(origin, { x: 80, y: 20 }, aim, 100, 100)).toBe(true);
    expect(isWithinMeleeArc(origin, { x: -50, y: 0 }, aim, 100, 100)).toBe(false);
    expect(isWithinMeleeArc(origin, { x: 130, y: 0 }, aim, 100, 100)).toBe(false);
  });

  it('allows a projectile to be consumed only once', () => {
    expect(consumeSingleHit(true)).toEqual({ accepted: true, active: false });
    expect(consumeSingleHit(false)).toEqual({ accepted: false, active: false });
  });
});
