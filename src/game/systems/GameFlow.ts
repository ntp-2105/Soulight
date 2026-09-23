import { GamePhase } from '../types';

export function resolveGamePhase(playerHealth: number, livingEnemies: number): GamePhase {
  if (playerHealth <= 0) return GamePhase.Defeat;
  if (livingEnemies <= 0) return GamePhase.Victory;
  return GamePhase.Playing;
}
