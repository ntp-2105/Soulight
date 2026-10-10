import Phaser from 'phaser';
import { ENEMY_BALANCE } from '../../data/balance';
import { isWithinMeleeArc } from '../../gameplay/weapons/WeaponMath';
import type { WeaponDefinition } from '../../gameplay/weapons/WeaponDefinition';
import type { ChaserEnemy } from '../entities/ChaserEnemy';
import type { Player } from '../entities/Player';
import type { Projectile } from '../entities/Projectile';
import type { EnemyRenderer } from '../renderers/EnemyRenderer';
import type { PlayerRenderer } from '../renderers/PlayerRenderer';
import type { Vector2Like } from '../types';
import type { EffectsSystem } from './EffectsSystem';
import type { WaveSystem } from './WaveSystem';

export interface CombatCallbacks {
  onPlayerDamaged: () => void;
  onEnemyKilled: () => void;
}

export class CombatSystem {
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    private readonly playerRenderer: PlayerRenderer,
    private readonly enemyRenderer: EnemyRenderer,
    private readonly wave: WaveSystem,
    projectiles: Phaser.Physics.Arcade.Group,
    walls: Phaser.Physics.Arcade.StaticGroup,
    private readonly effects: EffectsSystem,
    private readonly callbacks: CombatCallbacks,
  ) {
    scene.physics.add.collider(player, walls);
    scene.physics.add.collider(wave.enemies, walls);
    scene.physics.add.collider(wave.enemies, wave.enemies);
    scene.physics.add.collider(projectiles, walls, (projectileObject) => projectileObject.destroy());
    scene.physics.add.overlap(projectiles, wave.enemies, (projectileObject, enemyObject) => {
      this.projectileHit(projectileObject as Projectile, enemyObject as ChaserEnemy);
    });
    scene.physics.add.overlap(player, wave.enemies, (_playerObject, enemyObject) => {
      this.enemyContact(enemyObject as ChaserEnemy, scene.time.now);
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  performMelee(origin: Vector2Like, aim: Vector2Like, weapon: WeaponDefinition): void {
    if (!this.enabled) return;
    for (const enemy of this.wave.livingEnemies()) {
      if (!isWithinMeleeArc(origin, enemy, aim, weapon.meleeRange, weapon.meleeArcDegrees, 16)) continue;
      this.damageEnemy(enemy, weapon.damage);
      if (enemy.health > 0) enemy.knockback(origin.x, origin.y, this.player.scene.time.now);
    }
  }

  private projectileHit(projectile: Projectile, enemy: ChaserEnemy): void {
    if (!this.enabled || !projectile.active || !enemy.active) return;
    this.effects.hit(projectile.x, projectile.y);
    const damage = projectile.damage;
    projectile.destroy();
    this.damageEnemy(enemy, damage);
  }

  private damageEnemy(enemy: ChaserEnemy, damage: number): void {
    if (!enemy.active) return;
    enemy.takeDamage(damage);
    this.enemyRenderer.flash(enemy);
    if (enemy.health > 0) return;
    this.wave.markKilled(enemy);
    this.callbacks.onEnemyKilled();
  }

  private enemyContact(enemy: ChaserEnemy, nowMs: number): void {
    if (!this.enabled || !enemy.active || !this.player.active || !enemy.canDealContactDamage(nowMs)) return;
    enemy.recordContactDamage(nowMs);
    this.player.takeDamage(ENEMY_BALANCE.contactDamage);
    this.playerRenderer.flash();
    this.effects.playerDamaged();
    this.callbacks.onPlayerDamaged();
  }
}
