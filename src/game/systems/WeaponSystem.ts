import Phaser from 'phaser';
import { WEAPONS } from '../../data/balance';
import { ASSET_KEYS } from '../../data/assets';
import { canFire, spreadAngles } from '../../gameplay/weapons/WeaponMath';
import type { WeaponDefinition, WeaponId } from '../../gameplay/weapons/WeaponDefinition';
import { Projectile } from '../entities/Projectile';
import type { Player } from '../entities/Player';
import type { PlayerInput } from '../types';
import type { CombatSystem } from './CombatSystem';
import type { EffectsSystem } from './EffectsSystem';

export class WeaponSystem {
  readonly projectiles: Phaser.Physics.Arcade.Group;
  private readonly projectileSet = new Set<Projectile>();
  private currentWeaponId: WeaponId = 'pistol';
  private lastFiredAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly effects: EffectsSystem,
  ) {
    this.projectiles = scene.physics.add.group();
  }

  get currentWeapon(): WeaponDefinition {
    return WEAPONS[this.currentWeaponId];
  }

  select(id: WeaponId): void {
    this.currentWeaponId = id;
  }

  update(input: PlayerInput, combat: CombatSystem, enabled: boolean): void {
    this.cleanupProjectiles();
    for (const projectile of this.projectileSet) projectile.updateLifetime(this.scene.time.now);
    if (!enabled || !input.fire) return;
    this.tryFire(input, combat);
  }

  cooldownRatio(nowMs: number): number {
    return Phaser.Math.Clamp((nowMs - this.lastFiredAt) / this.currentWeapon.fireIntervalMs, 0, 1);
  }

  activeProjectiles(): Iterable<Projectile> {
    return this.projectileSet;
  }

  private tryFire(input: PlayerInput, combat: CombatSystem): void {
    const weapon = this.currentWeapon;
    const now = this.scene.time.now;
    if (!canFire(now, this.lastFiredAt, weapon.fireIntervalMs)) return;
    this.lastFiredAt = now;

    const baseAngle = Math.atan2(input.aimY, input.aimX);
    if (weapon.kind === 'melee') {
      this.effects.swordArc(this.player.x, this.player.y, baseAngle, weapon.meleeRange, weapon.meleeArcDegrees, weapon.color);
      combat.performMelee(this.player, { x: input.aimX, y: input.aimY }, weapon);
      return;
    }

    this.effects.muzzle(this.player.x, this.player.y, { x: input.aimX, y: input.aimY }, weapon.color);
    const single = weapon.projectileCount === 1;
    const spreadRad = weapon.spreadDegrees * Math.PI / 180;
    for (const fanAngle of spreadAngles(baseAngle, weapon.projectileCount, weapon.spreadDegrees)) {
      // jitter: single shot wanders within the spread cone, fan pellets get ±0.03 rad
      const angle = fanAngle + (single ? Phaser.Math.FloatBetween(-spreadRad / 2, spreadRad / 2) : Phaser.Math.FloatBetween(-0.03, 0.03));
      const projectile = new Projectile(
        this.scene,
        this.player.x + Math.cos(angle) * 31,
        this.player.y + Math.sin(angle) * 31,
        angle,
        weapon.projectileSpeed,
        weapon.projectileLifetimeMs,
        weapon.damage,
        weapon.id === 'shotgun' ? ASSET_KEYS.EMBER : ASSET_KEYS.MAGIC,
        weapon.id === 'shotgun' ? 12 : 16,
      );
      projectile.setTint(weapon.color);
      this.projectiles.add(projectile);
      // Group.add re-applies group defaults (velocity 0), wiping the velocity set in the constructor
      projectile.setVelocity(Math.cos(angle) * weapon.projectileSpeed, Math.sin(angle) * weapon.projectileSpeed);
      this.projectileSet.add(projectile);
    }
  }

  private cleanupProjectiles(): void {
    for (const projectile of this.projectileSet) {
      if (!projectile.active) this.projectileSet.delete(projectile);
    }
  }
}
