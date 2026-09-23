import Phaser from 'phaser';
import { PLAYER_BALANCE } from '../../data/balance';
import { ACTOR_FRAMES, ASSET_KEYS } from '../../data/assets';
import type { PlayerInput } from '../types';
import { applyDamage, type Damageable } from './Damageable';

export class Player extends Phaser.Physics.Arcade.Image implements Damageable {
  readonly maxHealth = PLAYER_BALANCE.maxHealth;
  health: number = this.maxHealth;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ASSET_KEYS.ACTORS, ACTOR_FRAMES.PLAYER);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(20);
    this.setDisplaySize(48, 48);
    this.setCircle(6, 2, 2);
  }

  move(input: PlayerInput): void {
    this.setVelocity(input.moveX * PLAYER_BALANCE.moveSpeed, input.moveY * PLAYER_BALANCE.moveSpeed);
  }

  stop(): void {
    this.setVelocity(0, 0);
  }

  takeDamage(amount: number): number {
    if (!this.active || this.health <= 0) return this.health;
    this.health = applyDamage(this.health, amount);
    return this.health;
  }
}
