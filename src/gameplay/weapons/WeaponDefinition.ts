export type WeaponId = 'pistol' | 'shotgun' | 'sword';
export type WeaponKind = 'projectile' | 'melee';

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  kind: WeaponKind;
  damage: number;
  cooldownMs: number;
  projectileCount: number;
  projectileSpeed: number;
  projectileLifetimeMs: number;
  spreadDegrees: number;
  meleeRange: number;
  meleeArcDegrees: number;
  color: number;
}
