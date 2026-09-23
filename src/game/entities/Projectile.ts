import Phaser from 'phaser';
import { consumeSingleHit } from '../../gameplay/weapons/WeaponMath';

export class Projectile extends Phaser.Physics.Arcade.Image {
  readonly damage: number;
  private expiresAt: number;
  private hitAvailable = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    speed: number,
    lifetimeMs: number,
    damage: number,
    texture: string,
    displaySize: number,
  ) {
    super(scene, x, y, texture);
    this.damage = damage;
    this.expiresAt = scene.time.now + lifetimeMs;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(12);
    this.setDisplaySize(displaySize, displaySize);
    this.setRotation(angle);
    const frameWidth = this.frame.realWidth;
    const localDiameter = 10 / Math.abs(this.scaleX);
    this.setCircle(localDiameter / 2, (frameWidth - localDiameter) / 2, (frameWidth - localDiameter) / 2);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  tryConsumeHit(): boolean {
    const result = consumeSingleHit(this.hitAvailable);
    this.hitAvailable = result.active;
    return result.accepted;
  }

  updateLifetime(nowMs: number): void {
    if (this.active && nowMs >= this.expiresAt) this.destroy();
  }
}
