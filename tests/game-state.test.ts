import { describe, expect, it } from 'vitest';
import { applyDamage } from '../src/game/entities/Damageable';
import { resolveGamePhase } from '../src/game/systems/GameFlow';
import { GamePhase } from '../src/game/types';

describe('game state rules', () => {
  it('clamps health and ignores invalid damage', () => {
    expect(applyDamage(10, 30)).toBe(0);
    expect(applyDamage(10, -5)).toBe(10);
    expect(applyDamage(10, Number.NaN)).toBe(10);
  });

  it('prioritizes defeat if player and final enemy die together', () => {
    expect(resolveGamePhase(0, 0)).toBe(GamePhase.Defeat);
  });

  it('wins only when the player is alive and every enemy is defeated', () => {
    expect(resolveGamePhase(100, 0)).toBe(GamePhase.Victory);
    expect(resolveGamePhase(100, 1)).toBe(GamePhase.Playing);
  });
});
