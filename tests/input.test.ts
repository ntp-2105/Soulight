import { describe, expect, it } from 'vitest';
import { composePlayerInput, normalizeAim, normalizeMovement, type HeldInputState } from '../src/game/input/InputMath';

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

  it('uses the previous aim when no aim direction is held', () => {
    expect(normalizeAim(0, 0, { x: 0, y: -1 })).toEqual({ x: 0, y: -1 });
  });

  const idle: HeldInputState = {
    up: false, left: false, down: false, right: false,
    fire: false, ability: false, interact: false,
  };

  it('aims along diagonal movement and fires in the same command', () => {
    const input = composePlayerInput({ ...idle, up: true, right: true, fire: true }, { x: 0, y: -1 });

    expect(input.fire).toBe(true);
    expect(input.moveX).toBeCloseTo(Math.SQRT1_2);
    expect(input.moveY).toBeCloseTo(-Math.SQRT1_2);
    expect(input.aimX).toBeCloseTo(Math.SQRT1_2);
    expect(input.aimY).toBeCloseTo(-Math.SQRT1_2);
  });

  it('keeps the previous facing when standing still', () => {
    const firingOnly = composePlayerInput({ ...idle, fire: true }, { x: 0, y: 1 });
    expect(firingOnly).toMatchObject({ moveX: 0, moveY: 0, aimX: 0, aimY: 1, fire: true });
  });
});
