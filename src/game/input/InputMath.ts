import type { PlayerInput, Vector2Like } from '../types';

export interface HeldInputState {
  up: boolean;
  left: boolean;
  down: boolean;
  right: boolean;
  fire: boolean;
  ability: boolean;
  interact: boolean;
}

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

export function composePlayerInput(
  held: Readonly<HeldInputState>,
  aimFallback: Vector2Like,
): Omit<PlayerInput, 'sequence' | 'clientTick'> {
  const movement = normalizeMovement(
    Number(held.right) - Number(held.left),
    Number(held.down) - Number(held.up),
  );
  // Facing follows movement; standing still keeps the last facing.
  const aim = normalizeAim(movement.x, movement.y, aimFallback);

  return {
    moveX: movement.x,
    moveY: movement.y,
    aimX: aim.x,
    aimY: aim.y,
    fire: held.fire,
    ability: held.ability,
    interact: held.interact,
  };
}
