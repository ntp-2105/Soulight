export interface Damageable {
  readonly maxHealth: number;
  health: number;
  active: boolean;
  takeDamage(amount: number): number;
}

export function applyDamage(currentHealth: number, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return Math.max(0, currentHealth);
  }

  return Math.max(0, currentHealth - amount);
}
