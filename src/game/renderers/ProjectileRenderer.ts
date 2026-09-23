import Phaser from 'phaser';
import { ASSET_KEYS } from '../../data/assets';
import type { Projectile } from '../entities/Projectile';

export class ProjectileRenderer {
  constructor(private readonly scene: Phaser.Scene) {}

  update(projectiles: Iterable<Projectile>): void {
    for (const projectile of projectiles) {
      if (!projectile.active || Math.random() > 0.34) continue;
      const dot = this.scene.add.image(projectile.x, projectile.y, ASSET_KEYS.SMOKE)
        .setDisplaySize(10, 10)
        .setAlpha(0.28)
        .setTint(0xd8c4ff)
        .setDepth(5);
      this.scene.tweens.add({
        targets: dot,
        alpha: 0,
        scale: 0.2,
        duration: 100,
        onComplete: () => dot.destroy(),
      });
    }
  }
}
