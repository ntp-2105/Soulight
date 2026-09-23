import Phaser from 'phaser';
import { ASSET_KEYS } from '../../data/assets';
import type { Vector2Like } from '../types';

export class EffectsSystem {
  constructor(private readonly scene: Phaser.Scene) {}

  muzzle(x: number, y: number, aim: Vector2Like, color: number): void {
    const flash = this.scene.add.image(x + aim.x * 34, y + aim.y * 34, ASSET_KEYS.MAGIC)
      .setDisplaySize(28, 28)
      .setTint(color)
      .setAlpha(0.9)
      .setDepth(30);
    this.scene.tweens.add({
      targets: flash,
      scale: 0.1,
      alpha: 0,
      duration: 80,
      onComplete: () => flash.destroy(),
    });
  }

  hit(x: number, y: number, color = 0xffffff): void {
    for (let index = 0; index < 5; index += 1) {
      const angle = (Math.PI * 2 * index) / 5 + Math.random() * 0.35;
      const spark = this.scene.add.image(x, y, ASSET_KEYS.SPARK)
        .setDisplaySize(13, 13)
        .setTint(color)
        .setAlpha(0.9)
        .setRotation(angle)
        .setDepth(30);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 26,
        y: y + Math.sin(angle) * 26,
        alpha: 0,
        duration: 150,
        ease: 'Quad.Out',
        onComplete: () => spark.destroy(),
      });
    }
  }

  swordArc(x: number, y: number, angle: number, range: number, arcDegrees: number, color: number): void {
    const graphics = this.scene.add.image(
      x + Math.cos(angle) * range * 0.42,
      y + Math.sin(angle) * range * 0.42,
      ASSET_KEYS.SLASH,
    ).setDisplaySize(range * 1.45, Math.max(56, arcDegrees * 0.62))
      .setTint(color)
      .setRotation(angle)
      .setAlpha(0.88)
      .setDepth(28);
    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      scale: 1.08,
      duration: 150,
      onComplete: () => graphics.destroy(),
    });
  }

  playerDamaged(): void {
    this.scene.cameras.main.shake(90, 0.0035);
  }

  enemyDefeated(x: number, y: number): void {
    this.hit(x, y, 0xff426e);
    const ring = this.scene.add.image(x, y, ASSET_KEYS.SMOKE)
      .setDisplaySize(34, 34)
      .setTint(0x9b7bca)
      .setDepth(29);
    this.scene.tweens.add({
      targets: ring,
      scale: 2.5,
      alpha: 0,
      duration: 220,
      onComplete: () => ring.destroy(),
    });
  }
}
