import { describe, expect, it } from 'vitest';
import { advance, canFire, isWithinMeleeArc, spreadAngles } from '../src/gameplay/weapons/WeaponMath';

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
});

describe('projectile advance', () => {
  it('cannot tunnel through a thin wall in one frame', () => {
    const wall = (x: number) => x >= 100 && x < 110;
    const r = advance(90, 0, 50, 0, 8, (x) => wall(x));
    expect(r.hit).toBe(true);
    expect(r.x).toBeLessThan(110);
  });

  it('moves the full distance when nothing blocks', () => {
    const r = advance(0, 0, 30, 40, 8, () => false);
    expect(r.hit).toBe(false);
    expect(r.x).toBeCloseTo(30);
    expect(r.y).toBeCloseTo(40);
  });
});
