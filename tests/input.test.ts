import { describe, expect, it } from 'vitest';
import { normalizeAim, normalizeMovement } from '../src/game/input/InputMath';

describe('input normalization', () => {
  it('prevents diagonal movement from exceeding unit speed', () => {
    const movement = normalizeMovement(1, 1);
    expect(Math.hypot(movement.x, movement.y)).toBeCloseTo(1);
    expect(movement.x).toBeCloseTo(Math.SQRT1_2);
  });

  it('preserves cardinal and zero movement', () => {
    expect(normalizeMovement(-1, 0)).toEqual({ x: -1, y: 0 });
    expect(normalizeMovement(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('uses the previous aim when the pointer is exactly over the player', () => {
    expect(normalizeAim(0, 0, { x: 0, y: -1 })).toEqual({ x: 0, y: -1 });
  });
});
