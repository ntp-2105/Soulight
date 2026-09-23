import Phaser from 'phaser';
import { ENEMY_BALANCE } from '../../data/balance';
import { ACTOR_FRAMES, ASSET_KEYS } from '../../data/assets';
import { applyDamage, type Damageable } from './Damageable';
import type { Player } from './Player';

export class ChaserEnemy extends Phaser.Physics.Arcade.Image implements Damageable {
  readonly maxHealth = ENEMY_BALANCE.maxHealth;
  health: number = this.maxHealth;
  nextContactDamageAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ASSET_KEYS.ACTORS, ACTOR_FRAMES.ENEMY);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(15);
    this.setDisplaySize(42, 42);
    this.setCircle(6, 2, 2);
  }

  chase(player: Player): void {
    if (!this.active) return;
    const direction = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y);
    if (direction.lengthSq() < 1) {
      this.setVelocity(0, 0);
      return;
    }
    direction.normalize().scale(ENEMY_BALANCE.moveSpeed);
    this.setVelocity(direction.x, direction.y);
    this.setFlipX(direction.x < 0);
  }

  stop(): void {
    this.setVelocity(0, 0);
  }

  canDealContactDamage(nowMs: number): boolean {
    return nowMs >= this.nextContactDamageAt;
  }

  recordContactDamage(nowMs: number): void {
    this.nextContactDamageAt = nowMs + ENEMY_BALANCE.contactCooldownMs;
  }

  takeDamage(amount: number): number {
    if (!this.active || this.health <= 0) return this.health;
    this.health = applyDamage(this.health, amount);
    return this.health;
  }
}
