import type { WeaponDefinition, WeaponId } from '../gameplay/weapons/WeaponDefinition';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const WALL_SIZE = 48;

export const PLAYER_BALANCE = {
  maxHealth: 100,
  moveSpeed: 240,
} as const;

export const ENEMY_BALANCE = {
  count: 8,
  maxHealth: 40,
  moveSpeed: 90,
  contactDamage: 10,
  contactCooldownMs: 800,
} as const;

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  pistol: {
    id: 'pistol',
    name: 'Apprentice Wand',
    kind: 'projectile',
    damage: 16,
    fireIntervalMs: 220,
    energyCost: 0,
    projectileCount: 1,
    projectileSpeed: 850,
    projectileLifetimeMs: 900,
    spreadDegrees: 3,
    meleeRange: 0,
    meleeArcDegrees: 0,
    color: 0x48e5ff,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Ember Staff',
    kind: 'projectile',
    damage: 8,
    fireIntervalMs: 700,
    energyCost: 0,
    projectileCount: 7,
    projectileSpeed: 700,
    projectileLifetimeMs: 450,
    spreadDegrees: 28,
    meleeRange: 0,
    meleeArcDegrees: 0,
    color: 0xffb44a,
  },
  sword: {
    id: 'sword',
    name: "Knight's Blade",
    kind: 'melee',
    damage: 32,
    fireIntervalMs: 450,
    energyCost: 0,
    projectileCount: 0,
    projectileSpeed: 0,
    projectileLifetimeMs: 0,
    spreadDegrees: 0,
    meleeRange: 100,
    meleeArcDegrees: 100,
    color: 0xcf65ff,
  },
};

export const WEAPON_ORDER: readonly WeaponId[] = ['pistol', 'shotgun', 'sword'];
